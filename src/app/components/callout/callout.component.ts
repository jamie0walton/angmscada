import { Component, OnInit, OnDestroy, Input } from '@angular/core'
import { Tag, TagSubject } from 'src/app/store/tag'
import { MsForm, FormSubject } from 'src/app/store/form'
import { CommandSubject } from 'src/app/store/command'

const DUTY_OPTS = ['off', 'oncall', 'backup1', 'backup2', 'escalate']

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

    constructor(
        private tagstore: TagSubject,
        private commandstore: CommandSubject,
        private formstore: FormSubject
    ) {
        this.tag = new Tag()
        this.display = 'none'
        this.name = ''
        this.to = ''
        this.form = new MsForm.Form()
        this.form.requestid = 'callout'
    }

    showFilter() {}

    showMulti(index: number) {
        let name = this.tag.value[index][0]
        let number = this.tag.value[index][1]
        let level = this.tag.value[index][2]
        let control = new MsForm.Control()
        control.inputtype = 'multi'
        control.name = number
        control.options = DUTY_OPTS
        control.optionvalue = DUTY_OPTS.indexOf(level)
        this.form.controls = [control]
        this.form.name = name
        this.form.description = number
        this.formstore.pubFormOpts(this.form)
    }

    formAction(cmd: MsForm.Close) {
        if (cmd.action === 'submit') {
            let number = Object.keys(cmd.setvalue)[0]
            let setpt = cmd.setvalue[number]
            this.commandstore.command({
                "type": "set",
                "tagname": this.item.tagname[1],
                "value": {
                    'to': number,
                    'duty': setpt
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
                if (cmd.requestid === 'callout') {
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
