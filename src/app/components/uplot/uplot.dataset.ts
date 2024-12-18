import { inject } from '@angular/core'
import { Tag, TagSubject } from 'src/app/store/tag'
import { UplotVectors } from 'src/app/shared/aligned_data'

export class UplotDataSet {
    tagstore = inject(TagSubject)
    tags: Tag[]
    aligned: UplotVectors
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
        this.aligned = new UplotVectors()
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
        else if (Array.isArray(duration) && typeof(duration[0]) == 'number') {
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
        this.show = this.aligned.get_uplot_data()
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
     * Set the smoothing filter, apply on set and keep updating.
     */
    set_filter(filter: number, factor: number) {
        this.aligned.filters.selected = filter
        for (let i = 0; i < this.tags.length; i++) {
            this.aligned.smoother_choose(i, this.aligned.filters.options[filter], factor)
        }
        this.show = this.aligned.get_uplot_data()
        this.updateshow = true
    }

    /**
     * Add tag values to times_ms dict. Only add tag.history if the
     * tag has not been seen or if the history now has an earlier start.
     */
    add_tag_value(tag: Tag) {
        const tag_idx = this.tags.indexOf(tag)
        const tag_count = this.tags.length
        if (tag.new_history) {
            this.aligned.add_history(tag_idx, tag.history.times_ms, tag.history.values)
        }
        else {
            this.aligned.add_history(tag_idx, [tag.time_ms], [tag.value])
        }
        this.show = this.aligned.get_uplot_data()
        this.updateshow = true
        this.received_new_data = true
    }

    /**
     * Initialise (or reinitialise) the times_ms dict and the show array
     * passed to uplot.
     */
    initialise(tags: Tag[]) {
        this.tags = tags
        for (let i = 0; i < tags.length; i++) {
            const tag = tags[i]
            this.aligned.add_history(i, tag.history.times_ms, tag.history.values)
        }
        this.show = this.aligned.get_uplot_data()
        this.updateshow = true
    }
}