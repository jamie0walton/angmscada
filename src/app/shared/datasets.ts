import { Tag, History } from '../store/tag'

function mergealigned(raw: (number|null)[][], sidx: number, traces: number, tuples: History) {
    if (raw.length == 1) {  // empty, just initialised, easy setup
        for (let i = 0; i < traces; i++) {
            raw.push([])
        }
        for (let i = 0; i < tuples.length; i++) {
            const time = tuples[i][0]
            const value = tuples[i][1]
            raw[0].push(time)
            for (let j = 1; j < traces + 1; j++) {
                raw[j].push(null)
            }
            raw[sidx + 1][i] = value
        }
    }
    else {  // must splice in data, harder
        for (let i = 0; i < tuples.length; i++) {
            const time = tuples[i][0]
            const value = tuples[i][1]
            let time_index = raw[0].length  // start at the end, FASTER
            while (true) {
                time_index --
                if (time_index < 0) {
                    raw[0].push(time)
                    for (let j = 1; j < traces + 1; j++) {
                        raw[j].push(null)
                    }
                    raw[sidx + 1][0] = value
                    break
                }
                else if (raw[0][time_index] as number == time) {  // at time so update
                    raw[sidx + 1][time_index] = value
                    break
                }
                else if (raw[0][time_index] as number < time) {  // jumped past so splice
                    time_index++
                    raw[0].splice(time_index, 0, time)
                    for (let j = 1; j < traces + 1; j++) {
                        raw[j].splice(time_index, 0, null)
                    }
                    raw[sidx + 1][time_index] = value
                    break
                }
            }
        }
    }
}

// Reformat mscada tag history into uplot AlignedData
export class DataSet {
    taglist: string[]
    tagtype: string[]
    tagvalue: (number|null)[]
    times: { [key: number]: (number | null)[] }
    rawfuture: (number|null)[][]
    raw: (number|null)[][]
    show: [number[], ...(number | null)[][]]
    history: Boolean[]
    duration: number
    extend: Boolean
    live: boolean
    updateshow: boolean

    constructor() {
        this.taglist = []
        this.tagtype = []
        this.tagvalue = []
        this.times = {}
        this.rawfuture = [[]]
        this.raw = [[]]
        this.show = [[]]
        this.history = []
        this.duration = 3600 * 4
        this.extend = false
        this.live = true
        this.updateshow = false
    }

    setduration(duration: number) {
        // Set duration in seconds.
        this.duration = duration
        this.updateshow = true
    }

    update() {
        let start_idx = this.raw[0].length - 1
        let start_time = this.raw[0][start_idx] as number - this.duration
        while (start_idx > 0 && this.raw[0][start_idx] as number > start_time) {
            start_idx--
        }
        this.show = [this.raw[0].slice(start_idx) as any]
        for (let series = 1; series < this.raw.length; series++) {
            this.show.push(this.raw[series].slice(start_idx) as any)
            if (this.extend){
                const seriesno = this.show.length - 1
                this.show[seriesno][this.show[seriesno].length - 1] = this.tagvalue[seriesno - 1]
            }
        }
    }

    addtag(tagname: string, type: string) {
        this.taglist.push(tagname)
        this.tagtype.push(type)
        if (type === 'default') {
            this.history.push(false)
        }
        this.tagvalue.push(null)
    }

    aslive(tag: Tag) {
        let sidx = this.taglist.indexOf(tag.name)
        this.tagvalue[sidx] = tag.value
        if (this.history.includes(false)) {
            // Initial history loading
            // dictionary then sort is a LOT faster than splicing into arrays
            this.updateshow = true
            if (!this.history[sidx]) {  // new history for this tag
                this.history[sidx] = true
                for (let index = 0; index < tag.history.length; index++) {
                    const time = Math.floor(tag.history[index][0]) / 1000
                    const value = tag.history[index][1]
                    if (!this.times.hasOwnProperty(time)) {
                        this.times[time] = Array(this.taglist.length).fill(null)
                    }
                    this.times[time][sidx] = value
                }
            }
            else {  // other tag changes while not all tags have the first load
                const time = Math.floor(tag.time_ms) / 1000
                if (!this.times.hasOwnProperty(time)) {
                    this.times[time] = Array(this.taglist.length).fill(null)
                }
                if (typeof tag.value === 'string') {
                    this.times[time][sidx] = null
                }
                else {
                    this.times[time][sidx] = tag.value
                }
            }
            if (!this.history.includes(false)) {  // finally when all received
                this.raw = [[]]
                for (let index = 0; index < this.taglist.length; index++) {
                    this.raw.push([])
                }
                let times = Object.keys(this.times).sort()
                for (let index = 0; index < times.length; index++) {
                    const time = parseFloat(times[index])
                    this.raw[0].push(time)
                    for (let index = 1; index < this.raw.length; index++) {
                        // const HACK: any = this.times[time][index - 1]
                        // this.raw[index].push(HACK)
                        let yValues = this.raw[index] as (number | null)[];
                        yValues.push(this.times[time][index - 1])
                    }
                }
            }
        }
        else {
            // Large data sets are finished, update _should_ be at the end
            // So splicing should be cheap
            if (this.live) {
                this.updateshow = true
            }
            const time = Math.floor(tag.time_ms / 100) / 10
            let value = tag.value
            mergealigned(this.raw, sidx, this.taglist.length, [[time, value]])
        }
    }

    asprofile(tag: Tag) {
        let sidx = this.taglist.indexOf(tag.name)
        this.tagvalue[sidx] = tag.value
        mergealigned(this.raw, sidx, this.taglist.length, tag.future)
        this.updateshow = true
    }

    addtagdata(tag: Tag) {
        if (tag.value != null && typeof tag.value === 'object') {
            this.asprofile(tag)
        }
        else {
            this.aslive(tag)
        }
    }
}
