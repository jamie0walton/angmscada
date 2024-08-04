import { Component, OnInit, OnDestroy, Input } from '@angular/core'
import { Config, ConfigSubject } from 'src/app/store/config'
import { Tag, TagSubject } from 'src/app/store/tag'
import { MsForm, FormSubject } from 'src/app/store/form'
import { CommandSubject } from 'src/app/store/command'

interface OpNote {
    id: number
    date_ms: number
    site: string
    by: string
    note: string
}

function pad(number: number) {
    if (number < 10) {
        return '0' + number;
    }
    return number;
}

function datestring(d: Date) {
    // new Date().toISOString().substring(0, 16),
    let now = d.getFullYear() +
        '-' + pad(d.getMonth() + 1) +
        '-' + pad(d.getDate())
    return now
}

function datetimestring(d: Date) {
    // new Date().toISOString().substring(0, 16),
    let now = d.getFullYear() +
        '-' + pad(d.getMonth() + 1) +
        '-' + pad(d.getDate()) +
        'T' + pad(d.getHours()) +
        ':' + pad(d.getMinutes()) +
        ':' + pad(d.getSeconds())
    return now
}

function csvdatetimestring(d: Date) {
    // new Date().toISOString().substring(0, 16),
    let now = pad(d.getDate()) +
        '/' + pad(d.getMonth() + 1) +
        '/' + d.getFullYear() +
        ' ' + pad(d.getHours()) +
        ':' + pad(d.getMinutes()) +
        ':' + pad(d.getSeconds())
    return now
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
    filter: {date: number, site: string, note: string}
    form: MsForm.Form

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
            note: ''
        }
        this.form = new MsForm.Form()
   }

    downloadcsv() {
        /*
        15 Jul 2024, Excel is so broken, very hard to get a CSV to work.
        */
        let csv = 'id,date,site,by,note\n'
        for (let i = 0; i < this.show.length; i++) {
            const e = this.show[i]
            csv += e.id + ',' + csvdatetimestring(new Date(e.date_ms)) + ',' + e.site + ',' + e.by + ',"' + e.note.replace(/"/g, '""') + '"\n'
        }
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
        if (this.filter.site.length === 0 && this.filter.note.length === 0) {
            this.show = this.tag.value
            return
        }
        this.show = []
        let dosite = false
        let sitere: RegExp = new RegExp(this.filter.site, 'i')
        if (this.filter.site.length > 0) {dosite = true}
        let donote = false
        let notere: RegExp = new RegExp(this.filter.note, 'i')
        if (this.filter.note.length > 0) {donote = true}
        for (let i = 0; i < this.tag.value.length; i++) {
            const e = this.tag.value[i]
            let note: OpNote = {
                id: e.id,
                date_ms: e.date_ms,
                site: e.site,
                by: e.by,
                note: e.note
            }
            if (dosite && donote) {
                if (sitere.test(e.site) && notere.test(e.note)) {
                    this.show.push(note)
                }
            }
            else if (dosite) {
                if (sitere.test(e.site)) {
                    this.show.push(note)
                }
            }
            else if (donote) {
                if (notere.test(e.note)) {
                    this.show.push(note)
                }
            }
        }
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
        this.form.controls = [start, site, note]
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
        // setup the form
        if(index === -1) {
            this.form.requestid = this.tag.name + " -1"
            this.form.name = "Add Note"
            this.form.delete = false
            site.stringvalue = "Select site"
            by.stringvalue = "Enter author"
            date_ms.stringvalue = datetimestring(new Date())
            note.stringvalue = "Describe"
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
        }
        this.form.controls = [date_ms, site, by, note]
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
                    'note': cmd.setvalue['note']
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
        const groups = Object.keys(this.item.config?.filter?.site_groups)
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
