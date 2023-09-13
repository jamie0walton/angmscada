import { Component } from '@angular/core'
import { BaseFormComponent } from '../base/base.form.component'
import { MsForm } from 'src/app/store/form'


type FileList = {
    id: string
    path: string
    desc: string
    group: string
    mode: string
}

@Component({
    selector: 'app-files',
    templateUrl: './files.component.html',
    styleUrls: []
})
export class FilesComponent  extends BaseFormComponent {
    control: MsForm.Control

    constructor() {
        super()
        this.control = new MsForm.Control()
    }

    makeForm(file?: FileList) {
        let path: MsForm.Control
        let desc: MsForm.Control
        if(file === undefined) {
            this.form.name = 'Create New File'
            this.form.description = 'Form Description'
            this.form.requestid = ''
            this.form.delete = false
            path = new MsForm.Control()
            path.inputtype = 'drag_n_drop'
            path.name = 'File'
            path.stringvalue = ''
            desc = new MsForm.Control()
            desc.inputtype = 'textarea'
            desc.name = 'Description'
            desc.stringvalue = 'Enter a description'
        }
        else {
            this.form.name = 'Edit File Link'
            this.form.description = 'Form Description'
            this.form.requestid = file.id
            this.form.delete = true
            path = new MsForm.Control()
            path.inputtype = 'description'
            path.name = 'File'
            path.stringvalue = file.path
            desc = new MsForm.Control()
            desc.inputtype = 'textarea'
            desc.name = 'Description'
            desc.stringvalue = file.desc
        }
        this.showForm(this.tag.name, this.tag.desc, [path, desc])
        this.formstore.showForm(this.form)
    }

    // closeForm() {
    // }

    // ngOnInit() {
    //     this.subs.push(
    //         this.tagstore.subject(this.item.tagname).asObservable().subscribe((tag: any) => {
    //             if (this.tag.id === null) {
    //                 this.tag = tag
    //             }
    //             else {
    //                 this.tag.value = tag.value
    //                 this.tag.time_ms = tag.time_ms
    //             }
    //             this.tagAction()
    //         }),
    //         this.formstore.closesubject.asObservable().subscribe(cmd => {
    //         })
    //     )
    // }

    // ngOnDestroy() {
    //     for (let i = 0; i < this.subs.length; i++) {
    //         this.subs[i].unsubscribe()
    //     }
    // }
}
