import { Component, OnInit, OnDestroy } from "@angular/core"
import { UntypedFormGroup, UntypedFormControl } from '@angular/forms'
import { MsForm, FormSubject } from 'src/app/store/form'

@Component({
    selector: 'app-form',
    templateUrl: './form.component.html',
    styleUrls: []
})
export class FormComponent implements OnInit, OnDestroy {
    subs: any = []
    display: string = 'none'
    action: MsForm.Close
    form: UntypedFormGroup
    name: string = ''
    description: string = ''
    fields: string[] = []
    filter: string[] = []
    controls: MsForm.Control[] = []
    delete: boolean = false

    constructor(
        private formstore: FormSubject
    ) {
        this.action = new MsForm.Close()
        this.form = new UntypedFormGroup({})
    }

    patch(key: string, value: string) {
        this.form.patchValue({ [key]: value })
        this.form.markAsDirty()
    }

    onDelete() {
        this.display = 'none'
        this.action.action = 'delete'
        this.formstore.setResult(this.action)
    }

    onCancel() {
        this.display = 'none'
    }

    onSubmit() {
        this.display = 'none'
        if (!this.form.dirty) {
            return
        }
        this.action.action = 'submit'
        for (let i = 0; i < this.controls.length; i++) {
            const control = this.controls[i]
            let value = this.form.controls[control.name].value
            if(control.hasOwnProperty('numbervalue')) {
                value = parseFloat(value as string)
                if(control.min !== undefined && control.max !== undefined) {
                    if(value < control.min) {value = control.min}
                    else if(value > control.max) {value = control.max}
                }
            }
            else if(control.hasOwnProperty('optionvalue')) {
                value = parseInt(value as string)
            }
            this.form.value[control.name] = value
        }
        this.action.setvalue = this.form.value
        this.formstore.setResult(this.action)
    }

    makeForm(config: MsForm.Form) {
        this.name = config.name
        this.description = config.description
        this.controls = config.controls
        this.delete = config.delete
        let formcontrols: {[key: string]: UntypedFormControl} = {}
        for (let i = 0; i < this.controls.length; i++) {
            const control = this.controls[i]
            if (control.inputtype == 'setpoint') {
                let va = control.numbervalue || 0
                let value = va.toFixed(control.dp)
                formcontrols[control.name] = new UntypedFormControl(value)
            }
            else if (control.inputtype == 'multi') {
                let value = control.optionvalue || 0
                formcontrols[control.name] = new UntypedFormControl(value)
            }
            else if (control.inputtype == 'filter') {
                let value = control.stringvalue || ''
                formcontrols[control.name] = new UntypedFormControl(value)
            }
            else if (control.inputtype == 'datetime') {
                let value = control.stringvalue || ''
                formcontrols[control.name] = new UntypedFormControl(value)
            }
            else if (control.inputtype == 'textarea') {
                let value = control.stringvalue || ''
                formcontrols[control.name] = new UntypedFormControl(value)
            }
        }
        this.form = new UntypedFormGroup(formcontrols)
        if (config.dirty) {  // allows calling function to require a return value on no change
            this.form.markAsDirty()
        }
        this.action.requestid = config.requestid
        this.display = 'block'
    }

    ngOnInit(): void {
        this.subs.push(
            this.formstore.formsubject.asObservable().subscribe(config => {
                this.makeForm(config)
            })
        )
    }

    ngOnDestroy() {
        for (let i = 0; i < this.subs.length; i++) {
            this.subs[i].unsubscribe()
        }
    }
}