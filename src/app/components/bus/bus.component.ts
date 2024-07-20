import { Component, OnInit, OnDestroy } from '@angular/core'
import { timer, Observable } from 'rxjs'
import { Config, ConfigSubject } from 'src/app/store/config'
import { TagSubject } from 'src/app/store/tag'
import { Page, PageSubject } from 'src/app/store/page'
import { Menu, MenuSubject } from 'src/app/store/menu'
import { SendFile, SendFileSubject } from 'src/app/store/sendfile'
import { Command, CommandSubject } from 'src/app/store/command' // OpCommand

const INT_TYPE = 1
const FLOAT_TYPE = 2
const STRING_TYPE = 3
const BYTES_TYPE = 4

const FUNCTION_TAGS = [
    '__bus__', '__files__', '__history__', '__opnotes__', '__alarms__'
]

@Component({
    selector: 'app-bus',
    template: ''
})
export class BusComponent implements OnInit, OnDestroy {
    subs: any = []
    source: Observable<number>
    ws: WebSocket | undefined
    wsIdle: number
    config: Config
    pending_rta: Command[] = []
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
        this.wsIdle = 0
        this.config = this.configstore.get()
        this.seen_tagnames = new Set()
    }

    sub_if_not_seen(tagname: string) {
        if (!this.seen_tagnames.has(tagname)) {
            this.sendCommand({
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
    }

    WSmessage(e: MessageEvent) {
        if (typeof e['data'] == 'string') {
            let msg: any = JSON.parse(e['data'])
            let type: any = msg['type']
            let data: any = msg['payload']
            if (type == 'tag') {  // json for dict and some lists
                this.tagstore.update(data.tagid, Math.trunc(data.time_us / 1000), data.value)
            }
            else if (type == 'tag_info') {
                this.tagstore.add_tag(data)
            }
            else if (type == 'pages') {
                this.reset_stores()
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
            else if (type == 'file') {
                this.sendfilestore.fromWs(data)
            }
        }
        else {
            // console.log(new Uint8Array(e['data'] as ArrayBuffer))
            let dview = new DataView(e['data'] as ArrayBuffer)
            let id = dview.getUint16(0)
            let type = dview.getUint16(2)
            let time_us = Number(dview.getBigUint64(4))
            let value: string | number | null = null
            let times_ms: number[] = []
            let values: number[] = []
            if (type == INT_TYPE) {
                value = Number(dview.getBigInt64(12))
                this.tagstore.update(id, Math.trunc(time_us / 1000), value)
            }
            else if (type == FLOAT_TYPE) {
                value = dview.getFloat64(12)
                this.tagstore.update(id, Math.trunc(time_us / 1000), value)
            }
            else if (type == STRING_TYPE) {
                let dec = new TextDecoder()
                value = dec.decode(new Uint8Array(e['data'].slice(12) as ArrayBuffer))
                this.tagstore.update(id, Math.trunc(time_us / 1000), value)
            }
            else if (type == BYTES_TYPE) {
                let _rta_id = dview.getUint16(12)
                id = dview.getUint16(14)
                type = dview.getUint16(16)
                if (id == 0 || type == 0) {return}
                if (type == INT_TYPE) {
                    for (let j = 18; j < dview.byteLength; j += 16) {
                        times_ms.push(Math.trunc(Number(dview.getBigUint64(j)) / 1000))
                        values.push(Number(dview.getBigInt64(j + 8)))
                    }
                }
                else if (type == FLOAT_TYPE) {
                    for (let j = 18; j < dview.byteLength; j += 16) {
                        times_ms.push(Math.trunc(Number(dview.getBigUint64(j)) / 1000))
                        values.push(Number(dview.getFloat64(j + 8)))
                    }
                }
                this.tagstore.update_history(id, times_ms, values)
            }
        }
    }

    initClient() {
        this.config = this.configstore.get()
    }

    makeWSConnection() {
        this.ws = new WebSocket(this.config.ws)
        this.ws.binaryType = 'arraybuffer'
        this.ws.onopen = () => {
            this.configstore.set_connected(true)
            FUNCTION_TAGS.forEach((element: string) => {
                this.sub_if_not_seen(element)
            })
            if(this.ws == null) {
                console.log('websocket is closed on opening?')
            }
        }
        this.ws.onmessage = (msg) => this.WSmessage(msg)
        this.ws.onerror = (e) => {
            console.log('WS error:', e)
            if (this.ws)
                this.ws.close()
        }
        this.ws.onclose = (msg) => {
            console.log('WS closed (note aiohttp has a 5 minute inactivity timeout):', msg)
            delete this.ws
            this.configstore.set_connected(false)
            this.configstore.set_reload(true)
        }
    }

    checkStatus() {
        if (this.pending_rta.length > 0) {
            let still_pending: Command[] = []
            for (let i = 0; i < this.pending_rta.length; i++) {
                const command = this.pending_rta[i]
                if (command.tagname in this.tagstore.tag_by_name) {
                    this.sendCommand(command)
                }
                else {
                    still_pending.push(command)
                }
            }
            this.pending_rta = still_pending
        }
        if (this.ws == null || this.ws.readyState != 1) {
            this.wsIdle += 1
            if (this.wsIdle == 60) {
                this.wsIdle = 0
                this.makeWSConnection()
            }
        } else {
            this.wsIdle = 0
        }
    }

    sendCommand(cmd: Command) { // } | OpCommand) {
        if (cmd != null && this.ws != null) {
            if (cmd.value != null && cmd.value.hasOwnProperty('File')) {
                cmd.value._file_name = cmd.value.File.name
                this.ws.send(JSON.stringify(cmd))
                this.ws.send(cmd.value.File)
            }
            else {
                this.ws.send(JSON.stringify(cmd))
            }
        }
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

    reset_stores() {
        this.configstore.reset()
        this.tagstore.reset()
        this.pagestore.reset()
        this.menustore.reset()
        this.commandstore.reset()
    }

    ngOnInit() {
        this.initClient()
        this.makeWSConnection()
        this.subs.push(
            this.source.subscribe(() => {
                this.checkStatus()
            }),
            this.commandstore.subject.asObservable().subscribe(cmd => {
                this.sendCommand(cmd)
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