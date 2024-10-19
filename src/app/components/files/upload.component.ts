import { Component, OnInit, OnDestroy, Input } from '@angular/core'
import { SendFile, SendFileSubject } from 'src/app/store/sendfile'

@Component({
    selector: 'app-upload',
    templateUrl: './upload.component.html',
    styleUrls: []
})
export class UploadComponent implements OnInit, OnDestroy {
    subs: any = []
    @Input() item: any
    files: any[] = []

    constructor(
        private sendfilestore: SendFileSubject
    ) { }

    prepareFilesList(files: any ) {  // Array<any>) {
        for (const file of files) {
            let send: SendFile = {
                action: 'upload',
                file: file,
                progress: 0.0
            }
            this.sendfilestore.uploadfile(send)
        }
    }

    deleteFile(index: number) {
        this.files.splice(index, 1);
    }

    onFilesDropped(event: string ) { //File[]) {
        this.prepareFilesList(event);
    }

    onFilesBrowsed(event: any) {
        this.prepareFilesList(event.target.files);
    }

    ngOnInit(): void {
    }

    ngOnDestroy() {
        for (let i = 0; i < this.subs.length; i++) {
            this.subs[i].unsubscribe()
        }
    }
}
