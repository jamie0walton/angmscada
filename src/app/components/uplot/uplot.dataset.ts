import { inject } from '@angular/core'
import { Tag, TagSubject } from 'src/app/store/tag'
import { bisect } from 'src/app/shared/functions'

export class UplotDataSet {
    tagstore = inject(TagSubject)
    tags: Tag[]
    times_ms: { [key: number]: (number | null)[] }
    raw: (number|null)[][]
    show: [number[], ...(number | null)[][]]
    last: { [key: number]: {
        start_ms: number
        end_ms: number
    }}
    seen: { [key: string]: number }
    updateshow: boolean
    now: boolean
    duration: number
    start: number
    end: number
    zoomed: boolean
    start_zoom: number
    end_zoom: number

    constructor() {
        this.tags = []
        this.times_ms = {}
        this.seen = {}
        this.last = {}
        this.raw = [[]]
        this.show = [[]]
        this.updateshow = false
        // These are timerange attributes
        let now_sec = new Date().getTime() / 1000
        let duration_sec = 0  // start at zero, will change
        this.now = true
        this.duration = duration_sec
        this.start = now_sec - duration_sec
        this.end = now_sec
        this.zoomed = false
        this.start_zoom = 0
        this.end_zoom = 0
    }

    /**
     * Sets plot duration in seconds, updates dataset tag.age_ms as well.
     * */
    set_duration(duration_sec: number) {
        this.zoomed = false
        // set the duration
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
        // make sure the tags know to request long enough history
        let duration_ms = this.duration * 1000
        for (let index = 0; index < this.tags.length; index++) {
            const tag = this.tags[index]
            if(typeof(tag.id) === 'number') {
                if(this.tagstore.tag_by_id[tag.id].age_ms < duration_ms) {
                    this.tagstore.set_age_ms(tag.id, duration_ms)
                }
            }
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

    /**
     * updates end to now and start based on duration.
     */
    update_time() {
        let now_sec = new Date().getTime() / 1000
        this.end = now_sec
        this.start = now_sec - this.duration
    }

    /**
     * Sets plot duration, updates dataset tag.age_ms as well.
     * 
     * @param duration_str number then time units [mhdw], seconds by default.
     * */
    set_duration_string(duration_str: string) {
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

    /**
     * Work out if the plot is zoomed, set zoomed.
     */
    check_zoom(min: number | undefined, max: number | undefined) {
        if (typeof(min) == 'number' && typeof(max) == 'number' && min > this.start && max < this.end) {
            this.start_zoom = min
            this.end_zoom = max
            this.zoomed = true
        }
        else {
            this.zoomed = false
        }
        // console.log("time min "+ min + " max " + max + " zoomed " + this.zoomed)
    }

    now_show() {
        const tag_count = this.tags.length
        this.show = [[]]
        this.tags.forEach(() => this.show.push([]))
        let times_ms = Object.keys(this.times_ms).sort().map(parseFloat)
        for (let i = 0; i < times_ms.length; i++) {
            const time_ms = times_ms[i]
            this.show[0].push(time_ms / 1000)
            for (let j = 0; j < tag_count; j++) {
                let yValue = this.show[j + 1] as (number | null)[]
                yValue.push(this.times_ms[time_ms][j])
            }
        }
        this.updateshow = true
    }

    /**
     * Add tag values to times_ms dict. Only add tag.history if the
     * tag has not been seen or if the history now has an earlier start.
     */
    add_tag_value(tag: Tag) {
        const tag_idx = this.tags.indexOf(tag)
        const tag_count = this.tags.length
        if (!this.seen.hasOwnProperty(tag.name) || this.seen[tag.name] !== tag.history.times_ms[0]) {
            this.seen[tag.name] = tag.history.times_ms[0]
            for (let i = 0; i < tag.history.times_ms.length; i++) {
                const time_ms = tag.history.times_ms[i]
                const value = tag.history.values[i]
                this.times_ms[time_ms] ??= Array(tag_count).fill(null)
                this.times_ms[time_ms][tag_idx] = value
            }
        }
        this.times_ms[tag.time_ms] ??= Array(tag_count).fill(null)
        this.times_ms[tag.time_ms][tag_idx] = tag.value
        this.now_show()
    }

    /**
     * Initialise (or reinitialise) the times_ms dict and the show array
     * passed to uplot.
     */
    initialise(tags: Tag[]) {
        this.tags = tags
        this.times_ms = {}
        for (let i = 0; i < tags.length; i++) {
            const tag = tags[i]
            this.add_tag_value(tag)
        }
        this.show = [[]]
        this.now_show()
    }
}