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
    makeForm(file?: FileList) {
        let path: MsForm.Control = new MsForm.Control()
        let desc: MsForm.Control = new MsForm.Control()
        if(file === undefined) {
            this.form.description = 'Upload New File'
            path.inputtype = 'drag_n_drop'
            path.name = 'File'
            path.stringvalue = ''
            desc.inputtype = 'textarea'
            desc.name = 'Description'
            desc.stringvalue = 'Enter a description'
        }
        else {
            this.form.description = 'Edit Existing File'
            this.form.delete = true
            path.inputtype = 'description'
            path.name = 'File'
            path.stringvalue = file.path
            desc.inputtype = 'textarea'
            desc.name = 'Description'
            desc.stringvalue = file.desc
        }
        this.form.name = this.tag.name
        this.form.action = 'rqs'
        this.form.controls = [path, desc]
        this.showForm()
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
