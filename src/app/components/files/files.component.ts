import { Component, OnDestroy, OnInit, Input, inject } from '@angular/core'
// import { FormSubject, MsForm } from 'src/app/store/form'
import { Tag, TagSubject } from 'src/app/store/tag'


type File = {
    type: string
    wide: boolean
    path: string
    name: string
    desc: string
    mode: string
}

@Component({
    selector: 'app-files',
    templateUrl: './files.component.html',
    styleUrls: []
})
export class FilesComponent implements OnInit, OnDestroy {
    tagstore: TagSubject = inject(TagSubject)
    @Input() item: any
    subs: any
    tag: Tag
    files: File[] = []
    filter: {path: string} = {path: ''}

    constructor() {
        this.subs = []
        this.tag = new Tag()
    }

    showForm(_?: any) {
        return
    }

    tagAction() {
        this.files = []
        let filere: RegExp = new RegExp(this.filter.path, 'i')
        let last = ''
        for (let i = 0; i < this.tag.value.dat.length; i++) {
            const element = this.tag.value.dat[i]
            if (!filere.test(element.path)) {
                continue
            }
            if (last != element.path) {
                this.files.push({
                    type: 'h3',
                    wide: true,
                    path: element.path,
                    name: '',
                    desc: '',
                    mode: ''
                })
                last = element.path
            }
            let desc = element.desc
            if (desc.length === 0) {
                desc = element.name
            }
            this.files.push({
                type: 'link',
                wide: false,
                path: element.path,
                name: element.name,
                desc: desc,
                mode: element.mode
            })
        }
    }

    ngOnInit() {
        if (this.item.config.hasOwnProperty('filter')) {
            this.filter.path = this.item.config.filter
        }
        this.subs.push(
            this.tagstore.subject('__files__').asObservable().subscribe((tag: any) => {
                if (this.tag.id === null) {
                    this.tag = tag
                }
                else {
                    this.tag.value = tag.value
                    this.tag.time_ms = tag.time_ms
                }
                this.tagAction()
            })
        )
    }

    ngOnDestroy() {
        for (let i = 0; i < this.subs.length; i++) {
            this.subs[i].unsubscribe()
        }
    }
    // makeForm(file?: FileList) {
    //     let path: MsForm.Control = new MsForm.Control()
    //     let desc: MsForm.Control = new MsForm.Control()
    //     if(file === undefined) {
    //         this.form.description = 'Upload New File'
    //         path.inputtype = 'drag_n_drop'
    //         path.name = 'File'
    //         path.stringvalue = ''
    //         desc.inputtype = 'textarea'
    //         desc.name = 'Description'
    //         desc.stringvalue = 'Enter a description'
    //     }
    //     else {
    //         this.form.description = 'Edit Existing File'
    //         this.form.delete = true
    //         path.inputtype = 'description'
    //         path.name = 'File'
    //         path.stringvalue = file.path
    //         desc.inputtype = 'textarea'
    //         desc.name = 'Description'
    //         desc.stringvalue = file.desc
    //     }
    //     this.form.name = this.tag.name
    //     this.form.action = 'rta'
    //     this.form.controls = [path, desc]
    //     this.showForm()
    // }

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
