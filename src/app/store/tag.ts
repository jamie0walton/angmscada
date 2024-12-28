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
    future_ms: number
    new_history: boolean
    history: History
    stringhistory: StringHistory
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
        this.future_ms = 0
        this.new_history = false
        this.history = {
            times_ms: [],
            values: []
        }
        this.stringhistory = {
            times_ms: [],
            values: []
        }
    }
}

interface OpNote {
    id: number
    date_ms: number
    by: string
    site: string
    note: string
    abnormal: number
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
        console.log("add_tag", tag)
    }

    update_tag(tag: Tag, time_ms: number, value: any) {
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
        tag.new_history = false
    }

    update_opnotes(tag: Tag, value: any) {
        // TODO depend on hard coded tags, not sure if this is right.
        if (!Array.isArray(tag.value) || !value.hasOwnProperty('id')) {
            tag.value = []
        }
        let opnotes: OpNote[] = tag.value
        if (value.hasOwnProperty('id')) {
            const index = opnotes.findIndex((obj) => obj.id === value.id);
            if (value.hasOwnProperty('date_ms')) {  // assume has all properties
                if (index === -1) {  // not present, insert in descending order
                    const insertIndex = opnotes.findIndex((obj) => obj.date_ms < value.date_ms);
                    if (insertIndex !== -1) {
                        opnotes.splice(insertIndex, 0, value)
                    } else {
                        opnotes.push(value);
                    }
                } else {  // or replace
                    opnotes[index] = value;
                    // After replacing, we need to ensure the array is still in descending order
                    opnotes.sort((a, b) => b.date_ms - a.date_ms)
                }
            } else {  // assume only has .id
                if (index !== -1) {  // if present, delete
                    opnotes.splice(index, 1);
                }
            }
        }
        else if (value.hasOwnProperty('data')) {
            let startidx: {[key: number]: number} = {}
            for (let i = 0; i < opnotes.length; i++) {
                startidx[opnotes[i].id] = i
            }
            for (let i = 0; i < value.data.length; i++) {
                const rec = value.data[i]
                let update = {
                    id: rec[0],
                    date_ms: rec[1],
                    site: rec[2],
                    by: rec[3],
                    note: rec[4],
                    abnormal: rec[5]
                }
                if (rec[0] in startidx) {
                    opnotes[startidx[rec[0]]] = update
                }
                else {
                    opnotes.push(update)
                }
            }
            opnotes.sort((a, b) => b.date_ms - a.date_ms)
        }
    }

    update_alarms(tag: Tag, time_ms: number, value: any) {

    }

    update_files(tag: Tag, time_ms: number, value: any) {

    }

    update(id: number, time_ms: number, value: any) {
        let tag: Tag = this.tag_by_id[id]
        switch (tag.name) {
            case '__opnotes__':
                this.update_opnotes(tag, value)
                break
            default:
                this.update_tag(tag, time_ms, value)
        }
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

    set_age_ms(id: number, age_ms: number, future_ms: number=0) {
        let tag: Tag = this.tag_by_id[id]
        let change = false
        if (age_ms > tag.age_ms) {
            tag.age_ms = age_ms
            change = true
        }
        if (future_ms > tag.future_ms) {
            tag.future_ms = future_ms
            change = true
        }
        if (!change){return}
        let now = Date.now()
        let start_ms = now - tag.age_ms
        let end_ms = now + tag.future_ms
        this.commandstore.command({
            type: 'rta',
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
