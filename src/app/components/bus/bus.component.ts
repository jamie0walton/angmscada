import { Component, OnInit, OnDestroy } from '@angular/core'
import { timer, Observable } from 'rxjs'
import { Config, ConfigSubject } from 'src/app/store/config'
import { Tag, TagSubject } from 'src/app/store/tag'
import { Page, PageSubject } from 'src/app/store/page'
import { Menu, MenuSubject } from 'src/app/store/menu'
import { SendFile, SendFileSubject } from 'src/app/store/sendfile'
import { Command, OpCommand, CommandSubject } from 'src/app/store/command'

const INT_TYPE = 1
const FLOAT_TYPE = 2
const STRING_TYPE = 3
const INT_ARRAY_TYPE = 4
const FLOAT_ARRAY_TYPE = 5

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

    constructor(
        private configstore: ConfigSubject,
        private tagstore: TagSubject,
        private pagestore: PageSubject,
        private menustore: MenuSubject,
        private sendfilestore: SendFileSubject,
        private commandstore: CommandSubject
    ) {
        this.source = timer(0, 1000)
        this.wsIdle = 0
        this.config = this.configstore.get()
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
                    for (let i = 0; i < page.items.length; i++) {
                        const item = page.items[i]
                        if (item.tagname.length > 0) {
                            this.sendCommand({
                                type: 'sub',
                                tagname: item.tagname,
                                value: null
                            })
                        }
                    }
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
            let times = []
            let values = []
            let index = 4
            while (index + 12 <= dview.byteLength) {
                let time_sec = dview.getUint32(index)
                let time_us = dview.getUint32(index + 4)
                let value = null
                switch (type) {
                    case INT_TYPE:
                        value = dview.getInt32(index + 8)
                        index += 12
                        break
                    case FLOAT_TYPE:
                        value = dview.getFloat32(index + 8)
                        index += 12
                        break
                    case STRING_TYPE:
                        let dec = new TextDecoder()
                        value = dec.decode(new Uint8Array(e['data'].slice(index + 8) as ArrayBuffer))
                        index += 8 + value.length
                        break
                    case INT_ARRAY_TYPE:
                        value = dview.getInt32(index + 8)
                        index += 12
                        break
                    case FLOAT_ARRAY_TYPE:
                        value = dview.getFloat32(index + 8)
                        index += 12
                        break
                }
                times.push(time_sec * 1000 + Math.trunc(time_us / 1000))
                values.push(value)
            }
            switch (type) {
                case INT_TYPE:
                case FLOAT_TYPE:
                case STRING_TYPE:
                    this.tagstore.update(id, times[0], values[0])
                    break
                case INT_ARRAY_TYPE:
                case FLOAT_ARRAY_TYPE:
                    this.tagstore.update_history(id, times, values)
                    break
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

    sendCommand(cmd: Command | OpCommand) {
        if (cmd != null && this.ws != null) {
            this.ws.send(JSON.stringify(cmd))
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