import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'

export interface Page_Item {
    type: string
    desc: string
    tagname: string
    config: any
    style?: string[]
    colors?: string[]
    trend?: string
    sites?: string[]
    by?: string[]
}

export interface Page {
    id: number
    name: string
    parent: string | null
    items: Page_Item[]
}

@Injectable({
    providedIn: 'root'
})
export class PageSubject {
    subject: BehaviorSubject<Page[]>
    private pages: Page[]

    constructor() {
        this.pages = [{
            id: 0,
            name: "Loading",
            parent: null,
            items: [{
                type: "h3",
                desc: "Loading",
                tagname: "",
                config: null
            }]
        }]
        this.subject = new BehaviorSubject<Page[]>(this.pages)
    }

    private make_item(src: any) {
        let item: Page_Item = {
            type: "",
            desc: "",
            tagname: "",
            config: null
        }
        item.config = src
        if (src.hasOwnProperty('type')) {
            item.type = src.type
            delete item.config.type
        }
        if (src.hasOwnProperty('desc')) {
            item.desc = src.desc
            delete item.config.desc
        }
        if (src.hasOwnProperty('tagname')) {
            item.tagname = src.tagname
            delete item.config.tagname
        }

        if (src.hasOwnProperty('style')) { item.style = src.style }
        if (src.hasOwnProperty('colors')) { item.colors = src.colors }
        if (src.hasOwnProperty('trend')) { item.trend = src.trend }
        if (src.hasOwnProperty('sites')) { item.sites = src.sites }
        if (src.hasOwnProperty('by')) { item.by = src.by }
        return item
    }

    make_page(src: any, page_no: number) {
        let page: Page = {
            id: page_no,
            name: "-",
            parent: null,
            items: []
        }
        if (src.hasOwnProperty('id')) {
            page.id = src.id
        }
        if (src.hasOwnProperty('name')) {
            page.name = src.name
        }
        if (src.hasOwnProperty('parent')) {
            page.parent = src.parent
        }
        if (src.hasOwnProperty('items')) {
            for (let index = 0; index < src.items.length; index++) {
                page.items.push(this.make_item(src.items[index]))
            }
        }
        return page
    }

    get() {
        return this.pages
    }

    load(pages: Page[]) {
        this.pages = pages
        this.subject.next(this.pages)
    }

    reset() { }
}