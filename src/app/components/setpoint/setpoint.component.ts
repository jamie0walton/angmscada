import { Component } from '@angular/core'
import { BaseFormComponent } from '../base/base.form.component'
import { MsForm } from 'src/app/store/form'

@Component({
    selector: 'app-setpoint',
    templateUrl: './setpoint.component.html',
    styleUrls: []
})
export class SetpointComponent extends BaseFormComponent {
    makeForm() {
        let control: MsForm.Control = new MsForm.Control()
        switch (this.tag.format) {
            case 'float':
                control.inputtype = this.tag.format
                control.min = this.tag.min || 0
                control.max = this.tag.max || 100
                control.units = this.tag.units || ''
                control.dp = this.tag.dp || 2
                control.numbervalue = this.tag.value
                break
            case 'int':
                control.inputtype = this.tag.format
                control.min = this.tag.min || 0
                control.max = this.tag.max || 100
                control.units = this.tag.units || ''
                control.dp = this.tag.dp || 0
                control.numbervalue = this.tag.value
                break
            case 'multi':
                control.inputtype = this.tag.format
                control.options = this.tag.multi || []
                control.optionvalue = this.tag.value
                break
            case 'time':
                control.inputtype = this.tag.format
                control.numbervalue = this.tag.value
                break
            case 'date':
                control.inputtype = this.tag.format
                control.numbervalue = this.tag.value
                break
            case 'datetime':
                control.inputtype = this.tag.format
                control.numbervalue = this.tag.value
                break
            case 'str':
                control.inputtype = this.tag.format
                control.stringvalue = this.tag.value
                break
            default:
                return
        }
        control.name = this.tag.name
        this.form.name = this.tag.name
        this.form.description = this.tag.desc
        this.form.action = 'set'
        this.form.controls = [control]
        this.showForm()
    }
}