import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'

export interface SendFile {
    action: string
    file: File
    progress: number
}

@Injectable({
    providedIn: 'root'
})
export class SendFileSubject {
    subject: BehaviorSubject<SendFile[]>
    files: SendFile[]

    constructor() {
        this.files = []
        this.subject = new BehaviorSubject<SendFile[]>(this.files)
    }

    uploadfile(sendfile: SendFile) {
        this.files.push(sendfile)
        this.subject.next(this.files)
    }

    update(i: number, newstr: string) {
        this.files[i].action = newstr
        this.subject.next(this.files)
    }

    fromWs(data: any) {
        let hi = 5
    }
}
