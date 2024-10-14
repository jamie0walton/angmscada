import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core'
import { Tag, TagSubject } from 'src/app/store/tag'

@Component({ template: "" })
export abstract class BaseComponent implements OnInit, OnDestroy {
    protected tagstore: TagSubject = inject(TagSubject)
    @Input() item: any
    protected subs: any[]
    protected tag: Tag

    constructor() {
        this.subs = []
        this.tag = new Tag()
    }

    // Optional method with empty default implementation
    protected tagAction(): void {
        // Default empty implementation
    }

    ngOnInit() {
        this.subs.push(
            this.tagstore.subject(this.item.tagname).asObservable().subscribe((tag: any) => {
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
}
