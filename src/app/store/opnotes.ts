import { Injectable, inject } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { TagSubject } from 'src/app/store/tag'
import { CommandSubject } from './command'
import { MsForm } from 'src/app/store/form'

export interface OpNote {
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
export class OpNoteSubject {
    subject: BehaviorSubject<OpNote[]>
    private opnotes: OpNote[]
    private tagstore: TagSubject
    private commandstore: CommandSubject
    private requested_date: number | undefined = undefined

    constructor() {
        this.opnotes = []
        this.subject = new BehaviorSubject<OpNote[]>(this.opnotes)
        this.tagstore = inject(TagSubject)
        this.commandstore = inject(CommandSubject)
        this.tagstore.subject('__opnotes__').subscribe(tag => {
            this.update_opnotes(tag.value)
        })
    }

    update_opnotes(tag_value: any) {
        if (tag_value?.hasOwnProperty('id')) {
            const index = this.opnotes.findIndex((obj) => obj.id === tag_value.id);
            if (tag_value.hasOwnProperty('date_ms')) {
                let opnote: OpNote = {
                    id: tag_value.id,
                    date_ms: tag_value.date_ms,
                    by: tag_value.by,
                    site: tag_value.site,
                    note: tag_value.note,
                    abnormal: tag_value.abnormal
                }
                if (index === -1) {  // not present, insert in descending order
                    const insertIndex = this.opnotes.findIndex((obj) => obj.date_ms < opnote.date_ms);
                    if (insertIndex !== -1) {
                        this.opnotes.splice(insertIndex, 0, opnote)
                    } else {
                        this.opnotes.push(opnote);
                    }
                } else {  // or replace
                    this.opnotes[index] = opnote;
                    this.opnotes.sort((a, b) => b.date_ms - a.date_ms)
                }
            } else {  // assume only has .id
                if (index !== -1) {  // if present, delete
                    this.opnotes.splice(index, 1);
                }
            }
        }
        else if (tag_value?.hasOwnProperty('data') && Array.isArray(tag_value.data)) {
            let startidx: {[key: number]: number} = {}
            for (let i = 0; i < this.opnotes.length; i++) {
                startidx[this.opnotes[i].id] = i
            }
            for (let i = 0; i < tag_value.data.length; i++) {
                const rec = tag_value.data[i]
                let update = {
                    id: rec[0],
                    date_ms: rec[1],
                    site: rec[2],
                    by: rec[3],
                    note: rec[4],
                    abnormal: rec[5]
                }
                if (rec[0] in startidx) {
                    this.opnotes[startidx[rec[0]]] = update
                }
                else {
                    this.opnotes.push(update)
                }
            }
            this.opnotes.sort((a, b) => b.date_ms - a.date_ms)
        }
        else {
            this.opnotes = []
        }
        this.subject.next(this.opnotes)
    }

    request_history(start_ms: number) {
        if (this.requested_date !== undefined && start_ms > this.requested_date) {
            return
        }
        this.requested_date = start_ms
        this.commandstore.command({
            type: 'rta',
            tagname: '__opnotes__',
            value: {
                action: 'BULK HISTORY',
                date_ms: this.requested_date
            }
        })
    }

    opnote_action(cmd: MsForm.Close) {
        // '__opnotes__ {id}' so 12
        let editid: number | undefined = parseInt(cmd.requestid.substring(12))
        let action = 'MODIFY'
        if(editid === -1){
            editid = undefined
            action = 'ADD'
        }
        if(cmd.action === 'submit') {
            let date_ms = Date.now()
            if (cmd.setvalue['date_ms'] == cmd.setvalue['date_ms']) {
                date_ms = Number(cmd.setvalue['date_ms'])
            }
            this.commandstore.command({
                'type': 'rta',
                'tagname': '__opnotes__',
                'value': {
                    'action': action,
                    'id': editid,
                    'by': cmd.setvalue['by'],
                    'site': cmd.setvalue['site'],
                    'date_ms': date_ms,
                    'note': cmd.setvalue['note'],
                    'abnormal': cmd.setvalue['Abnormal']
                }
            })
        }
        else if (cmd.action === 'delete'){
            this.commandstore.command({
                'type': 'rta',
                'tagname': '__opnotes__',
                'value': {
                    'action': 'DELETE',
                    'id': editid
                }
            })
        }
    }
}
