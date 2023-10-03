import { Component, OnInit, OnDestroy } from '@angular/core'
import { timer, Observable } from 'rxjs'
import { Config, ConfigSubject } from 'src/app/store/config'
import { Tag, TagSubject } from 'src/app/store/tag'
import { Page, PageSubject } from 'src/app/store/page'
import { Menu, MenuSubject } from 'src/app/store/menu'
import { SendFile, SendFileSubject } from 'src/app/store/sendfile'
import { Command, CommandSubject } from 'src/app/store/command' // OpCommand

const INT_TYPE = 1
const FLOAT_TYPE = 2
const STRING_TYPE = 3
const BYTES_TYPE = 4
const INT_ARRAY_TYPE = 5  // TODO delete
const FLOAT_ARRAY_TYPE = 5  // TODO delete

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
    pending_rqs: Command[] = []

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
    }

    sub_tags(page: Page) {
        for (let i = 0; i < page.items.length; i++) {
            const item = page.items[i]
            if (item.tagname.length > 0) {
                this.sendCommand({
                    type: 'sub',
                    tagname: item.tagname,
                    value: null
                })
            }
            else if (item.type == 'uplot') {
                this.sendCommand({
                    type: 'sub',
                    tagname: item.config.ms.tagname,
                    value: null
                })
                for (let i = 0; i < item.config.series.length; i++) {
                    const element = item.config.series[i]
                    this.pending_rqs.push({
                        type: 'rqs',
                        tagname: item.config.ms.tagname,
                        value: {
                            tagname: element.tagname,
                            range: item.config.ms.age
                        }
                    })
                }
                for (let i = 0; i < item.config.series.length; i++) {
                    const element = item.config.series[i]
                    this.sendCommand({
                        type: 'sub',
                        tagname: element.tagname,
                        value: null
                    })
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
            let times: number[] = []
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
                id = dview.getUint16(12)
                if (id == 0) {return}
                let tag = this.tagstore.tag_by_id[id]
                if (tag.type == 'float') {
                    for (let j = 14; j < dview.byteLength; j += 16) {
                        times.push(Number(dview.getBigUint64(j)))
                        values.push(Number(dview.getFloat64(j + 8)))
                    }
                }
                else if (tag.type == 'int') {
                    for (let j = 14; j < dview.byteLength; j += 16) {
                        times.push(Number(dview.getBigUint64(j)))
                        values.push(Number(dview.getBigInt64(j + 8)))
                    }
                }
                this.tagstore.update_history(id, times, values)
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
            if(this.ws == null) {
                console.log('websocket is closed on opening?')
            }
        }
        this.ws.onmessage = (msg) => this.WSmessage(msg)
        this.ws.onerror = () => {
            if (this.ws)
                this.ws.close()
        }
        this.ws.onclose = () => {
            delete this.ws
            this.configstore.set_connected(false)
            this.configstore.set_reload(true)
        }
    }

    checkStatus() {
        if (this.pending_rqs.length > 0) {
            let still_pending: Command[] = []
            for (let i = 0; i < this.pending_rqs.length; i++) {
                const command = this.pending_rqs[i]
                if (command.tagname in this.tagstore.tag_by_name) {
                    this.sendCommand(command)
                }
                else {
                    still_pending.push(command)
                }
            }
            this.pending_rqs = still_pending
        }
        if (this.ws == null || this.ws.readyState != 1) {
            this.wsIdle += 1
            if (this.wsIdle == 60) {
                this.wsIdle = 0
                this.makeWSConnection()
            }
        } else {
            this.wsIdle = 0
            // if (this.gethist > 1) {
            //     this.gethist -= 1
            // }
            // if (this.gethist == 1) {
            //     this.gethist = 0
            //     this.ws.send(JSON.stringify({
            //         type: 'get_pages'
            //     }))
            // }
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