import { Component, OnInit, OnDestroy, Input } from '@angular/core'
import { Tag, TagSubject } from 'src/app/store/tag'
import { MsForm, FormSubject } from 'src/app/store/form'
import { CommandSubject } from 'src/app/store/command'

@Component({
    selector: 'app-alarms',
    templateUrl: './alarms.component.html'
})
export class AlarmsComponent implements OnInit, OnDestroy {
    subs: any = []
    @Input() item: any
    tag: Tag
    raw: string[][]
    show: string[][]
    filtered: number
    display: string
    displayfilter: boolean
    filter: string[]
    name: string
    desc: string
    actionform: MsForm.Form
    filterform: MsForm.Form
    form: MsForm.Form

    constructor(
        private tagstore: TagSubject,
        private commandstore: CommandSubject,
        private formstore: FormSubject
    ) {
        this.tag = new Tag()
        this.raw = []
        this.show = []
        this.filtered = 0
        this.display = 'none'
        this.displayfilter = false
        this.filter = ['', '', '']
        this.name = ''
        this.desc = ''
        this.actionform = new MsForm.Form()
        this.actionform.requestid = 'alarms action'
        this.actionform.name = 'Change callout'
        this.actionform.description = 'Enable / Disable all filtered alarms'
        this.actionform.controls = [
            {
                inputtype: 'multi',
                name: 'Callout',
                options: ['', 'Enable Callout', 'Disable Callout']
            }
        ]
        this.filterform = new MsForm.Form()
        this.filterform.requestid = 'alarms filter'
        this.filterform.name = 'Alarms List'
        this.filterform.description = 'Change alarm filter - case sensitive'
        this.filterform.controls = [
            {
                inputtype: 'filter',
                name: 'Tagname',
                options: ['AnBa', 'AnG1', 'AnG2', 'AnSs', 'AnSo'],
                stringvalue: ''
            },
            {
                inputtype: 'filter',
                name: 'Description',
                stringvalue: ''
            },
            {
                inputtype: 'filter',
                name: 'Callout Mode',
                options: ['On', 'Off'],
                stringvalue: ''
            }
        ]
        this.form = new MsForm.Form()
        this.form.requestid = 'alarms multi'
    }

    showControl() {
        this.formstore.showForm(this.actionform)
    }

    formAlarmAction(cmd: MsForm.Close) {
        if (cmd.action === 'submit') {
            if(cmd.setvalue['Callout'] == 0) { return }
            let callout
            if(cmd.setvalue['Callout'] == 1) {
                callout = true
            }
            else {
                callout = false
            }
            this.commandstore.command({
                "type": "set",
                "tagname": this.item.tagname[1],
                "value": {
                    'action': 'bulkupdate',
                    'callout': callout,
                    'filter': this.filter
                }
            })
        }
    }

    // setCallout(on: boolean) {
    //     this.commandstore.command({
    //         "type": "set",
    //         "tagname": this.item.tagname[1],
    //         "value": {
    //             'action': 'bulkupdate',
    //             'callout': on,
    //             'filter': this.filter
    //         }
    //     })
    // }

    updateFilter() {
        this.filtered = 0
        this.show = []
        for (let i = 0; i < this.raw.length; i++) {
            const row = this.raw[i]
            if (row[2] === "Off") {
                this.filtered += 1
            }
            let addok = true
            for (let j = 0; j < this.filter.length; j++) {
                const filter = this.filter[j]
                if (!row[j].includes(filter)) {
                    addok = false
                }
            }
            if (addok) {
                this.show.push(row)
            }
        }
    }

    showFilter() {
        this.filterform.controls[0].stringvalue = this.filter[0]
        this.filterform.controls[1].stringvalue = this.filter[1]
        this.filterform.controls[2].stringvalue = this.filter[2]
        this.formstore.showForm(this.filterform)
    }

    showMulti(tag: string[]) {
        let control = new MsForm.Control()
        control.inputtype = 'multi'
        control.name = tag[0]
        control.options = ['On', 'Off']
        control.optionvalue = ['On', 'Off'].indexOf(tag[2])
        this.form.controls = [control]
        this.form.name = tag[0]
        this.form.description = tag[1]
        this.formstore.showForm(this.form)
    }

    formFilterAction(cmd: MsForm.Close) {
        if (cmd.action === 'submit') {
            this.filter = [
                cmd.setvalue['Tagname'] as string,
                cmd.setvalue['Description'] as string,
                cmd.setvalue['Callout Mode'] as string
            ]
            this.updateFilter()
        }
    }

    formAction(cmd: MsForm.Close) {
        if (cmd.action === 'submit') {
            let tagname = Object.keys(cmd.setvalue)[0]
            let value = cmd.setvalue[tagname]
            this.commandstore.command({
                "type": "set",
                "tagname": this.item.tagname[1],
                "value": {
                    'action': 'tagupdate',
                    'tagname': tagname,
                    'callout': [true, false][value as number]
                }
            })
        }
    }

    ngOnInit(): void {
        this.subs.push(
            this.tagstore.subject(this.item.tagname[0]).asObservable().subscribe((tag: any) => {
                if (this.tag.id === null) {
                    this.tag = tag
                }
                else {
                    this.tag.value = tag.value
                    this.tag.time_ms = tag.time_ms
                }
                this.raw = []
                for (let i = 0; i < tag.value.length; i++) {
                    const row = this.tag.value[i]
                    this.raw.push(row)
                }
                this.updateFilter()
            }),
            this.formstore.closesubject.asObservable().subscribe(cmd => {
                if (cmd.requestid == 'alarms action') {
                    this.formAlarmAction(cmd)
                }
                else if (cmd.requestid == 'alarms filter') {
                    this.formFilterAction(cmd)
                }
                else if (cmd.requestid == 'alarms multi') {
                    this.formAction(cmd)
                }
            })
        )
    }

    ngOnDestroy() {
        for (let i = 0; i < this.subs.length; i++) {
            this.subs[i].unsubscribe()
        }
    }
}
