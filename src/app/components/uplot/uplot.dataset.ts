import { inject } from '@angular/core'
import { Tag, TagSubject } from 'src/app/store/tag'
import { bisect } from 'src/app/shared/functions'

export class UplotDataSet {
    tagstore = inject(TagSubject)
    tags: Tag[]
    times_ms: { [key: number]: (number | null)[] }
    raw: (number|null)[][]
    show: [number[], ...(number | null)[][]]
    updateshow: boolean
    duration: number
    axes: { [key: string]: {
        configrange: [number, number]
        range: [number, number]
        zoomrange: [number, number]
        reset: boolean
    }}
    received_new_data: boolean
    real_time: boolean
    reset_scales: boolean
    age: number
    future: number

    constructor() {
        this.tags = []
        this.times_ms = {}
        this.raw = [[]]
        this.show = [[]]
        this.updateshow = false
        this.duration = 0
        this.axes = {}
        this.received_new_data = false
        this.real_time = true
        this.reset_scales = true
        this.age = 0
        this.future = 0
    }

    /**
     * Sets plot duration in seconds, updates dataset tag.age_ms as well.
     * */
    set_duration(duration: number|[number, number]) {
        if (typeof(duration) == 'number') {
            this.age = -duration
        }
        else if (Array.isArray(duration) && typeof(duration[0]) == 'number' && typeof(duration[0]) == 'number') {
            this.age = -duration[0]
            this.future = duration[1]
        }
        this.duration = this.age + this.future
        let now_sec = new Date().getTime() /1000
        let range: [number, number] = [now_sec - this.age, now_sec + this.future] 
        this.axes['x'] = {
            configrange: [...range],
            range: [...range],
            zoomrange: [...range],
            reset: true
        }
        for (let index = 0; index < this.tags.length; index++) {
            const tag = this.tags[index]
            if(typeof(tag.id) === 'number') {
                this.tagstore.set_age_ms(tag.id, this.age * 1000, this.future * 1000)
            }
        }
        this.updateshow = true
    }

    /**
     * Sets plot duration with time units [mhdw], seconds is none.
     * */
    set_duration_string(duration_str: string) {
        let duration_sec = parseFloat(duration_str)
        switch (duration_str.slice(-1)) {
            case 'm':
                duration_sec *= -60
                break
            case 'h':
                duration_sec *= -3600
                break
            case 'd':
                duration_sec *= -86400
                break
            case 'w':
                duration_sec *= -604800
                break
        }
        this.set_duration(duration_sec)
    }

    /**
     * Steps time with clock, or sets a fixed range.
     */
    step_x_axis(range?: [number, number]) {
        // console.log('step_x_axis ' + range)
        if (range) {
            this.axes['x'].range = range
        }
        else {
            const now_sec = new Date().getTime() / 1000
            this.axes['x'].range = [now_sec - this.age, now_sec + this.future]
        }
    }

    /**
     * If null, requesting current range, otherwize zooming.
     * Might zoom to full range, in which case unzoom.
     * Follow now if current and zoomed.
     */
    zoom_x(range: [number|null, number|null]): [number, number] {
        const x_axis = this.axes['x']
        if (x_axis.reset) {  // double-click set the reset
            this.real_time = true
            x_axis.reset = false
            x_axis.zoomrange[0] = x_axis.range[0]
            x_axis.zoomrange[1] = x_axis.range[1]
        }
        else if (typeof range[0] === 'number' && typeof range[1] === 'number') {
            if (range[1] !== x_axis.zoomrange[1]) {
                this.real_time = false
            }
            if (this.real_time) {
                x_axis.zoomrange[0] = x_axis.range[1] - (range[1] - range[0])
                x_axis.zoomrange[1] = x_axis.range[1]
            }
            else {
                x_axis.zoomrange[0] = range[0]
                x_axis.zoomrange[1] = range[1]
            }
        }
        else {
            console.log("don't expect to get here")
        }
        return x_axis.zoomrange
    }

    /**
     * Set the Y axes default ranges.
     */
    set_yaxes(axis: string, range: [number, number]) {
        console.log('set_yaxes set default ' + axis + ' ' + range)
        this.axes[axis] = {
            configrange: [...range],
            range: [...range],  // must copy the array
            zoomrange: [...range],
            reset: true
        }
    }

    /**
     * If null, requesting current range, otherwize zooming.
     * Might zoom to full range, in which case unzoom.
     */
    zoom_y(axis: string, range: [number|undefined, number|undefined]): [number, number] {
        // console.log('zoom_y ' + axis + ' ' + range[0] + ' ' + range[1])
        const y_axis = this.axes[axis]
        if (y_axis.reset) {
            y_axis.reset = false
            y_axis.zoomrange[0] = y_axis.range[0]
            y_axis.zoomrange[1] = y_axis.range[1]
        }
        else if (typeof range[0] === 'number' && typeof range[1] === 'number') {
            y_axis.zoomrange[1] = range[1]
            y_axis.zoomrange[0] = range[0]
        }
        return y_axis.zoomrange
    }

    /**
     * Expensive, creates entire array of arrays from scratch
     */
    populate_show() {
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
     * Cheaper, appends new values. If needed splices will be close to
     * the latest time so the short end may be moved.
     */
    extend_show(tag_idx: number, time_ms: number, value: number) {
        const tag_count = this.tags.length
        let insert_pos = bisect(this.show[0], time_ms)
        if (insert_pos < this.show[0].length) {
            if (this.show[0][insert_pos] === time_ms) {
                // tag values are sometimes set at the same time
                this.show[tag_idx + 1][insert_pos] = value
            }
            else {
                // values _may_ arrive out of time order
                this.show[0].splice(insert_pos, 0, time_ms)
                for (let i = 1; i < this.show.length; i++) {
                    this.show[i].splice(insert_pos, 0, null)
                }
                this.show[tag_idx + 1][insert_pos] = value
            }
        }
        else {
            // likeliest, in order with different times
            this.show[0].push(time_ms / 1000)
            for (let j = 0; j < tag_count; j++) {
                let yValue = this.show[j + 1] as (number | null)[]
                if (j == tag_idx) {
                    yValue.push(value)
                }
                else {
                    yValue.push(null)
                }
            }
        }
        this.updateshow = true
    }

    /**
     * Add an array of tag values
     */
    add_tag_history(tag: Tag) {
        const tag_idx = this.tags.indexOf(tag)
        const tag_count = this.tags.length
        for (let i = 0; i < tag.history.times_ms.length; i++) {
            const time_ms = tag.history.times_ms[i]
            const value = tag.history.values[i]
            this.times_ms[time_ms] ??= Array(tag_count).fill(null)
            this.times_ms[time_ms][tag_idx] = value
        }
    }

    /**
     * Add tag values to times_ms dict. Only add tag.history if the
     * tag has not been seen or if the history now has an earlier start.
     */
    add_tag_value(tag: Tag) {
        const tag_idx = this.tags.indexOf(tag)
        const tag_count = this.tags.length
        if (tag.new_history) {
            this.add_tag_history(tag)
            this.populate_show()
        }
        else {
            this.times_ms[tag.time_ms] ??= Array(tag_count).fill(null)
            this.times_ms[tag.time_ms][tag_idx] = tag.value
            this.extend_show(tag_idx, tag.time_ms, tag.value)
        }
        this.received_new_data = true
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
            this.add_tag_history(tag)
        }
        this.show = [[]]
        this.populate_show()
    }
}