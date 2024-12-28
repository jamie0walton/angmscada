import { Component, OnInit, OnDestroy, Input } from '@angular/core'
import { Config, ConfigSubject } from 'src/app/store/config'
import { Tag, TagSubject } from 'src/app/store/tag'
import { MsForm, FormSubject } from 'src/app/store/form'
import { CommandSubject } from 'src/app/store/command'
import { datestring, datetimestring, csvdatetimestring } from 'src/app/shared/datetime'

interface OpNote {
    id: number
    date_ms: number
    site: string
    by: string
    note: string
    abnormal: number
}

@Component({
    selector: 'app-opnotes',
    templateUrl: './opnotes.component.html',
    styleUrls: []
})
export class OpNotesComponent implements OnInit, OnDestroy {
    subs: any = []
    @Input() item: any
    config: Config
    tag: Tag
    show: OpNote[]
    site_groups: {name: string, sites: string[], checked: boolean}[]
    filter: {date: number, site: string, by: string, note: string, abnormal: number}
    form: MsForm.Form
    abnormal: boolean = false

    constructor(
        private configstore: ConfigSubject,
        private tagstore: TagSubject,
        private commandstore: CommandSubject,
        private formstore: FormSubject
    ) {
        this.config = this.configstore.get()
        this.tag = new Tag()
        this.show = []
        this.site_groups = []
        this.filter = {
            date: Number(Date.now()),
            site: this.config.site || '',
            by: '',
            note: '',
            abnormal: 0
        }
        this.form = new MsForm.Form()
   }

   filter_abnormal() {
       this.filter.abnormal = 1 - this.filter.abnormal
       this.updateshow()
   }

    downloadcsv() {
        /*
        15 Jul 2024, Excel is so broken, very hard to get a CSV to work.
        */
        // Make CSV
        let csv = 'id,date,site,by,note\n'
        for (let i = 0; i < this.show.length; i++) {
            const e = this.show[i]
            csv += e.id + ',' + csvdatetimestring(new Date(e.date_ms)) + ',' + e.site + ',' + e.by + ',"' + e.note.replace(/"/g, '""') + '"\n'
        }
        // Deliver CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'opnotes.csv'
        link.click()
        URL.revokeObjectURL(link.href)
    }

    updateage() {
        let requested_age = Date.now() - this.filter.date
        if (requested_age > this.tag.age_ms) {
            this.tag.age_ms = requested_age
            this.commandstore.command({
                type: 'rta',
                tagname: this.tag.name,
                value: {
                    action: 'BULK HISTORY',
                    date_ms: this.filter.date
                }
            })
        }
    }

    updatesitegroups() {
        for (let i = 0; i < this.site_groups.length; i++) {
            const group = this.site_groups[i]
            if (this.filter.site === '') {
                group.checked = false
                break
            }
            group.checked = true
            for (let j = 0; j < group.sites.length; j++) {
                const site = group.sites[j]
                if (site.search(this.filter.site) == -1) {
                    group.checked = false
                    break
                }
            }
        }
    }

    updateshow() {
        if(this.tag.value === null) {
            return
        }
        if (this.filter.site.length === 0 && this.filter.by.length === 0 && this.filter.note.length === 0 && this.filter.abnormal === 0) {
            this.show = this.tag.value
            this.abnormal = this.tag.value.some((note: OpNote) => note.abnormal === 1)
            return
        }
        this.show = []
        let dosite = this.filter.site.length > 0
        let doby = this.filter.by.length > 0
        let donote = this.filter.note.length > 0
        let doabnormal = this.filter.abnormal === 1
        let sitere: RegExp = new RegExp(this.filter.site, 'i')
        let byre: RegExp = new RegExp(this.filter.by, 'i')
        let notere: RegExp = new RegExp(this.filter.note, 'i')
        let abnormal = false
        for (let i = 0; i < this.tag.value.length; i++) {
            const e = this.tag.value[i]
            let note: OpNote = {
                id: e.id,
                date_ms: e.date_ms,
                site: e.site,
                by: e.by,
                note: e.note,
                abnormal: e.abnormal
            }
            let matches = true
            if (dosite && !sitere.test(e.site)) matches = false
            if (doby && !byre.test(e.by)) matches = false
            if (donote && !notere.test(e.note)) matches = false
            if (doabnormal && e.abnormal !== 1) matches = false
            if (matches) {
                this.show.push(note)
                if (e.abnormal === 1) abnormal = true
            }
        }
        this.abnormal = abnormal
    }

    checkbox(gid: number) {
        this.site_groups[gid].checked = !this.site_groups[gid].checked
        let glist: string[] = []
        for (let i = 0; i < this.site_groups.length; i++) {
            const group = this.site_groups[i]
            if (group.checked) {
                for (let j = 0; j < group.sites.length; j++) {
                    const site = group.sites[j]
                    glist.push(site)
                }
            }
        }
        if (glist.length > 0) {
            this.filter.site = glist.join('|')
        }
        else {
            this.filter.site = ''
        }
        this.updateshow()
    }

    formFilter() {
        // create the form controls
        let start = new MsForm.Control()
        start.name = 'start'
        start.inputtype = 'date'
        start.stringvalue = datestring(new Date(this.filter.date))
        let site = new MsForm.Control()
        site.name = 'site'
        site.inputtype = 'filter'
        site.options = this.item.config.site
        site.stringvalue = this.filter.site
        let by = new MsForm.Control()
        by.name = 'by'
        by.inputtype = 'filter'
        by.options = this.item.config.by
        by.stringvalue = this.filter.by
        let note = new MsForm.Control()
        note.name = 'note'
        note.inputtype = 'str'
        note.stringvalue = this.filter.note
        // TODO 
        // site.optionvalue = site.options.indexOf(this.filter.site)
        // setup the form
        this.form.requestid = 'opnotes filter'
        this.form.name = "Set Display Filter"
        this.form.delete = false
        this.form.controls = [start, site, by, note]
        this.formstore.pubFormOpts(this.form)
    }

    formFilterAction(cmd: MsForm.Close) {
        if (cmd.action == 'submit') {
            if (typeof(cmd.setvalue['start']) === 'number') {
                this.filter.date = cmd.setvalue['start']
                this.updateage()
            }
            if (typeof(cmd.setvalue['site']) === 'string') {
                this.filter.site = cmd.setvalue['site']
                this.updatesitegroups()
            }
            if (typeof(cmd.setvalue['by']) === 'string') {
                this.filter.by = cmd.setvalue['by']
            }
            if (typeof(cmd.setvalue['note']) === 'string') {
                this.filter.note = cmd.setvalue['note']
            }
            this.updateshow()
        }
    }

    formAdd(index: number) {
        // create the form controls
        let site = new MsForm.Control()
        site.name = 'site'
        site.inputtype = 'filter'
        site.options = this.item.config.site
        let by = new MsForm.Control()
        by.name = 'by'
        by.inputtype = 'filter'
        by.options = this.item.config.by
        let date_ms = new MsForm.Control()
        date_ms.name = 'date_ms'
        date_ms.inputtype = 'datetime'
        let note = new MsForm.Control()
        note.name = 'note'
        note.inputtype = 'textarea'
        let abnormal = new MsForm.Control()
        abnormal.name = 'abnormal'
        abnormal.inputtype = 'multi'
        abnormal.options = ['Normal', 'Abnormal']
        abnormal.optionvalue = 0
        // setup the form
        if(index === -1) {
            this.form.requestid = this.tag.name + " -1"
            this.form.name = "Add Note"
            this.form.delete = false
            site.stringvalue = "Select site"
            by.stringvalue = "Enter author"
            date_ms.stringvalue = datetimestring(new Date())
            note.stringvalue = "Describe"
            abnormal.numbervalue = 0
        }
        else {
            const editnote = this.show[index]
            this.form.requestid = this.tag.name + " " + editnote.id
            this.form.name = "Edit Note"
            this.form.delete = true
            site.stringvalue = editnote.site
            by.stringvalue = editnote.by
            date_ms.stringvalue = datetimestring(new Date(editnote.date_ms))
            note.stringvalue = editnote.note
            abnormal.numbervalue = editnote.abnormal
        }
        this.form.controls = [date_ms, site, by, note, abnormal]
        this.formstore.pubFormOpts(this.form)
    }

    formAddAction(cmd: MsForm.Close) {
        let editid: number | undefined = parseInt(cmd.requestid.substring(this.tag.name.length + 1))
        let action = 'MODIFY'
        if(editid === -1){
            editid = undefined
            action = 'ADD'
        }
        if(cmd.action === 'submit') {
            let date_ms = Date.now()
            if (cmd.setvalue['date_ms'] == cmd.setvalue['date_ms']) {
                date_ms = Number(cmd.setvalue['date_ms'])
            }
            this.commandstore.command({
                'type': 'rta',
                'tagname': '__opnotes__',
                'value': {
                    'action': action,
                    'id': editid,
                    'by': cmd.setvalue['by'],
                    'site': cmd.setvalue['site'],
                    'date_ms': date_ms,
                    'note': cmd.setvalue['note'],
                    'abnormal': cmd.setvalue['abnormal']
                }
            })
        }
        else if (cmd.action === 'delete'){
            this.commandstore.command({
                'type': 'rta',
                'tagname': '__opnotes__',
                'value': {
                    'action': 'DELETE',
                    'id': editid
                }
            })
        }
    }

    ngOnInit(): void {
        this.filter.date = Date.now() - (this.item.config?.filter?.age_d || 30) * 24 * 3600 * 1000
        // this.filter.sites = [] // [...this.item.config.site]
        const groups = Object.keys(this.item.config?.filter?.site_groups || [])
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i]
            this.site_groups.push({
                name: group,
                sites: this.item.config.filter.site_groups[group],
                checked: false
            })
        }
        this.updatesitegroups()
        this.subs.push(
            this.tagstore.subject('__opnotes__').asObservable().subscribe((tag: any) => {
                if (this.tag.id === null) {
                    this.tag = tag
                    this.updateage()
                }
                else {
                    this.tag.value = tag.value
                    this.tag.time_ms = tag.time_ms
                }
                this.updateshow()
            }),
            this.formstore.closesubject.asObservable().subscribe(cmd => {
                if (cmd.requestid.startsWith(this.tag.name)) {
                    this.formAddAction(cmd)
                }
                else if (cmd.requestid === 'opnotes filter') {
                    this.formFilterAction(cmd)
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
