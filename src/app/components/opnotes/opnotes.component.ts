import { Component, OnInit, OnDestroy, Input } from '@angular/core'
import { Tag, TagSubject } from 'src/app/store/tag'
import { MsForm, FormSubject } from 'src/app/store/form'
import { CommandSubject } from 'src/app/store/command'

@Component({
    selector: 'app-opnotes',
    templateUrl: './opnotes.component.html',
    styleUrls: []
})
export class OpNotesComponent implements OnInit, OnDestroy {
    subs: any = []
    @Input() item: any
    tag: Tag
    datecontrol: MsForm.Control
    sitecontrol: MsForm.Control
    bycontrol: MsForm.Control
    textcontrol: MsForm.Control
    form: MsForm.Form

    constructor(
        private tagstore: TagSubject,
        private commandstore: CommandSubject,
        private formstore: FormSubject
    ) {
        this.tag = new Tag()
        this.form = new MsForm.Form()
        this.datecontrol = new MsForm.Control()
        this.datecontrol.inputtype = 'datetime'
        this.datecontrol.name = 'date'
        this.sitecontrol = new MsForm.Control()
        this.sitecontrol.inputtype = 'filter'
        this.sitecontrol.name = 'site'
        this.bycontrol = new MsForm.Control()
        this.bycontrol.inputtype = 'filter'
        this.bycontrol.name = 'by'
        this.textcontrol = new MsForm.Control()
        this.textcontrol.inputtype = 'textarea'
        this.textcontrol.name = 'text'
    }

    showForm(index: number) {
        this.sitecontrol.options = this.item.sites
        this.bycontrol.options = this.item.by
        if(index === -1) {
            this.form.requestid = this.tag.name + " -1"
            this.form.name = "Add Note"
            this.form.delete = false
            this.sitecontrol.stringvalue = "Select site"
            this.bycontrol.stringvalue = "Enter author"
            this.datecontrol.stringvalue = this.datetimestring(new Date())
            this.textcontrol.stringvalue = "Describe"
        }
        else {
            this.form.requestid = this.tag.name + " " + this.tag.value[index][0]
            this.form.name = "Edit Note"
            this.form.delete = true
            this.sitecontrol.stringvalue = this.tag.value[index][1]
            this.bycontrol.stringvalue = this.tag.value[index][2]
            this.datecontrol.stringvalue = this.datetimestring(this.asDate(this.tag.value[index][3]))
            this.textcontrol.stringvalue = this.tag.value[index][4]
        }
        this.form.controls = [
            this.datecontrol, this.sitecontrol, this.bycontrol, this.textcontrol
        ]
        this.formstore.showForm(this.form)
    }

    asDate(sec: number): Date {
        return new Date(sec * 1000)
    }

    datetimestring(d: Date) {
        // new Date().toISOString().substring(0, 16),
        function pad(number: number) {
            if (number < 10) {
                return '0' + number;
            }
            return number;
        }
        let now = d.getFullYear() +
            '-' + pad(d.getMonth() + 1) +
            '-' + pad(d.getDate()) +
            'T' + pad(d.getHours()) +
            ':' + pad(d.getMinutes()) +
            ':' + pad(d.getSeconds())
        return now
    }

    formAction(cmd: MsForm.Close) {
        let editid: number | undefined = parseInt(cmd.requestid.substring(this.tag.name.length + 1))
        let action = 'update'
        if(editid === -1){
            editid = undefined
            action = 'insert'
        }
        if(cmd.action === 'submit') {
            this.commandstore.command({
                "type": "set",
                "tagname": this.item.tagname[1],
                "value": {
                    'action': action,
                    'id': editid,
                    'by': cmd.setvalue['by'],
                    'site': cmd.setvalue['site'],
                    'date': Math.round(new Date(cmd.setvalue['date']).getTime() / 1000),
                    'note': cmd.setvalue['text']
                }
            })
        }
        else if (cmd.action === 'delete'){
            this.commandstore.command({
                "type": "set",
                "tagname": this.item.tagname[1],
                "value": {
                    'action': 'delete',
                    'id': editid
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
            }),
            this.formstore.closesubject.asObservable().subscribe(cmd => {
                if (cmd.requestid.startsWith(this.tag.name)) {
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
