import { Component } from '@angular/core'
import { BaseFormComponent } from '../base/base.form.component'
import { MsForm } from 'src/app/store/form'

@Component({
    selector: 'app-selectdict',
    templateUrl: './selectdict.component.html',
    styleUrls: []
})
export class SelectDictComponent extends BaseFormComponent {
    control: MsForm.Control
    selected: boolean[] = []
    change: boolean = false
    b0: number = -1

    constructor() {
        super()
        this.control = new MsForm.Control()
        // Override explicitly preferred to hidden override.
        this.formAction = this.localFormAction
        this.tagAction = this.localTagAction
    }

    makeForm() {
        this.control.inputtype = this.item.config.opts.type
        if(this.control.inputtype === 'float') {
            this.control.name = this.tag.name
            this.control.min = this.item.config.opts.min || 0
            this.control.max = this.item.config.opts.max || 100
            this.control.units = this.item.config.opts.units || ''
            this.control.dp = this.item.config.opts.dp || 2
            this.control.numbervalue = this.tag.value.values[0]
        }
        else if(this.control.inputtype === 'multi') {
            this.control.name = this.tag.name
            this.control.options = this.item.config.opts.multi || []
            this.control.optionvalue = this.tag.value.values[0]
        }
        this.form.name = this.tag.name
        this.form.description = this.tag.desc
        this.form.controls = [this.control]
        // this.form.dirty = true  // default is the first setpoint, however even no change == dirty
        this.showForm()
    }

    peg(i: number, event: any) {
        if (event.shiftKey) {
            if (this.b0 == -1) {
                this.selected[i] = !this.selected[i]
                this.b0 = i
            }
            else {
                let [i0, i1] = [this.b0, i]
                if (i1 < i0) {
                    [i1, i0] = [i0, i1]
                }
                for (let i = i0; i < i1 + 1; i++) {
                    if (this.tag.value.locks[i] == 0) {
                        this.selected[i] = this.selected[this.b0]
                    }
                }
                this.b0 = -1
            }
        }
        else {
            this.b0 = i
            this.selected[i] = !this.selected[i]
        }
        this.change = this.selected.includes(true)
    }

    localFormAction(cmd: MsForm.Close) {
        if (cmd.action === 'submit' && this.tag.name in cmd.setvalue) {
            let newvalue = {
                "labels": [...this.tag.value.labels],
                "values": [...this.tag.value.values],
                "locks": [...this.tag.value.locks]
            }
            let newset = parseFloat(cmd.setvalue[this.tag.name] as string)
            if(this.item.config.opts.type === 'float') {
                newset = Math.min(Math.max(
                    this.item.config.opts.min || 0, newset), this.item.config.opts.max || 100
                )
            }
            else if(this.item.config.opts.type === 'multi') {
                newset = Math.trunc(newset)
                if(newset < 0 || newset > this.item.config.opts.multi.length) {
                    console.log('outside of range of multi list', cmd)
                    return
                }
            }
            for (let i = 0; i < this.tag.value.labels.length; i++) {
                if(this.selected[i]) {
                    newvalue.values[i] = newset
                }
            }
            this.selected.fill(false)
            this.change = false
            this.commandstore.command({
                "type": "set",
                "tagname": this.tag.name,
                "value": newvalue
            })
        }
    }

    localTagAction(){
        if (this.tag.value != null) {
            this.selected = new Array(this.tag.value.labels.length)
            this.selected.fill(false)
        }
    }
}
