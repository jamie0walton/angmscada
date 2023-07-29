import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'app-icon',
    templateUrl: './icon.component.svg',
    styleUrls: []
})
export class IconComponent implements OnInit {
    @Input() icon: any
    @Input() width?: any
    @Input() height?: any

    ngOnInit(): void {
        if (typeof this.width != 'string') {
            this.width = '20'
        }
        if (typeof this.height != 'string') {
            this.height = '20'
        }
    }
}
