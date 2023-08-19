import { Component } from '@angular/core'
import { Tag } from 'src/app/store/tag'
import { BaseFormComponent } from '../base/base.form.component'
import { MsForm } from 'src/app/store/form'

@Component({
    selector: 'app-setpoint',
    templateUrl: './setpoint.component.html',
    styleUrls: []
})
export class SetpointComponent extends BaseFormComponent {
    control: MsForm.Control

    constructor() {
        super()
        this.control = new MsForm.Control()
    }

    makeForm() {
        switch (this.tag.format) {
            case 'multi':
                this.control.inputtype = 'multi'
                this.control.options = this.tag.multi || []
                this.control.optionvalue = this.tag.value
                break;
            default:
                this.control.inputtype = 'setpoint'
                this.control.min = this.tag.min || 0
                this.control.max = this.tag.max || 100
                this.control.units = this.tag.units || ''
                this.control.dp = this.tag.dp || 2
                this.control.numbervalue = this.tag.value
                break;
        }
        this.control.name = this.tag.name
        this.showForm(this.tag.name, this.tag.desc, [this.control])
        this.formstore.showForm(this.form)
    }
}