import { Component, OnInit, OnDestroy, Input } from '@angular/core'
import { Tag, TagSubject } from 'src/app/store/tag'
import { MsForm, FormSubject } from 'src/app/store/form'
import { CommandSubject } from 'src/app/store/command'
import { CalleeSubject, CalleeData } from 'src/app/store/callee'

@Component({
    selector: 'app-callout',
    templateUrl: './callout.component.html'
})
export class CalloutComponent implements OnInit, OnDestroy {
    subs: any = []
    @Input() item: any
    tag: Tag
    display: string
    name: string
    to: string
    form: MsForm.Form
    calleeData: CalleeData

    constructor(
        private tagstore: TagSubject,
        private commandstore: CommandSubject,
        private formstore: FormSubject,
        private calleeStore: CalleeSubject
    ) {
        this.tag = new Tag()
        this.display = 'none'
        this.name = ''
        this.to = ''
        this.form = new MsForm.Form()
        this.form.requestid = 'callout'
        this.calleeData = { callees: [], escalation: [] }
    }

    showForm(index: number) {
        const callee = this.calleeData.callees[index]
        
        // Create form controls
        let name = new MsForm.Control()
        name.name = 'name'
        name.inputtype = 'description'
        name.stringvalue = callee.name

        let sms = new MsForm.Control()
        sms.name = 'sms'
        sms.inputtype = 'description'
        sms.stringvalue = callee.sms

        let role = new MsForm.Control()
        role.name = 'role'
        role.inputtype = 'filter'
        role.options = this.calleeData.escalation
        role.stringvalue = callee.role

        this.form.requestid = this.item.tagname
        this.form.name = "Edit Callee"
        this.form.delete = false
        this.form.controls = [name, sms, role]
        this.formstore.pubFormOpts(this.form)
    }

    formAction(cmd: MsForm.Close) {
        if (cmd.requestid == this.item.tagname) {
            this.calleeStore.callee_action(cmd)
        }
    }

    ngOnInit(): void {
        this.calleeStore.subscribe(this.item.tagname)
        this.subs.push(
            this.calleeStore.subject.asObservable().subscribe((data: CalleeData) => {
                this.calleeData = data
            }),
            this.formstore.closesubject.asObservable().subscribe(cmd => {
                if (cmd.requestid.startsWith(this.item.tagname)) {
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
