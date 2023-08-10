import { Component, OnInit, OnDestroy, Input } from '@angular/core'
import { Tag, TagSubject } from 'src/app/store/tag'
import { MsForm, FormSubject } from 'src/app/store/form'


const COLSSTR = ["device", "tag_name", "tag_desc", "point_id"] as const
const COLSLIST = ["construct"] as const
const COLS = [...COLSSTR, ...COLSLIST] as const

type Record = { [key in typeof COLS[number]]:
    key extends typeof COLSSTR[number] ? string : string[] }
type Filter = { [key in typeof COLSSTR[number]]: string }
type Options = { [key in typeof COLSSTR[number]]: Set<string> }

@Component({
    selector: 'app-drawings',
    templateUrl: './drawings.component.html'
})
export class DrawingsComponent implements OnInit, OnDestroy {
    subs: any = []
    @Input() item: any
    tag: Tag
    display: string
    fields = COLSSTR
    lists = COLSLIST
    cols = COLS
    options: Options
    filter: Filter
    rawrecords: Record[]
    records: Record[]
    filterform: MsForm.Form

    constructor(
        private tagstore: TagSubject,
        private formstore: FormSubject
    ) {
        this.tag = new Tag()
        this.display = "none"
        let f: any = {}
        let o: any = {}
        COLSSTR.forEach((e: any) => {
            f[e] = ""
            o[e] = new Set()
        })
        this.filter = f
        this.options = o
        this.rawrecords = []
        this.records = []
        this.filterform = new MsForm.Form()
        this.filterform.requestid = 'drawings'
        this.filterform.name = 'Drawing List'
        this.filterform.description = 'Filter'
    }

    showFilter() {
        let controls: MsForm.Control[] = []
        for (let i = 0; i < this.fields.length; i++) {
            const element = this.fields[i]
            let control = new MsForm.Control()
            control.inputtype = 'filter'
            control.name = element
            control.options = [...this.options[element]]
            control.stringvalue = this.filter[element]
            controls.push(control)
        }
        this.filterform.controls = controls
        this.formstore.showForm(this.filterform)
    }

    closeForm() {
        let filter_clear = true
        for (let i = 0; i < COLSSTR.length; i++) {
            const f = COLSSTR[i]
            if (this.filter[f].length > 0) {
                filter_clear = false
            }
        }
        if (filter_clear) {
            this.records = this.rawrecords
            return
        }
        else {
            this.records = []
        }
        for (let i = 0; i < this.rawrecords.length; i++) {
            const rec = this.rawrecords[i]
            let add = true
            for (let j = 0; j < COLSSTR.length; j++) {
                const test: string = this.filter[COLSSTR[j]].toLowerCase()
                const field: string = rec[COLSSTR[j]].toLowerCase()
                if (test.length) {
                    if (test[0] == '\*') {
                        if (!field.includes(test.slice(1))) {
                            add = false
                        }
                    }
                    else {
                        if (!field.startsWith(test)) {
                            add = false
                        }
                    }
                }
            }
            if (add) {
                this.records.push(rec)
            }
        }
    }

    find_options() {
        // find a set of filter pre-fixes for each column
        for (let c of COLSSTR) {
            let maxletters = 10
            for (let i = 0; i < this.rawrecords.length; i++) {
                const e = this.rawrecords[i]
                this.options[c].add(e[c].slice(0, maxletters))
                if (this.options[c].size > 31) {
                    let replace: Set<string> = new Set()
                    maxletters -= 1
                    for (let item of this.options[c]) {
                        replace.add(item.slice(0, maxletters))
                    }
                    this.options[c] = replace
                }
            }
        }
    }

    load(data: any) {
        let headidx: any = {}
        for (let i = 0; i < COLS.length; i++) {
            headidx[COLS[i]] = data[0].indexOf(COLS[i])
        }
        for (let i = 1; i < data.length; i++) {
            const e = data[i]
            let rec: any = {}
            for (let j = 0; j < COLSSTR.length; j++) {
                if (headidx[COLSSTR[j]] == -1) {
                    rec[COLSSTR[j]] = ''
                }
                else {
                    rec[COLSSTR[j]] = e[headidx[COLSSTR[j]]]
                }
            }
            for (let j = 0; j < COLSLIST.length; j++) {
                if (headidx[COLSLIST[j]] == -1) {
                    rec[COLSLIST[j]] = []
                }
                else {
                    rec[COLSLIST[j]] = e[headidx[COLSLIST[j]]].split(' ')
                }
            }
            this.rawrecords.push(rec)
        }
        this.find_options()
        this.records = this.rawrecords  // Don't modify records :)
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
                this.load(tag.value)
            }),
            this.formstore.closesubject.asObservable().subscribe(cmd => {
                if (cmd.requestid !== this.filterform.requestid) {
                    return
                }
                if (cmd.action === 'submit') {
                    this.filter = cmd.setvalue as any
                    this.closeForm()
                }
            })
        )
    }

    ngOnDestroy() {
        for (let i = 0; i < this.subs.length; i++) {
            this.subs[i].unsubscribe()
        }
    }
}
