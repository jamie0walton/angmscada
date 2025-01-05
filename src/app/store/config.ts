import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { environment } from 'src/environments/environment'

export interface Config {
    ws: string
    buildDate: string
    update: number
    page: number
    connected: boolean
    reload: boolean
    site?: string
    yaml?: string
    navbar_color: string
    mscada_link: string
    people: object
    sites: object
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
            navbar_color: 'var(--bs-primary)',
            mscada_link: 'https://github.com/jamie0walton/pymscada',
            people: {},
            sites: {}
        }
        this.subject = new BehaviorSubject<Config>(this.config)
        this.saved = {}
    }

    get() {
        return this.config
    }

    set_ws(ws: string) {
        this.config.ws = ws
        this.subject.next(this.config)
    }

    set_connected(update: boolean) {
        this.config.connected = update
        this.subject.next(this.config)
    }

    set_reload(update: boolean) {
        this.config.reload = update
        this.subject.next(this.config)
    }

    set_update(update: number) {
        this.config.update = update
        this.subject.next(this.config)
    }

    set_page(page: number) {
        this.config.page = page
        this.subject.next(this.config)
    }

    set_site(site: string) {
        this.config.site = site
    }

    set_yaml(yaml: string) {
        this.config.yaml = yaml
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
        if (data.hasOwnProperty('navbar_color')) {
            this.config.navbar_color = data.navbar_color
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
