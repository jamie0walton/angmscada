import { Component, OnInit, OnDestroy } from '@angular/core'
import { ConfigSubject } from 'src/app/store/config'
import { Menu, MenuSubject } from 'src/app/store/menu'

type MenuItem = {
    name: string
    drop: boolean
    id: number
}

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: []
})
export class NavBarComponent implements OnInit, OnDestroy {
    subs: any = []
    title: string
    menu: Menu[]
    newmenu: MenuItem[][]
    on_page: number
    collapse: boolean
    showmodal: boolean
    connected: boolean
    reload: boolean = false
    mscada_link: string = ''

    constructor(
        private configstore: ConfigSubject,
        private menustore: MenuSubject
    ) {
        this.title = ''
        this.menu = []
        this.newmenu = []
        this.on_page = 0
        this.collapse = true
        this.showmodal = false
        this.connected = false
    }

    onClick(menuitem: number) {
        this.configstore.update({ page: menuitem })
        this.collapse = true
    }

    toggleNav() {
        this.collapse = !this.collapse
    }

    ngOnInit() {
        this.subs.push(
            this.configstore.subject.asObservable().subscribe(value => {
                this.on_page = value.page
                this.connected = value.connected
                this.reload = value.reload
                this.mscada_link = value.mscada_link
            }),
            this.menustore.subject.asObservable().subscribe(value => {
                let h = value.slice(0, 1)
                let l = value.slice(1)
                this.title = h[0].name
                this.menu = l
                this.newmenu = []
                let parents: { [key: string]: number } = {}
                for (let i = 0; i < value.length; i++) {
                    const e = value[i]
                    if (e.parent == null) {
                        this.newmenu.push([{
                            name: e.name,
                            drop: false,
                            id: e.id
                        }])
                    }
                    else {
                        if (!parents.hasOwnProperty(e.parent)) {
                            parents[e.parent] = this.newmenu.length
                            this.newmenu.push([{
                                name: e.parent,
                                drop: true,
                                id: 0
                            }])
                        }
                        this.newmenu[parents[e.parent]].push({
                            name: e.name,
                            drop: false,
                            id: e.id
                        })
                    }
                }
            })
        )
    }

    ngOnDestroy() {
        for (let i = 0; i < this.subs.length; i++) {
            this.subs[i].unsubscribe()
        }
    }
}
