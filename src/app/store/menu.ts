import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'

export interface Menu {
    id: number
    name: string
    parent: string | null
}

@Injectable({
    providedIn: 'root'
})
export class MenuSubject {
    subject: BehaviorSubject<Menu[]>
    private menu: Menu[]

    constructor() {
        this.menu = [{
            id: 0,
            name: "Loading",
            parent: null
        }]
        this.subject = new BehaviorSubject<Menu[]>(this.menu)
    }

    get() {
        return this.menu
    }

    load(menu: Menu[]) {
        this.menu = menu
        this.subject.next(this.menu)
    }

    reset() { }
}