import { Component, OnInit, OnDestroy } from '@angular/core'
import { ConfigSubject } from 'src/app/store/config'
import { Page, PageSubject } from 'src/app/store/page'

@Component({
    selector: 'app-pages',
    templateUrl: './pages.component.html',
    styleUrls: []
})
export class PagesComponent implements OnInit, OnDestroy {
    subs: any = []
    pages: Page[]
    selected: number

    constructor(
        private configstore: ConfigSubject,
        private pagestore: PageSubject
    ) {
        this.pages = []
        this.selected = 0
    }

    getClass(element: string) {
        switch (element) {
            case 'value':
            case 'setpoint':
                return "col-md-6 col-xl-4 col-xxl-3 pe-5"  //  border-bottom rounded-3"
            default:
                return "col-12"
        }
    }

    ngOnInit() {
        this.subs.push(
            this.configstore.subject.asObservable().subscribe(value => {
                if (value == null || value.page == null) return
                this.selected = value.page
            }),
            this.pagestore.subject.asObservable().subscribe(value => {
                if (value == null) return
                this.pages = value
            })
        )
    }

    ngOnDestroy() {
        for (let i = 0; i < this.subs.length; i++) {
            this.subs[i].unsubscribe()
        }
    }
}
