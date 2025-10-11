import { Injectable, inject } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { TagSubject } from 'src/app/store/tag'
import { CommandSubject } from './command'

export interface Callee {
    name: string
    sms: string
    role: string
    group: string
}

export interface CalleeData {
    callees: Callee[]
    groups: { [key: string]: any }
    escalation: string[]
}

@Injectable({
    providedIn: 'root'
})
export class CalleeSubject {
    subject: BehaviorSubject<CalleeData>
    private callees: Callee[]
    private groups: { [key: string]: any }
    private escalation: string[]
    private tagstore: TagSubject
    private commandstore: CommandSubject
    private tagname: string = ''
    private get_config_requested: boolean = false

    constructor() {
        this.callees = []
        this.groups = {}
        this.escalation = []
        this.subject = new BehaviorSubject<CalleeData>({
            callees: this.callees,
            groups: this.groups,
            escalation: this.escalation
        })
        this.tagstore = inject(TagSubject)
        this.commandstore = inject(CommandSubject)
    }

    subscribe(tagname: string) {
        this.tagname = tagname
        this.tagstore.subject(tagname).subscribe(tag => {
            this.update_data(tag.value)
        })
        this.request_get_config(tagname)
    }

    update_data(tag_value: any) {
        if (tag_value?.hasOwnProperty('callees') && Array.isArray(tag_value.callees)) {
            this.callees = tag_value.callees.map((callee: any) => ({
                name: callee.name || '',
                sms: callee.sms || '',
                role: callee.role || '',
                group: callee.group || ''
            }))
        }
        if (tag_value?.hasOwnProperty('groups') && typeof tag_value.groups === 'object') {
            this.groups = tag_value.groups
        }
        if (tag_value?.hasOwnProperty('escalation') && Array.isArray(tag_value.escalation)) {
            this.escalation = tag_value.escalation
        }
        this.subject.next({
            callees: this.callees,
            groups: this.groups,
            escalation: this.escalation
        })
    }

    request_get_config(tagname: string) {
        if (this.get_config_requested) {
            return
        }
        this.get_config_requested = true
        this.commandstore.command({
            type: 'rta',
            tagname: tagname,
            value: {
                action: 'GET CONFIG'
            }
        })
    }

    callee_action(cmd: any) {
        if (cmd.action === 'submit') {
            const calleeName = cmd.setvalue['name'] as string
            const role = cmd.setvalue['role'] as string
            const group = cmd.setvalue['group'] as string

            this.commandstore.command({
                type: 'rta',
                tagname: this.tagname,
                value: {
                    action: 'MODIFY',
                    name: calleeName,
                    role: role,
                    group: group
                }
            })
        }
    }
}
