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
        range: [number, number]
        zoomrange: [number, number]
        unzoom: boolean
    }}
    received_new_data: boolean
    real_time: boolean

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
    }

    /**
     * Sets plot duration in seconds, updates dataset tag.age_ms as well.
     * */
    set_duration(duration_sec: number) {
        this.duration = duration_sec
        let now_sec = new Date().getTime() /1000
        let range: [number, number] = [now_sec - this.duration, now_sec] 
        this.axes['x'] = {
            range: range,
            zoomrange: range,
            unzoom: false
        }
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

    /**
     * Sets plot duration with time units [mhdw], seconds is none.
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
     * Steps time with clock, or sets a fixed range.
     */
    step_x_axis(range?: [number, number]) {
        // console.log('step_x_axis ' + range)
        if (range) {
            this.axes['x'].range = range
        }
        else {
            const now_sec = new Date().getTime() / 1000
            this.axes['x'].range = [now_sec - this.duration, now_sec]
        }
    }

    /**
     * If null, requesting current range, otherwize zooming.
     * Might zoom to full range, in which case unzoom.
     * Follow now if current and zoomed.
     */
    zoom_x_axis(range: [null|number, null|number]): [number, number] {
        const x_axis = this.axes['x']
        let now_same = false
        if (typeof(range[0]) === 'number' && typeof(range[1]) === 'number') {
            if (x_axis.zoomrange[1] == range[1]) {
                now_same = true
            }
            x_axis.zoomrange[1] = range[1]
            x_axis.zoomrange[0] = range[0]
        }
        const zoom_span = x_axis.zoomrange[1] - x_axis.zoomrange[0]
        const span = x_axis.range[1] - x_axis.range[0]
        if (this.real_time && now_same || zoom_span === span) {
            this.real_time = true
            x_axis.zoomrange[1] = x_axis.range[1]
            x_axis.zoomrange[0] = x_axis.range[1] - zoom_span
        }
        else {
            this.real_time = false
        }
        return x_axis.zoomrange
    }

    /**
     * Set the Y axes default ranges.
     */
    set_yaxes(axis: string, range: [number, number]) {
        console.log('set_yaxes set default ' + axis + ' ' + range)
        this.axes[axis] = {
            range: [...range],  // must copy the array
            zoomrange: [...range],
            unzoom: false
        }
    }

    /**
     * If null, requesting current range, otherwize zooming.
     * Might zoom to full range, in which case unzoom.
     */
    zoom_y_axis(axis: string, range: [null|number, null|number]): [number, number] {
        // console.log('zoom_y_axis ' + axis + ' ' + range[0] + ' ' + range[1])
        const y_axis = this.axes[axis]
        if (typeof(range[0]) === 'number' && typeof(range[1]) === 'number') {
            if (y_axis.zoomrange[0] !== range[0] && y_axis.zoomrange[1] !== range[1]) {
                y_axis.zoomrange[1] = range[1]
                y_axis.zoomrange[0] = range[0]
            }
        }
        return y_axis.zoomrange
    }

    /**
     * Set the unzoom flag for the range callbacks.
     */
    unset_zoom() {
        for (let axis in this.axes) {
            this.axes[axis].unzoom = true
        }
    }

    get_axis_range(axis: string): [number, number] {
        console.log('get_axis_range')
        const ax = this.axes[axis]
        return ax.range
    }

    // /**
    //  * Work out if the plot is zoomed, set zoomed.
    //  */
    // check_zoom(min: number | undefined, max: number | undefined) {
    //     if (typeof(min) == 'number' && typeof(max) == 'number' && min > this.start && max < this.end) {
    //         this.start_zoom = min
    //         this.end_zoom = max
    //         this.zoomed = true
    //     }
    //     else {
    //         this.zoomed = false
    //     }
    //     // console.log("time min "+ min + " max " + max + " zoomed " + this.zoomed)
    // }

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
     * Add tag values to times_ms dict. Only add tag.history if the
     * tag has not been seen or if the history now has an earlier start.
     */
    add_tag_value(tag: Tag) {
        const tag_idx = this.tags.indexOf(tag)
        const tag_count = this.tags.length
        if (tag.new_history || this.show.length == 1) {
            for (let i = 0; i < tag.history.times_ms.length; i++) {
                const time_ms = tag.history.times_ms[i]
                const value = tag.history.values[i]
                this.times_ms[time_ms] ??= Array(tag_count).fill(null)
                this.times_ms[time_ms][tag_idx] = value
            }
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
            this.add_tag_value(tag)
        }
        this.show = [[]]
        this.populate_show()
    }
}