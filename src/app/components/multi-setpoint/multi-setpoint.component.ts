import { Component } from '@angular/core'
import { BaseFormComponent } from '../base/base.form.component'
import { MsForm } from 'src/app/store/form'

@Component({
    selector: 'app-multi-setpoint',
    templateUrl: './multi-setpoint.component.html',
    styleUrls: []
})
export class MultiSetpointComponent extends BaseFormComponent {
    control: MsForm.Control

    constructor() {
        super()
        this.control = new MsForm.Control()
    }

    makeForm() {
        this.control.inputtype = 'multi'
        this.control.name = this.tag.name
        this.control.options = this.tag.multi || []
        this.control.optionvalue = this.tag.value
        this.showForm(this.tag.name, this.tag.desc, [this.control])
        this.formstore.showForm(this.form)
    }
}
