import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'

export type History = [number, number][]

export interface Tag {
    id: number | null
    name: string
    desc: string
    type: string | null
    value: any  // number | string | null
    time_ms: number
    min: number | null
    max: number | null
    units: string | null
    multi: string[] | null
    dp: number
    format: string | null
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
        this.type = null
        this.value = null
        this.time_ms = 0
        this.min = null
        this.max = null
        this.units = null
        this.multi = null
        this.dp = 0
        this.format = null
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
    // Tag subject, re-present bus tag values as Behaviour subject.
    private subjects: { [key: string]: BehaviorSubject<Tag> }
    private tag_by_name: { [key: string]: Tag }
    private tag_by_id: { [id: number]: Tag }

    constructor() {
        this.subjects = {}
        this.tag_by_name = {}
        this.tag_by_id = {}
    }

    subject(tagname: string) {
        // Provide subject to observers. Assume observer requested tagname
        // will exist even if it doesn't yet.
        if (!this.subjects.hasOwnProperty(tagname)) {
            let tag = new Tag
            tag.name = tagname
            this.subjects[tagname] = new BehaviorSubject<Tag>(tag)
            this.tag_by_name[tagname] = tag
        }
        this.subjects[tagname].next(this.tag_by_name[tagname])
        return this.subjects[tagname]
    }

    add_tag(src: any) {
        let tag = new Tag
        if (src.hasOwnProperty('id')) { tag.id = src.id as number } else {return}
        if (src.hasOwnProperty('name')) { tag.name = src.name }
        if (src.hasOwnProperty('desc')) { tag.desc = src.desc }
        if (src.hasOwnProperty('type')) {
            tag.type = src.type;
            tag.format = src.type;  // default to type
        }
        if (src.hasOwnProperty('value')) { tag.value = src.value }
        if (src.hasOwnProperty('time_ms')) { tag.time_ms = src.time_ms }
        if (src.hasOwnProperty('min')) { tag.min = src.min }
        if (src.hasOwnProperty('max')) { tag.max = src.max }
        if (src.hasOwnProperty('units')) { tag.units = src.units }
        if (src.hasOwnProperty('multi')) {
            tag.multi = src.multi;
            tag.format = 'multi';  // override int to multi
        }
        if (src.hasOwnProperty('dp')) { tag.dp = src.dp }
        if (src.hasOwnProperty('age_us')) { tag.age_ms = src.age_us / 1000 }
        if (src.hasOwnProperty('format')) {
            tag.format = src.format;  // user override, probably time and date
        }
        this.tag_by_id[tag.id] = tag
        this.tag_by_name[tag.name] = tag
        if (!this.subjects.hasOwnProperty(tag.name)) {
            this.subjects[tag.name] = new BehaviorSubject<Tag>(tag)
        }
        this.subjects[tag.name].next(this.tag_by_name[tag.name])
        console.log(tag)
    }

    update(id: number, time_ms: number, value: any) {
        let tag: Tag = this.tag_by_id[id]
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
                tag.future = []
                for (let i = 0; i < plan.setpoint.length; i++) {
                    const setpt = plan.setpoint[i]
                    const period = plan.period[i]
                    if (period < last) {
                        offset -= last
                    }
                    else {
                        last = period
                    }
                    tag.future.push([start + i * 1800, setpt])
                }
            }
            else {
                let hi = 5
            }
        }
        this.subjects[tag.name].next(tag)
    }

    update_history(id: number, time_ms: number[], value: (number | string | null)[]) {
        // history it put into time order
        let tag: Tag = this.tag_by_id[id]
        for (let index = 0; index < time_ms.length; index++) {
            let time_i = time_ms[index]
            let value_i = value[index]
            if (typeof value_i === 'number') {
                tag.history.push([time_i, value_i])
            }
        }
        tag.history.sort((a, b) => a[0] - b[0])
        this.subjects[tag.name].next(tag)
    }

    reset() { }
}
