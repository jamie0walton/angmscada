// Maintain a dataset close to what uplot uses. Handle
// time and value trace vector additions and insertions.
// Maintain a smoothed set for each trace, provide either
// raw or smoothed on a switch setting.
import { bisect } from "./functions"

export class UplotVectors {
    times_ms: number[]
    values: (number|null)[][]
    smooth: (number|null)[][]
    smoothers: Function[]
    smoothing: boolean[]
    col_by_id: {[key: number]: number}

    constructor(){
        this.times_ms = []
        this.values = []
        this.smooth = []
        this.smoothers = []
        this.smoothing = []
        this.col_by_id = {}
    }

    /**
     * Just returns the raw values
     */
    smoother_raw(trace_id: number) {
        const series_id = this.col_by_id[trace_id]
        this.smoothing[series_id] = false
        this.smooth[series_id] = []
        return () => {
            return this.values[this.col_by_id[trace_id]]
        }
    }

    /**
     * Return average of count samples, centred (non-causal)
     */
    smoother_average(trace_id: number, count: number) {
        const series_id = this.col_by_id[trace_id]
        this.smoothing[series_id] = true
        this.smooth[series_id] = []
        let done_to = 0
        return () => {
            this.smooth[series_id].push(...Array(this.times_ms.length - this.smooth[series_id].length).fill(0))
            let samples: number[] = []
            let indices: number[] = []
            let rolling = false
            let writing = false
            let start_writing = Math.floor((count - 1) / 2) + 1
            let index = 0
            let i = done_to
            while(true) {
                const value = this.values[series_id][i] || null
                if (value == null) {
                    i++
                    if (i > this.times_ms.length) {
                        done_to = indices[index] || 0
                        while(samples.length > start_writing) {
                            samples.shift()
                            indices.shift()
                            const sum = samples.reduce((sum, current) => sum + current, 0)
                            this.smooth[series_id][indices[index]] = sum / samples.length
                        }
                        break
                    }
                    continue
                }
                samples.push(value)
                indices.push(i)
                i++
                if (rolling) {
                    samples.shift()
                    indices.shift()
                }
                else if (samples.length == start_writing) {
                    writing = true
                }
                else if (samples.length == count) {
                    rolling = true
                }
                if (writing) {
                    const sum = samples.reduce((sum, current) => sum + current, 0)
                    this.smooth[series_id][indices[index]] = sum / samples.length
                    if (!rolling) {
                        index++
                    }
                }
            }
            return this.smooth[series_id]
        }
    }

    /**
     * Select a smoother for a trace, smoother is one of: raw, median,
     * average, savitzky-golay. factor is smoothing factor, 10 is set
     * to be good for many real-time traces.
     */
    smoother_choose(trace_id: number, smoother: string, factor: number) {
        const series_id = this.col_by_id[trace_id]
        if (smoother == 'raw') {
            this.smoothers[series_id] = this.smoother_raw(trace_id)
        }
        else if (smoother == 'average') {
            this.smoothers[series_id] = this.smoother_average(trace_id, factor)
        }
    }

    /**
     * Return a dataset suitable for uplot
     */
    get_uplot_data() {
        let traces = []
        for (let i = 0; i < this.smoothers.length; i++) {
            const smoothed_data = this.smoothers[i]()
            traces.push(smoothed_data)
        }
        return [
            this.times_ms,
            ...traces
        ]
    }

    /**
     * Add history
     */
    add_history(trace_id: number, times_ms: number[], values: (number | null)[]) {
        const a_len = this.times_ms.length
        const b_len = times_ms.length
        if (!(trace_id in this.col_by_id)) {
            if (a_len == 0) {
                this.times_ms = [...times_ms]
                this.col_by_id[trace_id] = this.values.length
                this.values.push([...values])
                this.smooth.push([])
                this.smoothers.push(this.smoother_raw(trace_id))
                return
            }
            this.col_by_id[trace_id] = this.values.length
            this.values.push(Array(a_len).fill(null) as Array<null>)
            this.smooth.push([])
            this.smoothers.push(this.smoother_raw(trace_id))
        }
        if (this.times_ms[a_len - 1] < times_ms[0]) {
            // all values come after the existing set, easy! clean append
            this.times_ms.push(...times_ms)
            for (let i = 0; i < this.values.length; i++) {
                if (this.col_by_id[trace_id] == i) {
                    this.values[i].push(...values)
                }
                else {
                    this.values[i].push(...Array(b_len).fill(null) as Array<null>)
                }
                if (this.smooth[i].length) {
                    this.smooth[i].push(...Array(b_len).fill(null) as Array<null>)
                }
            }
        }
        else {
            // if not all are after, could be anything, stitch new arrays
            let a_pos = 0
            let b_pos = 0
            let new_times_ms: number[] = []
            let new_values: (number|null)[][] = []
            let new_smooth: (number|null)[][] = []
            for (let i = 0; i < this.values.length; i++) {
                new_values.push([])
                new_smooth.push([])
            }
            while (true) {
                if (a_pos == this.times_ms.length) {
                    // this.times_ms finished, append times_ms
                    const b_add = times_ms.length - b_pos
                    new_times_ms.push(...times_ms.slice(b_pos))
                    for (let i = 0; i < this.values.length; i++) {
                        if (this.col_by_id[trace_id] == i) {
                            new_values[i].push(...values.slice(b_pos))
                        }
                        else {
                            new_values[i].push(...Array(b_add).fill(null))
                        }
                    }
                    this.times_ms = new_times_ms
                    this.values = new_values
                    break
                }
                if (b_pos == times_ms.length) {
                    // times_ms finished, append this.times_ms
                    new_times_ms.push(...this.times_ms.slice(a_pos))
                    for (let i = 0; i < this.values.length; i++) {
                        new_values[i].push(...this.values[i].slice(a_pos))
                    }
                    this.times_ms = new_times_ms
                    this.values = new_values
                    break
                }
                const a_time = this.times_ms[a_pos]
                const b_time = times_ms[b_pos]
                if (a_time == b_time) {
                    // pre-existing row, replace values, arbitrary choice
                    new_times_ms.push(times_ms[b_pos])
                    for (let i = 0; i < this.values.length; i++) {
                        if (this.col_by_id[trace_id] == i) {
                            new_values[i].push(values[b_pos])
                        }
                        else {
                            new_values[i].push(this.values[i][a_pos])
                        }
                    }
                    a_pos += 1
                    b_pos += 1
                }
                else if (a_time < b_time){
                    let b_in_a = bisect(this.times_ms, b_time)
                    new_times_ms.push(...this.times_ms.slice(a_pos, b_in_a))
                    for (let i = 0; i < this.values.length; i++) {
                        new_values[i].push(...this.values[i].slice(a_pos, b_in_a))
                    }
                    a_pos = b_in_a
                }
                else { // must be a_time > b_time
                    let a_in_b = bisect(times_ms, a_time)
                    new_times_ms.push(...times_ms.slice(b_pos, a_in_b))
                    for (let i = 0; i < this.values.length; i++) {
                        if (this.col_by_id[trace_id] == i) {
                            new_values[i].push(...values.slice(b_pos, a_in_b))
                        }
                        else {
                            new_values[i].push(...Array(a_in_b - b_pos).fill(null))
                        }
                    }
                    b_pos = a_in_b
                }
            }
        }
    }
}