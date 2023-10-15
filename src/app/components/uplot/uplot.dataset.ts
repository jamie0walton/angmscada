import { inject } from '@angular/core'
import { Tag, TagSubject, History } from 'src/app//store/tag'
import { bisect } from 'src/app/shared/functions'
import uPlot from 'uplot'

interface TimeRange {
    now: boolean
    duration: number
    start: number
    end: number
    zoomed: boolean
    start_zoom: number
    end_zoom: number
}

class TimeRange implements TimeRange {
    constructor() {
        let now_sec = new Date().getTime() / 1000
        let duration_sec = 3600
        this.now = true
        this.duration = duration_sec
        this.start = now_sec - duration_sec
        this.end = now_sec
        this.zoomed = false
        this.start_zoom = 0
        this.end_zoom = 0
    }

    set_duration(duration_sec: number) {
        // duration might be shorter than displayed if end is future
        this.zoomed = false
        let now_sec = new Date().getTime() / 1000
        if (this.now) {
            this.duration = duration_sec
            this.start = now_sec - duration_sec
            this.end = now_sec
        }
        else {
            this.start = this.end - duration_sec
            this.duration = now_sec - this.start
        }
    }

    set_zoom(min: number, max: number) {
        if (min > this.start && max < this.end) {
            this.zoomed = true
            this.start_zoom = min
            this.end_zoom = max
        }
        else {
            this.zoomed = false
        }
    }

    update_time() {
        let now_sec = new Date().getTime() / 1000
        this.end = now_sec
        this.start = now_sec - this.duration
    }

    set_duration_string(duration_str: string) {
        // should be number ending with time units [mhdw], default is seconds
        let duration_sec = parseFloat(duration_str)
        switch (duration_str.slice(-1)) {
            case 'm':
                duration_sec *= 60
                break
            case 'h':
                duration_sec *= 3600
                break
            case 'd':
                duration_sec *= 86400
                break
            case 'w':
                duration_sec *= 604800
                break
        }
        this.set_duration(duration_sec)
    }

    check_zoom(min: number | undefined, max: number | undefined) {
        if (typeof(min) == 'number' && typeof(max) == 'number' && min > this.start && max < this.end) {
            this.start_zoom = min
            this.end_zoom = max
            this.zoomed = true
        }
        else {
            this.zoomed = false
        }
        console.log("time min "+ min + " max " + max + " zoomed " + this.zoomed)
    }
}

export class UplotDataSet {
    tagstore = inject(TagSubject)
    tags: Tag[]
    times: { [key: number]: (number | null)[] }
    raw: (number|null)[][]
    show: [number[], ...(number | null)[][]]
    last: { [key: number]: {
        start_sec: number
        end_sec: number
    }}
    updateshow: boolean
    time_range: TimeRange

    constructor() {
        this.tags = []
        this.times = {}
        this.last = {}
        this.raw = [[]]
        this.show = [[]]
        this.updateshow = false
        this.time_range = new TimeRange()
    }

    update_tag_age_ms() {
        // Set duration in seconds.
        let duration_ms = this.time_range.duration * 1000
        for (let index = 0; index < this.tags.length; index++) {
            const tag = this.tags[index]
            if(typeof(tag.id) === 'number') {
                if(this.tagstore.tag_by_id[tag.id].age_ms < duration_ms) {
                    this.tagstore.set_age_ms(tag.id, duration_ms)
                }
            }
        }
    }

    update_show() {
        let start_idx = bisect(this.raw[0] as number[], this.time_range.start)
        let show: any = []
        for (let i = 0; i < this.raw.length; i++) {
            const series = this.raw[i]
            show.push(series.slice(start_idx - 1))            
        }
        this.show = show
        this.updateshow = true
    }

    populate_raw() {
        this.raw = [[]]
        for (let index = 0; index < this.tags.length; index++) {
            this.raw.push([])
        }
        let times = Object.keys(this.times).sort()
        for (let index = 0; index < times.length; index++) {
            const time_ms = parseFloat(times[index])
            this.raw[0].push(time_ms / 1000)
            for (let index = 1; index < this.raw.length; index++) {
                // const HACK: any = this.times[time][index - 1]
                // this.raw[index].push(HACK)
                let yValues = this.raw[index] as (number | null)[];
                yValues.push(this.times[time_ms][index - 1])
            }
        }
        this.update_show()
    }

    private add_to_times(index: number, history: History) {
        for (let j = 0; j < history.length; j++) {
            const record = history[j]
            this.times[record[0]] ??= Array(this.tags.length).fill(null)
            this.times[record[0]][index] = record[1]
        }
    }

    add_tag_history(tag: Tag) {
        // Any time that tag value or history changes
        if (tag.id === null) {return}
        let tagid = tag.id
        const newtimes = tag.history.filter(record => record[0] < this.last[tagid].start_sec || record[0] > this.last[tagid].end_sec)
        this.add_to_times(this.tags.indexOf(tag), newtimes)
        this.populate_raw()
    }

    add_tagname(tag: Tag) {
        this.tags.push(tag)
    }

    init() {
        this.update_tag_age_ms()
        // Call once with all the tags required.
        for (let i = 0; i < this.tags.length; i++) {
            const tag = this.tags[i]
            if (tag.id === null) {return}
            this.last[tag.id] = {
                start_sec: tag.history[0][0] / 1000,
                end_sec: tag.history[tag.history.length - 1][0] / 1000
            }
            this.add_to_times(i, tag.history)
        }
        this.populate_raw()
    }
}