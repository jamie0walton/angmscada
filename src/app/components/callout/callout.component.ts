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
        this.calleeData = { callees: [], groups: [] }
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

        let delay = new MsForm.Control()
        delay.name = 'delay'
        delay.inputtype = 'int'
        delay.numbervalue = callee.delay_ms === -1 ? 0 : callee.delay_ms / 60000
        delay.min = -1
        delay.units = 'minutes'

        let groups = new MsForm.Control()
        groups.name = 'groups'
        groups.inputtype = 'multi'
        groups.options = this.calleeData.groups.map(g => g.name)
        groups.optionvalue = callee.group.map(g => 
            this.calleeData.groups.findIndex(grp => grp.name === g)
        ).filter(i => i !== -1)[0] || 0

        this.form.requestid = this.item.tagname + ' ' + callee.name
        this.form.name = "Edit Callee"
        this.form.delete = false
        this.form.controls = [name, sms, delay, groups]
        this.formstore.pubFormOpts(this.form)
    }

    formAction(cmd: MsForm.Close) {
        this.calleeStore.callee_action(cmd)
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
