import { Injectable, inject } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { TagSubject } from 'src/app/store/tag'
import { CommandSubject } from './command'

export interface Alarm {
    id: number
    date_ms: number
    tag_alm: string
    kind: number
    desc: string
    in_alm: boolean
}

@Injectable({
    providedIn: 'root'
})
export class AlarmSubject {
    subject: BehaviorSubject<Alarm[]>
    private alarms: Alarm[]
    private tagstore: TagSubject
    private commandstore: CommandSubject
    age_d: number = 2
    private requested_date: number | undefined = undefined

    constructor() {
        this.alarms = []
        this.subject = new BehaviorSubject<Alarm[]>(this.alarms)
        this.tagstore = inject(TagSubject)
        this.commandstore = inject(CommandSubject)
        this.tagstore.subject('__alarms__').subscribe(tag => {
            this.update_alarms(tag.value)
        })
    }

    update_alarms(tag_value: any) {
        if (tag_value?.hasOwnProperty('id')) {
            const index = this.alarms.findIndex((obj) => obj.id === tag_value.id);
            if (tag_value.hasOwnProperty('date_ms')) {
                let alarm: Alarm = {
                    id: tag_value.id,
                    date_ms: tag_value.date_ms,
                    tag_alm: tag_value.tag_alm,
                    kind: tag_value.kind,
                    desc: tag_value.desc,
                    in_alm: tag_value.in_alm
                }
                if (index === -1) {  // not present, insert in descending order
                    const insertIndex = this.alarms.findIndex((obj) => obj.date_ms < alarm.date_ms);
                    if (insertIndex !== -1) {
                        this.alarms.splice(insertIndex, 0, alarm)
                    } else {
                        this.alarms.push(alarm);
                    }
                } else {  // or replace
                    this.alarms[index] = alarm;
                    this.alarms.sort((a, b) => b.date_ms - a.date_ms)
                }
            }
        }
        else if (tag_value?.hasOwnProperty('data') && Array.isArray(tag_value.data)) {
            let startidx: {[key: number]: number} = {}
            for (let i = 0; i < this.alarms.length; i++) {
                startidx[this.alarms[i].id] = i
            }
            for (let i = 0; i < tag_value.data.length; i++) {
                const rec = tag_value.data[i]
                let update = {
                    id: rec[0],
                    date_ms: rec[1],
                    tag_alm: rec[2],
                    kind: rec[3],
                    desc: rec[4],
                    in_alm: rec[5]
                }
                if (rec[0] in startidx) {
                    this.alarms[startidx[rec[0]]] = update
                }
                else {
                    this.alarms.push(update)
                }
            }
            this.alarms.sort((a, b) => b.date_ms - a.date_ms)
        }
        else {
            this.alarms = []
        }
        this.subject.next(this.alarms)
    }

    set_age_d(age_d: number) {
        this.age_d = age_d
        this.request_history(Date.now() - this.age_d * 86400000)
    }

    request_history(start_ms: number) {
        if (this.requested_date !== undefined && start_ms > this.requested_date) {
            return
        }
        this.requested_date = start_ms  
        this.commandstore.command({
            type: 'rta',
            tagname: '__alarms__',
            value: {
                action: 'BULK HISTORY',
                date_ms: this.requested_date
            }
        })
    }
}