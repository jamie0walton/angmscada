import { Component, OnInit, OnDestroy } from "@angular/core"
import { UntypedFormGroup, UntypedFormControl } from '@angular/forms'
import { MsForm, FormSubject } from 'src/app/store/form'

@Component({
    selector: 'app-form',
    templateUrl: './form.component.html'
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
    filex: File|null = null
    filename: string = ''
    filteredOptions: {[key: string]: string[]} = {}
    filterText: {[key: string]: string} = {}

    constructor(
        private formstore: FormSubject
    ) {
        this.action = new MsForm.Close()
        this.form = new UntypedFormGroup({})
    }

    patch(key: string, value: string) {
        this.form.patchValue({ [key]: value })
        this.form.markAsDirty()
        const control = this.controls.find(c => c.name === key)
        if (control && control.inputtype === 'filter') {
            this.clearFilter(key)
        }
    }

    onFilterKeydown(event: KeyboardEvent, controlName: string) {
        const key = event.key.toLowerCase()
        if (key.length === 1) {
            this.filterText[controlName] = key
            this.updateFilteredOptions(controlName)
        }
    }

    updateFilteredOptions(controlName: string) {
        const control = this.controls.find(c => c.name === controlName)
        if (control && control.options) {
            if (this.filterText[controlName]) {
                this.filteredOptions[controlName] = control.options.filter(option => 
                    option.toLowerCase().startsWith(this.filterText[controlName])
                )
            } else {
                this.filteredOptions[controlName] = control.options
            }
        }
    }

    clearFilter(controlName: string) {
        this.filterText[controlName] = ''
        this.updateFilteredOptions(controlName)
    }

    onFilesDropped(files: FileList) {
        this.filex = files[0]
        this.filename = this.filex.name
        this.form.markAsDirty()
    }

    onFilesBrowsed(event: any) {
        this.filex = event.target.files[0] as File
        this.filename = this.filex.name
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
        // if (!this.form.dirty) {
        //     return
        // }
        this.action.action = 'submit'
        for (let i = 0; i < this.controls.length; i++) {
            const control = this.controls[i]
            let value = this.form.controls[control.name].value
            let now = new Date()
            let ti
            switch (control.inputtype) {
                case 'float':
                    value = parseFloat(value as string)
                    if(control.min !== undefined && control.max !== undefined) {
                        if(value < control.min) {value = control.min}
                        else if(value > control.max) {value = control.max}
                    }
                    break
                case 'int':
                case 'multi':
                    value = parseInt(value as string)
                    if(control.min !== undefined && control.max !== undefined) {
                        if(value < control.min) {value = control.min}
                        else if(value > control.max) {value = control.max}
                    }
                    break
                case 'time':
                    ti = value.split(':')
                    now.setHours(parseInt(ti[0]))
                    now.setMinutes(parseInt(ti[1]))
                    now.setSeconds(0)
                    now.setMilliseconds(0)
                    value = now.valueOf()
                    break
                case 'date':
                    ti = value.split('-')
                    now.setFullYear(parseInt(ti[0]))
                    now.setMonth(parseInt(ti[1]) - 1)
                    now.setDate(parseInt(ti[2]))
                    now.setHours(0)
                    now.setMinutes(0)
                    now.setSeconds(0)
                    now.setMilliseconds(0)
                    value = now.valueOf()
                    break
                case 'datetime':
                    value = new Date(value).valueOf()
                    break
                case 'str':
                case 'textarea':
                    value = value
                    break
                case 'filter':
                    value = value
                    break
                case 'drag_n_drop':
                    value = this.filex
                    break
                case 'checkbox':
                    value = value ? 1 : 0
                    break
                case 'description':
                    value = value
                    break
                default:
                    break
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
        this.filteredOptions = {}
        this.filterText = {}
        let formcontrols: {[key: string]: UntypedFormControl} = {}
        for (let i = 0; i < this.controls.length; i++) {
            const control = this.controls[i]
            let value
            switch (control.inputtype) {
                case 'float':
                    let va = control.numbervalue || 0
                    value = va.toFixed(control.dp)
                    break
                case 'int':
                case 'multi':
                    value = control.numbervalue || 0
                    break
                case 'time':
                case 'date':
                case 'datetime':
                    value = control.stringvalue || ''
                    break
                case 'str':
                case 'textarea':
                case 'drag_n_drop':
                    value = control.stringvalue || ''                    
                    break
                case 'filter':
                    value = control.stringvalue || ''
                    if (control.options) {
                        this.filteredOptions[control.name] = control.options
                        this.filterText[control.name] = ''
                    }
                    break
                case 'checkbox':
                    value = control.numbervalue ? 1 : 0
                    break
                case 'description':
                    value = control.stringvalue || ''
                    break
                default:
                    break
            }
            formcontrols[control.name] = new UntypedFormControl(value)
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