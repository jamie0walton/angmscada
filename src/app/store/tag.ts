import { Injectable, inject } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { CommandSubject } from './command'
import { merge_time_series } from '../shared/time_series'

export type History = {times_ms: number[], values: number[]}
export type StringHistory = {times_ms: number[], values: string[]}

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
    formatext: string[]
    age_ms: number
    new_history: boolean
    history: History
    stringhistory: StringHistory
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
        this.formatext = []
        this.age_ms = 0
        this.new_history = false
        this.history = {
            times_ms: [],
            values: []
        }
        this.stringhistory = {
            times_ms: [],
            values: []
        }
        this.future = {
            times_ms: [],
            values: []
        }
    }
}

@Injectable({
    providedIn: 'root'
})
export class TagSubject {
    // Tag subject, re-present bus tag values as Behaviour subject.
    private subjects: { [key: string]: BehaviorSubject<Tag> }
    tag_by_name: { [key: string]: Tag }
    tag_by_id: { [id: number]: Tag }
    commandstore = inject(CommandSubject)

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
            tag.format = src.type;  // default, may be overwritten below
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
            let f: string[] = src.format.split(' ')
            tag.format = f[0]  // user override, probably time and date
            tag.formatext = f.slice(1)
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
            if (tag.history.times_ms.length == 0 || time_ms > tag.history.times_ms[tag.history.times_ms.length - 1]) {
                tag.history.times_ms.push(time_ms)
                tag.history.values.push(value)
            }
        }
        else if (typeof value === 'string') {
            tag.stringhistory.times_ms.push(time_ms)
            tag.stringhistory.values.push(value)
            while (tag.stringhistory.times_ms.length > 20) {
                tag.stringhistory.times_ms.shift()
                tag.stringhistory.values.shift()
            }
        }
        else if (typeof value === 'object' && value != null) {
            if (value.hasOwnProperty('setpoint') && value.hasOwnProperty('period')) {
                // TODO     tag.future.push([start + i * 1800, setpt])
            }
        }
        tag.new_history = false
        this.subjects[tag.name].next(tag)
    }

    /**
     * Assumes both history and time_ms are strictly increasing. Merge.
     */
    update_history(id: number, times_ms: number[], values: number[]) {
        // history it put into time order
        let tag: Tag = this.tag_by_id[id]
        tag.history = merge_time_series(tag.history, {times_ms: times_ms, values: values})
        tag.new_history = true
        this.subjects[tag.name].next(tag)
    }

    set_age_ms(id: number, age_ms: number) {
        let tag: Tag = this.tag_by_id[id]
        if (age_ms < tag.age_ms) {return}
        tag.age_ms = age_ms
        let now = Date.now()
        let start_ms = now - age_ms
        let end_ms = now
        this.commandstore.command({
            type: 'rqs',
            tagname: '__history__',
            value: {
                tagname: tag.name,
                start_ms: start_ms,
                end_ms: end_ms
            }
        })
        console.log('requested ' + tag.name + ' from ' + new Date(start_ms) + ' to ' + new Date(end_ms))
    }

    reset() { }
}
