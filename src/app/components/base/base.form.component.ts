import { Component, inject } from '@angular/core'
import { BaseComponent } from './base.component'
import { MsForm, FormSubject } from 'src/app/store/form'
import { CommandSubject } from 'src/app/store/command'

@Component({ template: "" })
export class BaseFormComponent extends BaseComponent {
    formstore = inject(FormSubject)
    commandstore = inject(CommandSubject)
    form: MsForm.Form
    requestid: number

    constructor() {
        super()
        this.form = new MsForm.Form()
        this.requestid = 0
    }

    formAction(cmd: MsForm.Close) {
        // Default action is to write the tag value on the server. May be overridden.
        if (cmd.action === 'submit' && this.tag.name in cmd.setvalue) {
            this.commandstore.command({
                "type": "set",
                "tagname": this.tag.name,
                "value": cmd.setvalue[this.tag.name]
            })
        }
    }

    showForm(name: string, desc: string, controls: MsForm.Control[]) {
        // Create the form based on the controls, start listening to the form
        // and then request the form be shown.
        this.form.name = name
        this.form.description = desc
        this.form.controls = controls
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
        this.formstore.showForm(this.form)
    }
}
