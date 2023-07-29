import { Component } from '@angular/core'
import { BaseComponent } from 'src/app/components/base/base.component'

@Component({
    selector: 'app-desc-string-list',
    templateUrl: './desc-string-list.component.html'
})
export class DescStringListComponent extends BaseComponent {
    stringlist: [number, string][] = []

    _assign() {
        // this.stringlist = [...this.tag.stringhistory]
        // this.stringlist.sort((a, b) => {
        //     return b[0] - a[0]
        // })
        // console.log('updated list', this.stringlist)
    }

    get_stringlist() {
        if (this.stringlist.length > 0) {
            // if (this.tag.stringhistory.length > 0) {
            //     if (this.stringlist[0][0] != this.tag.stringhistory[this.tag.stringhistory.length - 1][0]) {
            //         this._assign()
            //     }
            // }
            // else {
            //     this._assign()
            // }
        }
        // else if (this.tag.stringhistory.length > 0) {
        //     this._assign()
        // }
        return this.stringlist
    }
}
