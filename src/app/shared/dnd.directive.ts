import { Directive, Output, EventEmitter, HostListener, HostBinding } from '@angular/core'

@Directive({
    selector: '[appDnd]'
})
export class DndDirective {
    @Output() filesDropped = new EventEmitter<any>()
    @HostBinding('class.fileover') fileOver: boolean = false

    // otherwise opens the file in the browser instead of dropping in our component
    @HostListener('dragover', ['$event']) onDragOver(event: any) {
        event.preventDefault()
        event.stopPropagation()
        this.fileOver = true
    }

    @HostListener('dragleave', ['$event']) onDragLeave(event: any) {
        event.preventDefault()
        event.stopPropagation()
        this.fileOver = false
    }

    @HostListener('drop', ['$event']) public ondrop(event: any) {
        event.preventDefault()
        event.stopPropagation()
        this.fileOver = false
        if (event.dataTransfer.files.length > 0) {
            this.filesDropped.emit(event.dataTransfer.files)
        }
    }
}
