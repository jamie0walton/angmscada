import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core'
import { Tag, TagSubject } from 'src/app/store/tag'

@Component({ template: "" })
export class BaseComponent implements OnInit, OnDestroy {
    tagstore: TagSubject = inject(TagSubject)
    @Input() item: any
    subs: any
    tag: Tag

    constructor() {
        this.subs = []
        this.tag = new Tag()
    }

    tagAction() { /* Intended to be overridden. */ }

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
