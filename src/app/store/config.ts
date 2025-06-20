import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { environment } from 'src/environments/environment'
import { name2rgb } from '../shared/functions'

export interface Config {
    ws: string
    buildDate: string
    update: number
    page: number
    connected: boolean
    reload: boolean
    site?: string
    yaml?: string
    mscada_link: string
    people: {
        name: string
        email?: string
        phone?: string
    }[]
    sites: {
        name: string
    }[]
}

@Injectable({
    providedIn: 'root'
})
export class ConfigSubject {
    subject: BehaviorSubject<Config>
    private config: Config
    private saved: any

    constructor() {
        this.config = {
            ws: environment.ws,
            buildDate: environment.buildDate,
            update: 5000,
            page: 0,
            connected: false,
            reload: false,
            mscada_link: 'https://github.com/jamie0walton/pymscada',
            people: [],
            sites: []
        }
        this.subject = new BehaviorSubject<Config>(this.config)
        this.saved = {}
    }

    get() {
        return this.config
    }

    update(updates: Partial<Config>) {
        Object.assign(this.config, updates)
        this.subject.next(this.config)
    }

    set_saved(name: string, data: any) {
        // Long term store for components that have a large calculation overhead
        this.saved[name] = data
    }

    get_saved(name: string): any {
        // Long term recovery for components that have stored a large calc value
        return this.saved[name] || null
    }

    set(data: any) {
        if (data.hasOwnProperty('primary_color')) {
            document.documentElement.style.setProperty('--ms-primary', name2rgb(data.primary_color))
        }
        if (data.hasOwnProperty('secondary_color')) {
            document.documentElement.style.setProperty('--ms-secondary', name2rgb(data.secondary_color))
        }
        if (data.hasOwnProperty('mscada_link')) {
            this.config.mscada_link = data.mscada_link
        }
        if (data.hasOwnProperty('people')) {
            this.config.people = data.people
        }
        if (data.hasOwnProperty('sites')) {
            this.config.sites = data.sites
        }
        this.subject.next(this.config)
    }

    reset() { }
}
