import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'
import { Tag } from './tag'

const INPUT = ['', 'description', 'filter', 'multi', 'setpoint', 'int', 'float', 'str', 'textarea', 'time', 'date', 'datetime', 'drag_n_drop', 'checkbox'] as const
const ACTIONS = ['set', 'rta']

// MobileSCADA form modal.
export namespace MsForm {
    // Form control element.
    export interface Control {
        inputtype: typeof INPUT[number]
        name: string
        label?: string
        stringvalue?: string
        numbervalue?: number
        optionvalue?: number
        options?: string[]
        min?: number
        max?: number
        units?: string
        dp?: number
    }

    export class Control {
        constructor() {
            this.inputtype = ''
            this.name = ''
        }
    }

    export interface Form {
        requestid: string
        name: string
        description: string
        controls: Control[]
        delete: boolean
        dirty: boolean
        action: typeof ACTIONS[number]
    }

    export class Form {
        constructor() {
            this.requestid = ''
            this.name = ''
            this.description = ''
            this.controls = []
            this.delete = false
            this.dirty = false  // default to no change == don't send setpoint
            this.action = 'set'  // Default
        }
    }

    export interface Close {
        requestid: string
        action: string
        setvalue: {[key: string]: string | number }
    }

    export class Close {
        constructor () {
            this.requestid = ''
            this.action = ''
            this.setvalue = {}
        }
    }
}

@Injectable({
    providedIn: 'root'
})
export class FormSubject {
    formsubject: Subject<MsForm.Form>
    tagsubject: Subject<Tag>
    closesubject: Subject<MsForm.Close>
    requestid: number

    constructor() {
        this.formsubject = new Subject<MsForm.Form>()
        this.tagsubject = new Subject<Tag>()
        this.closesubject = new Subject<MsForm.Close>()
        this.requestid = 1
    }

    pubFormOpts(formoptions: MsForm.Form) {
        this.formsubject.next(formoptions)
    }

    showMultiSetpointForm(tag: Tag) {
        this.tagsubject.next(tag)
    }

    // Internal use by the form modal.
    setResult(formaction: MsForm.Close) {
        this.closesubject.next(formaction)
    }

    getRequestID(): string {
        // Provide a unique ID for each form.
        return (this.requestid++).toString()
    }
}
