import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'

export interface Command {
    type: string
    tagname: string
    value: any
}

@Injectable({
    providedIn: 'root'
})
export class CommandSubject {
    subject: Subject<Command>

    constructor() {
        this.subject = new Subject<Command>()
    }

    command(command: Command) {
        console.log("command", command)
        this.subject.next(command)
    }

    reset() { }
}
