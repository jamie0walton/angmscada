import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'

export interface Command {
    type: string
    tagname: string
    value: any
}

// export interface OpCommand {
//     type: string
//     action: string
//     id: number | undefined
//     by?: string
//     site?: string
//     date?: number
//     note?: string
// }

@Injectable({
    providedIn: 'root'
})
export class CommandSubject {
    subject: Subject<Command> // | OpCommand>

    constructor() {
        this.subject = new Subject<Command>() //  | OpCommand>()
    }

    command(command: Command) { //} | OpCommand) {
        console.log("command", command)
        this.subject.next(command)
    }

    reset() { }
}
