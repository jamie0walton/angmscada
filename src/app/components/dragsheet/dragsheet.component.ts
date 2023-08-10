import { Component } from '@angular/core'
import { BaseFormComponent } from '../base/base.form.component'
import { MsForm } from 'src/app/store/form'

@Component({
    selector: 'app-dragsheet',
    templateUrl: './dragsheet.component.html',
    styleUrls: []
})
export class DragsheetComponent extends BaseFormComponent {
    control: MsForm.Control
    periods: number[] = []
    times: string[] = []
    setpoints: string[] = []
    selected: boolean[] = []
    btnclass: string[] = []
    locked: number = 99
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
        if(this.item.config.opts.type === 'float') {
            this.control.inputtype = 'setpoint'
            this.control.name = this.tag.name
            this.control.min = this.item.config.opts.min || 0
            this.control.max = this.item.config.opts.max || 100
            this.control.units = this.item.config.opts.units || ''
            this.control.dp = this.item.config.opts.dp || 2
            this.control.numbervalue = this.tag.value.setpoint[0]
        }
        else if(this.item.config.opts.type === 'multi') {
            this.control.inputtype = 'multi'
            this.control.name = this.tag.name
            this.control.options = this.item.config.opts.multi || []
            this.control.optionvalue = this.tag.value.setpoint[0]
        }
        this.showForm(this.tag.name, this.tag.desc, [this.control])
        this.form.dirty = true  // default is the first setpoint, however even no change == dirty
        this.formstore.showForm(this.form)
    }

    updateBtnClass(i: number) {
        if(this.selected[i]) {
            this.btnclass[i] = "btn-primary"
        } 
        else {
            this.btnclass[i] = "btn-outline-primary"
        }
    }

    peg(i: number, event: any) {
        if (event.shiftKey) {
            if (this.b0 == -1) {
                this.selected[i] = !this.selected[i]
                this.updateBtnClass(i)
                this.b0 = i
            }
            else {
                let [i0, i1] = [this.b0, i]
                if (i1 < i0) {
                    [i1, i0] = [i0, i1]
                }
                for (let i = i0; i < i1 + 1; i++) {
                    this.selected[i] = this.selected[this.b0]
                    this.updateBtnClass(i)
                }
                this.b0 = -1
            }
        }
        else {
            this.b0 = i
            this.selected[i] = !this.selected[i]
            this.updateBtnClass(i)
        }
        this.change = this.selected.includes(true)
    }

    localFormAction(cmd: MsForm.Close) {
        if (cmd.action === 'submit' && this.tag.name in cmd.setvalue) {
            if(this.periods[0] != this.tag.value.period[0]) {
                console.log('changed setpoint on half hour change', cmd)
                return // possible race condition with operator editing near half hour
            }
            let newvalue = {
                "period": [...this.tag.value.period],
                "setpoint": [...this.tag.value.setpoint],
                "locked": this.tag.value.locked
            }
            let newset = parseFloat(cmd.setvalue[this.tag.name] as string)
            if(this.item.config.opts.type === 'float') {
                newset = Math.min(Math.max(
                    this.item.config.opts.min, newset), this.item.config.opts.max
                )
            }
            else if(this.item.config.opts.type === 'multi') {
                newset = Math.trunc(newset)
                if(newset < 0 || newset > this.item.config.opts.multi.length) {
                    console.log('outside of range of multi list', cmd)
                    return
                }
            }
            for (let i = 0; i < this.setpoints.length; i++) {
                if(this.selected[i]) {
                    this.selected[i] = false
                    newvalue.setpoint[i] = newset
                }
                this.change = false
            }
            this.commandstore.command({
                "type": "set",
                "tagname": this.tag.name,
                "value": newvalue
            })
        }
    }

    localTagAction(){
        if (this.tag.value != null) {
            // This first three lines assume the data types are right
            let now = new Date(this.tag.time_ms)
            let year = now.getFullYear()
            let month = now.getMonth()
            let day = now.getDay()
            let hour= now.getHours()
            let minute= now.getMinutes()
            if (minute < 30) {
                minute = 0
            }
            else {
                minute = 30
            }
            let t0 = new Date(year, month, day, hour, minute)
            let s0 = t0.valueOf() / 1000

            this.periods = []
            this.setpoints = []
            this.selected = []
            this.times = []
            this.btnclass = []
            for (let i = 0; i < this.tag.value.setpoint.length; i++) {
                const setpoint = this.tag.value.setpoint[i]
                const period = this.tag.value.period[i]
                this.periods.push(period)
                if(this.item.config.opts.type === 'float'){
                    this.setpoints.push(setpoint.toFixed(this.item.config.opts.dp))
                }
                else if(this.item.config.opts.type === 'multi'){
                    this.setpoints.push(
                        this.item.config.opts.multi[setpoint]
                    )
                }
                else {
                    console.log('invalid', this.item)
                    return
                }
                this.selected.push(false)
                const d = new Date((s0 + i * 1800) * 1000)
                this.times.push(
                    d.toLocaleTimeString([], {hourCycle: 'h23', timeStyle: 'short'} as any)
                )
                if(this.tag.value.locked > i) {
                    this.btnclass.push("btn-outline-primary disabled")
                }
                else {
                    this.btnclass.push("btn-outline-primary")
                }
            }
        }
    }
}
