import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'

export type History = [number, number][]

export interface Tag {
    id: number | null
    name: string
    desc: string
    value: any  // number | string | null
    time_ms: number
    min: number | null
    max: number | null
    units: string | null
    multi: string[] | null
    dp: number
    age_ms: number
    history: History
    stringhistory: [number, string][]
    future: History
}

export interface Plan {
    period: number[]
    setpoint: number[]
}

export class Tag implements Tag {
    constructor() {
        this.id = null
        this.name = ""
        this.desc = ""
        this.value = null
        this.time_ms = 0
        this.min = null
        this.max = null
        this.units = null
        this.multi = null
        this.dp = 0
        this.age_ms = 0
        this.history = []
        this.stringhistory = []
        this.future = []
    }
}

@Injectable({
    providedIn: 'root'
})
export class TagSubject {
    private subjects: { [key: string]: BehaviorSubject<Tag> }
    private tags: { [key: string]: Tag }
    private tags_index: string[]

    constructor() {
        this.subjects = {}
        this.tags = {}
        this.tags_index = []
    }

    make_tag(src: any) {
        let tag = new Tag
        if (typeof src === 'string') {
            tag.name = src
            return tag
        }
        else {
            if (src.hasOwnProperty('id')) { tag.id = src.id }
            if (src.hasOwnProperty('name')) { tag.name = src.name }
            if (src.hasOwnProperty('desc')) { tag.desc = src.desc }
            if (src.hasOwnProperty('value')) { tag.value = src.value }
            if (src.hasOwnProperty('time_ms')) { tag.time_ms = src.time_ms }
            if (src.hasOwnProperty('min')) { tag.min = src.min }
            if (src.hasOwnProperty('max')) { tag.max = src.max }
            if (src.hasOwnProperty('units')) { tag.units = src.units }
            if (src.hasOwnProperty('multi')) { tag.multi = src.multi }
            if (src.hasOwnProperty('dp')) { tag.dp = src.dp }
            if (src.hasOwnProperty('age_us')) {
                if (src.age_us === null) {
                    tag.age_ms = 0
                }
                else {
                    tag.age_ms = src.age_us / 1000
                }
            }
        }
        return tag
    }

    subject(tagname: string) {
        if (!this.subjects.hasOwnProperty(tagname)) {
            this.tags[tagname] = this.make_tag(tagname)
            this.subjects[tagname] = new BehaviorSubject<Tag>(
                this.tags[tagname]
            )
        }
        this.subjects[tagname].next(this.tags[tagname])
        return this.subjects[tagname]
    }

    init(tag: Tag) { // bus.component initialises from websocket messages
        // console.log("Tag init", tag)
        this.tags[tag.name] = tag
        if (!this.subjects.hasOwnProperty(tag.name)) {
            this.subjects[tag.name] = new BehaviorSubject<Tag>(
                this.tags[tag.name]
            )
        }
        if (tag.id != null) {
            this.tags_index[tag.id] = tag.name
        }
        this.subjects[tag.name].next(this.tags[tag.name])
    }

    update(id: number, time_ms: number, value: any) {
        let tagname: string = this.tags_index[id]
        let tag: Tag = this.tags[tagname]
        tag.time_ms = time_ms
        tag.value = value
        if (typeof value === 'number') {
            tag.history.push([time_ms, value])
            while (tag.history[0][0] < time_ms - tag.age_ms) {
                tag.history.shift()
            }
        }
        else if (typeof value === 'string') {
            tag.stringhistory.push([time_ms, value])
            while (tag.stringhistory.length > 20) {
                tag.stringhistory.shift()
            }
        }
        else if (typeof value === 'object' && value != null) {
            if (value.hasOwnProperty('setpoint') && value.hasOwnProperty('period')) {
                const plan: Plan = value
                const time = Math.floor(time_ms) / 1000
                const start = Math.floor(time - time % 1800)
                let offset = plan.period[0]
                let last = offset - 1
                this.tags[tagname].future = []
                for (let i = 0; i < plan.setpoint.length; i++) {
                    const setpt = plan.setpoint[i]
                    const period = plan.period[i]
                    if (period < last) {
                        offset -= last
                    }
                    else {
                        last = period
                    }
                    this.tags[tagname].future.push([start + i * 1800, setpt])
                }
            }
            else {
                let hi = 5
            }
        }
        this.subjects[tagname].next(this.tags[tagname])
    }

    update_history(id: number, time_ms: number[], value: (number | string | null)[]) {
        // history it put into time order
        let tagname: string = this.tags_index[id]
        for (let index = 0; index < time_ms.length; index++) {
            let time_i = time_ms[index]
            let value_i = value[index]
            if (typeof value_i === 'number') {
                this.tags[tagname].history.push([time_i, value_i])
            }
        }
        this.tags[tagname].history.sort((a, b) => a[0] - b[0])
        this.subjects[tagname].next(this.tags[tagname])
    }

    reset() { }
}
