import { Component, OnInit, OnDestroy } from '@angular/core'
import { timer, Observable } from 'rxjs'
import { Config, ConfigSubject } from 'src/app/store/config'
import { TagSubject } from 'src/app/store/tag'
import { Page, PageSubject } from 'src/app/store/page'
import { Menu, MenuSubject } from 'src/app/store/menu'
import { SendFile, SendFileSubject } from 'src/app/store/sendfile'
import { Command, CommandSubject } from 'src/app/store/command'

// These type codes are used by pymscada wwwserver for sending data
const INT_TYPE = 1
const FLOAT_TYPE = 2
const STRING_TYPE = 3
const BYTES_TYPE = 4

const SYS_TAGS = [
    '__history__',  // required for tagstore to get history
    // '__bus__',  // 
    // '__files__',  // 
    // '__opnotes__',  // 
    // '__alarms__',  // 
]

@Component({
    selector: 'app-bus',
    template: ''
})
export class BusComponent implements OnInit, OnDestroy {
    subs: any = []
    source: Observable<number>
    ws: WebSocket | null
    wsIdle: number
    config: Config
    pending_cmd: Command[] = []
    seen_tagnames: Set<string>

    constructor(
        private configstore: ConfigSubject,
        private tagstore: TagSubject,
        private pagestore: PageSubject,
        private menustore: MenuSubject,
        private sendfilestore: SendFileSubject,
        private commandstore: CommandSubject
    ) {
        this.source = timer(500, 1000)
        this.ws = null
        this.wsIdle = 0
        this.config = this.configstore.get()
        this.seen_tagnames = new Set()
    }

    sub_if_not_seen(tagname: string) {
        if (!this.seen_tagnames.has(tagname)) {
            this.pending_cmd.push({
                type: 'sub',
                tagname: tagname,
                value: null
            })
            this.seen_tagnames.add(tagname)
        }
    }

    sub_tags(page: Page) {
        for (let i = 0; i < page.items.length; i++) {
            const item = page.items[i]
            if (item.tagname.length > 0) {
                this.sub_if_not_seen(item.tagname)
            }
            else if (item.type == 'uplot') {
                for (let i = 0; i < item.config.series.length; i++) {
                    const element = item.config.series[i]
                    this.sub_if_not_seen(element.tagname)
                }
            }
        }
        this.processCommands()
    }

    StringMessage(message: string) {
        const msg: any = JSON.parse(message)
        const type: any = msg['type']
        const data: any = msg['payload']
        switch (type) {
            case 'tag':  // json for dict and some lists
                this.tagstore.update(data.tagid, Math.trunc(data.time_us / 1000), data.value)
                break
            case 'tag_info':
                this.tagstore.add_tag(data)
                break
            case 'pages':
                this.init_pages(data)
                break
            case 'file':
                this.sendfilestore.fromWs(data)
                break
            default:
                console.warn('StringMessage unknown type', type)
        }
    }

    BinaryMessage(msg: any) {
        const dview = new DataView(msg as ArrayBuffer)
        const id = dview.getUint16(0)
        const type = dview.getUint16(2)
        const time_us = Number(dview.getBigUint64(4))
        let value: string | number | null = null
        switch (type) {
            case INT_TYPE:
                value = Number(dview.getBigInt64(12))
                this.tagstore.update(id, Math.trunc(time_us / 1000), value)
                break
            case FLOAT_TYPE:
                value = dview.getFloat64(12)
                this.tagstore.update(id, Math.trunc(time_us / 1000), value)
                break
            case STRING_TYPE:
                let dec = new TextDecoder()
                value = dec.decode(new Uint8Array(msg.slice(12) as ArrayBuffer))
                this.tagstore.update(id, Math.trunc(time_us / 1000), value)
                break
            case BYTES_TYPE:
                const bytes_id = dview.getUint16(14)
                const bytes_type = dview.getUint16(16)
                let times_ms: number[] = []
                let values: number[] = []
                if (bytes_id == 0 || bytes_type == 0) {return}
                if (bytes_type == INT_TYPE) {
                    for (let j = 18; j < dview.byteLength; j += 16) {
                        times_ms.push(Math.trunc(Number(dview.getBigUint64(j)) / 1000))
                        values.push(Number(dview.getBigInt64(j + 8)))
                    }
                }
                else if (bytes_type == FLOAT_TYPE) {
                    for (let j = 18; j < dview.byteLength; j += 16) {
                        times_ms.push(Math.trunc(Number(dview.getBigUint64(j)) / 1000))
                        values.push(Number(dview.getFloat64(j + 8)))
                    }
                }
                this.tagstore.update_history(bytes_id, times_ms, values)
                break
            default:
                console.warn('BinaryMessage unknown type', type)
        }
    }

    makeWSConnection() {
        this.ws = new WebSocket(this.config.ws)
        this.ws.binaryType = 'arraybuffer'
        this.ws.onopen = () => {
            console.log('makeWSConnection success', this.config.ws, this.ws?.readyState)
            this.configstore.set_connected(true)
            SYS_TAGS.forEach((element: string) => {
                this.sub_if_not_seen(element)
            })
        }
        this.ws.onmessage = (msg) => {
            if (typeof msg['data'] == 'string') {
                this.StringMessage(msg['data'])
            }
            else {
                this.BinaryMessage(msg['data'])
            }
        }
        this.ws.onerror = (e) => {
            console.error('makeWSConnection error', e)
            if (this.ws)
                this.ws.close()
        }
        this.ws.onclose = (msg) => {
            console.log('WS closed (note aiohttp has a 5 minute inactivity timeout):', msg)
            this.ws = null  // didn't like delete
            this.configstore.set_connected(false)
            this.configstore.set_reload(true)
        }
    }

    tick() {
        if (this.ws == null || this.ws.readyState != WebSocket.OPEN) {
            this.wsIdle += 1
            if (this.wsIdle == 60) {
                this.wsIdle = 0
                this.pending_cmd = []
                this.makeWSConnection()
            }
        } else {
            this.wsIdle = 0
            if (this.pending_cmd) {
                this.processCommands()
            }
        }
    }

    processCommands() { // } | OpCommand) {
        while(this.pending_cmd.length && this.ws?.readyState == WebSocket.OPEN) {
            this.ws.send(JSON.stringify(this.pending_cmd.shift()))
        }
// TODO change the protocol for this so that its one message
//        if (cmd.value != null && cmd.value.hasOwnProperty('File')) {
//            cmd.value._file_name = cmd.value.File.name
//            this.ws.send(JSON.stringify(cmd))
//            this.ws.send(cmd.value.File)
//        }
    }

    sendFile(sendfiles: SendFile[]) {
        for (let i = 0; i < sendfiles.length; i++) {
            const sendfile = sendfiles[i];
            if (sendfile != null && sendfile.action == 'upload' && this.ws != null) {
                this.ws.send(JSON.stringify({
                    type: 'file',
                    action: sendfile.action,
                    filename: sendfile.file.name
                }))
                this.ws.send(sendfile.file)
                this.sendfilestore.update(i, 'uploaded')
            }
        }
    }

    init_pages(data: any) {
        this.configstore.reset()
        this.tagstore.reset()
        this.pagestore.reset()
        this.menustore.reset()
        this.commandstore.reset()
        let pages: Page[] = []
        let menu: Menu[] = []
        for (let page_no = 0; page_no < data.length; page_no++) {
            const element = data[page_no]
            let page = this.pagestore.make_page(element, page_no)
            pages.push(page)
            menu.push({
                id: page.id,
                name: page.name,
                parent: page.parent
            })
            this.sub_tags(page)
        }
        this.pagestore.load(pages)
        this.menustore.load(menu)
        this.configstore.set_page(0)
    }

    ngOnInit() {
        this.config = this.configstore.get()
        this.makeWSConnection()
        this.subs.push(
            this.source.subscribe(() => {
                this.tick()
            }),
            this.commandstore.subject.asObservable().subscribe(cmd => {
                if (cmd != null) {
                    this.pending_cmd.push(cmd)
                    this.processCommands()
                }
            }),
            this.sendfilestore.subject.asObservable().subscribe(sendfile => {
                this.sendFile(sendfile)
            })
        )
    }

    ngOnDestroy() {
        for (let i = 0; i < this.subs.length; i++) {
            this.subs[i].unsubscribe()
        }
    }
}