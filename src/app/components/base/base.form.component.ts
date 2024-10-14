import { Component, inject } from '@angular/core'
import { BaseComponent } from './base.component'
import { MsForm, FormSubject } from 'src/app/store/form'
import { CommandSubject } from 'src/app/store/command'

@Component({ template: "" })
export abstract class BaseFormComponent extends BaseComponent {
    protected formstore = inject(FormSubject)
    protected commandstore = inject(CommandSubject)
    protected form: MsForm.Form
    protected requestid: number

    constructor() {
        super()
        this.form = new MsForm.Form()
        this.requestid = 0
    }

    abstract makeForm(): void

    protected formAction(cmd: MsForm.Close) {
        // Default action is to write the tag value on the server. May be overridden.
        if (cmd.action === 'submit') {
            let value: any = cmd.setvalue
            if (this.tag.name in cmd.setvalue) {
                value = cmd.setvalue[this.tag.name]
            }
            this.commandstore.command({
                "type": this.form.action,
                "tagname": this.tag.name,
                "value": value
            })
        }
    }

    protected showForm() {
        // Create the form based on the controls, start listening to the form
        // and then request the form be shown.
        this.form.requestid = this.formstore.getRequestID()
        this.subs.push(
            this.formstore.closesubject.asObservable().subscribe((cmd: any) => {
                if (cmd.requestid === this.form.requestid) {
                    // always unsubscribe from the form
                    this.subs.pop().unsubscribe()
                    // then either custom or this.defaultFormAction()
                    this.formAction(cmd)
                }
            })
        )
        this.formstore.pubFormOpts(this.form)
    }
}
