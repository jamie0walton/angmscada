import { Component, OnInit, OnDestroy, Input } from '@angular/core'
import { ConfigSubject, Config } from 'src/app/store/config'
import { AlarmSubject, Alarm } from 'src/app/store/alarms'
import { FormSubject, MsForm } from 'src/app/store/form'
import { datestring, datetimestring, csvdatetimestring } from 'src/app/shared/datetime'

@Component({
    selector: 'app-alarms',
    templateUrl: './alarms.component.html',
    styleUrls: []
})
export class AlarmsComponent implements OnInit, OnDestroy {
    subs: any = []
    @Input() item: any
    config: Config
    alarms: Alarm[]
    show: Alarm[]
    filter: {
        date: number, 
        tag_alm: string,
        kind_ALM: number,
        kind_RTN: number,
        kind_ACT: number,
        kind_INF: number,
        desc: string,
        in_alm: boolean
    }
    form: MsForm.Form

    constructor(
        private configstore: ConfigSubject,
        private alarmstore: AlarmSubject,
        private formstore: FormSubject
    ) {
        this.config = this.configstore.get()
        this.alarms = []
        this.show = []
        this.filter = {
            date: Number(Date.now()),
            tag_alm: '',
            kind_ALM: 0,
            kind_RTN: 0,
            kind_ACT: 0,
            kind_INF: 0,
            desc: '',
            in_alm: false
        }
        this.form = new MsForm.Form()
   }

    downloadcsv() {
        /*
        15 Jul 2024, Excel is so broken, very hard to get a CSV to work.
        */
        // Make CSV
        let csv = 'id,date,tagname,kind,desc\n'
        for (let i = 0; i < this.show.length; i++) {
            const e = this.show[i]
            csv += e.id + ',' + csvdatetimestring(new Date(e.date_ms)) + ',' + e.tag_alm + ',' + ['Alarm', 'Return to Normal', 'Action', 'Information'][e.kind] + ',"' + e.desc.replace(/"/g, '""') + '"\n'
        }
        // Deliver CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'alarms.csv'
        link.click()
        URL.revokeObjectURL(link.href)
    }

    filter_in_alm() {
        this.filter.in_alm = !this.filter.in_alm
        this.updateshow()
    }

    updateshow() {
        if(this.alarms.length === 0) {
            return
        }
        let filter_kind = (this.filter.kind_ALM + this.filter.kind_RTN + this.filter.kind_ACT + this.filter.kind_INF) > 0 ? true : false
        if (this.filter.tag_alm.length === 0 && 
            !filter_kind && 
            this.filter.desc.length === 0 &&
            !this.filter.in_alm) {
            this.show = this.alarms
            return
        }
        this.show = []
        let dotagname = this.filter.tag_alm.length > 0
        let dodesc = this.filter.desc.length > 0
        let tagnamere: RegExp = new RegExp(this.filter.tag_alm, 'i')
        let descre: RegExp = new RegExp(this.filter.desc, 'i')
        for (let i = 0; i < this.alarms.length; i++) {
            const e = this.alarms[i]
            let note: Alarm = {
                id: e.id,
                date_ms: e.date_ms,
                tag_alm: e.tag_alm,
                kind: e.kind,
                desc: e.desc,
                in_alm: e.in_alm
            }
            let matches = true
            if (dotagname && !tagnamere.test(e.tag_alm)) matches = false
            if (filter_kind) {
                if (this.filter.kind_ALM == 0 && e.kind == 0 ||
                    this.filter.kind_RTN == 0 && e.kind == 1 ||
                    this.filter.kind_ACT == 0 && e.kind == 2 ||
                    this.filter.kind_INF == 0 && e.kind == 3)
                    matches = false
            }
            if (dodesc && !descre.test(e.desc)) matches = false
            if (matches) {
                if (this.filter.in_alm && !e.in_alm) {
                    matches = false
                }
                if (matches) {
                    this.show.push(note)
                }
            }
        }
    }

    formFilter() {
        let start = new MsForm.Control()
        start.name = 'start'
        start.inputtype = 'date'
        start.stringvalue = datestring(new Date(this.filter.date))

        let tag_alm = new MsForm.Control()
        tag_alm.name = 'tagname'
        tag_alm.inputtype = 'filter'
        tag_alm.stringvalue = this.filter.tag_alm

        let alm = new MsForm.Control()
        alm.name = 'Alarm'
        alm.inputtype = 'checkbox'
        alm.numbervalue = this.filter.kind_ALM

        let rtn = new MsForm.Control()
        rtn.name = 'Return to Normal'
        rtn.inputtype = 'checkbox'
        rtn.numbervalue = this.filter.kind_RTN

        let act = new MsForm.Control()
        act.name = 'Action'
        act.inputtype = 'checkbox'
        act.numbervalue = this.filter.kind_ACT

        let inf = new MsForm.Control()
        inf.name = 'Information'
        inf.inputtype = 'checkbox'
        inf.numbervalue = this.filter.kind_INF

        let desc = new MsForm.Control()
        desc.name = 'description'
        desc.inputtype = 'str'
        desc.stringvalue = this.filter.desc

        this.form.requestid = 'alarms filter'
        this.form.name = "Set Display Filter"
        this.form.delete = false
        this.form.controls = [start, tag_alm, alm, rtn, act, inf, desc]
        this.formstore.pubFormOpts(this.form)
    }

    formFilterAction(cmd: MsForm.Close) {
        if (cmd.action == 'submit') {
            if (typeof(cmd.setvalue['start']) === 'number') {
                this.filter.date = cmd.setvalue['start']
                this.alarmstore.request_history(this.filter.date)
            }
            if (typeof(cmd.setvalue['tag_alm']) === 'string') {
                this.filter.tag_alm = cmd.setvalue['tag_alm']
            }
            if (typeof(cmd.setvalue['Alarm']) === 'number') {
                this.filter.kind_ALM = cmd.setvalue['Alarm']
            }
            if (typeof(cmd.setvalue['Return to Normal']) === 'number') {
                this.filter.kind_RTN = cmd.setvalue['Return to Normal']
            }
            if (typeof(cmd.setvalue['Action']) === 'number') {
                this.filter.kind_ACT = cmd.setvalue['Action']
            }
            if (typeof(cmd.setvalue['Information']) === 'number') {
                this.filter.kind_INF = cmd.setvalue['Information']
            }
            if (typeof(cmd.setvalue['desc']) === 'string') {
                this.filter.desc = cmd.setvalue['desc']
            }
            this.updateshow()
        }
    }

    ngOnInit(): void {
        if (this.item.config?.age_d) {
            this.alarmstore.set_age_d(this.item.config.age_d)
        }
        this.filter.date = Date.now() - this.alarmstore.age_d * 86400000
        this.subs.push(
            this.alarmstore.subject.asObservable().subscribe((alarms: any) => {
                this.alarms = alarms
                this.updateshow()
            }),
            this.formstore.closesubject.asObservable().subscribe(cmd => {
                if (cmd.requestid.startsWith('alarms filter')) {
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
