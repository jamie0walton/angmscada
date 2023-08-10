import { Component } from '@angular/core'
import { BaseFormComponent } from '../base/base.form.component'
import { MsForm } from 'src/app/store/form'

@Component({
    selector: 'app-string-setpoint',
    templateUrl: './string-setpoint.component.html',
    styleUrls: []
})
export class StringSetpointComponent extends BaseFormComponent {
    control: MsForm.Control

    constructor() {
        super()
        this.control = new MsForm.Control()
    }

    makeForm() {
        this.control.inputtype = 'textarea'
        this.control.name = this.tag.name
        this.control.stringvalue = this.tag.value
        this.showForm(this.tag.name, this.tag.desc, [this.control])
        this.formstore.showForm(this.form)
    }
}
