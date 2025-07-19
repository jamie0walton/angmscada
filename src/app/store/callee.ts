import { Injectable, inject } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { TagSubject } from 'src/app/store/tag'
import { CommandSubject } from './command'

export interface Callee {
    name: string
    sms: string
    delay_ms: number
    group: string[]
}

export interface Group {
    name: string
    group: string
}

export interface CalleeData {
    callees: Callee[]
    groups: Group[]
}

@Injectable({
    providedIn: 'root'
})
export class CalleeSubject {
    subject: BehaviorSubject<CalleeData>
    private callees: Callee[]
    private groups: Group[]
    private tagstore: TagSubject
    private commandstore: CommandSubject
    private tagname: string = ''

    constructor() {
        this.callees = []
        this.groups = []
        this.subject = new BehaviorSubject<CalleeData>({
            callees: this.callees,
            groups: this.groups
        })
        this.tagstore = inject(TagSubject)
        this.commandstore = inject(CommandSubject)
    }

    subscribe(tagname: string) {
        this.tagname = tagname
        this.tagstore.subject(tagname).subscribe(tag => {
            this.update_data(tag.value)
        })
        this.request_all(tagname)
    }

    update_data(tag_value: any) {
        if (tag_value?.hasOwnProperty('callees') && Array.isArray(tag_value.callees)) {
            this.callees = tag_value.callees.map((callee: any) => ({
                name: callee.name || '',
                sms: callee.sms || '',
                delay_ms: callee.delay_ms || -1,
                group: callee.group || []
            }))
        }
        if (tag_value?.hasOwnProperty('groups') && Array.isArray(tag_value.groups)) {
            this.groups = tag_value.groups.map((group: any) => ({
                name: group.name || '',
                group: group.group || ''
            }))
        }
        this.subject.next({
            callees: this.callees,
            groups: this.groups
        })
    }

    request_all(tagname: string) {
        this.commandstore.command({
            type: 'rta',
            tagname: tagname,
            value: {
                action: 'ALL'
            }
        })
    }

    callee_action(cmd: any) {
        if (cmd.action === 'submit') {
            const calleeName = cmd.requestid.split(' ').slice(1).join(' ')
            const delay = cmd.setvalue['delay'] as number
            const delay_ms = delay < 0 ? -1 : delay * 60000

            const selectedGroups = cmd.setvalue['groups']
            const groups = Array.isArray(selectedGroups) 
                ? selectedGroups.map((i: number) => this.groups[i]?.name).filter(Boolean)
                : [this.groups[selectedGroups as number]?.name].filter(Boolean)

            this.commandstore.command({
                type: 'rta',
                tagname: this.tagname,
                value: {
                    action: 'UPDATE_CALLEE',
                    name: calleeName,
                    delay_ms: delay_ms,
                    groups: groups
                }
            })
        }
    }
}
