// Maintain a dataset close to what uplot uses. Handle
// time and value trace vector additions and insertions.
// Maintain a smoothed set for each trace, provide either
// raw or smoothed on a switch setting.
import { bisect } from "./functions"

const SMOOTHERS = ['raw', 'average', 'median']
const MEDIAN = 0
const AVERAGE = 1

export class UplotVectors {
    times: number[]
    trace_by_col: number[]
    traces: {[trace_id: number]: {
        values: (number|null)[]
        smooth: (number|null)[]
        smooth_from: number
        smoother: Function
        smoothing: boolean
    }}
    filters: {
        options: string[] 
        selected: number
        factor: number
    }

    constructor(){
        this.times = []
        this.trace_by_col = []
        this.traces = {}
        this.filters = {
            options: SMOOTHERS,
            selected: 0,
            factor: 0
        }
    }

    /**
     * Just returns the raw values
     */
    smoother_raw(trace_id: number) {
        return () => {
            return this.traces[trace_id].values
        }
    }

    /**
     * Test for add_history
     */
    smoother_tester(trace_id: number) {
        this.traces[trace_id].smoothing = true
        return () => {
            const trace = this.traces[trace_id]
            trace.smooth = [...trace.values]
            let smooth_from = trace.smooth.length
            let setback = 0
            let index = smooth_from - 1
            while(index >= 0 && setback < 2) {
                if (trace.smooth[index] != null) {
                    setback++
                    smooth_from = index
                }
                index--
            }
            trace.smooth_from = smooth_from
            return trace.smooth
        }
    }

    /**
     * Return average of count samples, centred (non-causal)
     */
    smoother(trace_id: number, count: number, s_type: number) {
        this.traces[trace_id].smoothing = true
        const side_count = Math.floor((count - 1) / 2)
        return () => {
            const trace = this.traces[trace_id]
            for (let i = trace.smooth.length; i < this.times.length; i++) {
                trace.smooth.push(null)                
            }
            let samples: number[] = []
            let indices: number[] = []
            let i = trace.smooth_from
            // BACK FILL
            while(true) {
                i--
                if (i < 0) { break }
                const ival = trace.values[i] || null
                if (ival == null) { continue }
                samples.unshift(ival)
                indices.unshift(0)  // don't use!
                if (samples.length == side_count) { break }
            }
            i = trace.smooth_from
            let write_index = samples.length
            let forward = 0
            // FORWARD FILL
            while(true) {
                const ival = trace.values[i] ?? null
                if (ival == null) {
                    i++
                }
                else {
                    samples.push(ival)
                    indices.push(i)
                    forward++
                    i++
                    if(forward == side_count + 1) { break }
                }
                if (i >= trace.values.length) { break }
            }
            enum State {FILL, ROLL, EMPTY}
            let state: State = State.FILL
            if (samples.length == count) {
                state = State.ROLL
            }
            // WRITE
            while(samples.length > side_count) {
                if (s_type == AVERAGE) {
                    const sum = samples.reduce((sum, current) => sum + current, 0)
                    trace.smooth[indices[write_index]] = sum / samples.length
                }
                else if (s_type == MEDIAN) {
                    const sorted_samples = [...samples].sort((a, b) => a - b)
                    trace.smooth[indices[write_index]] = sorted_samples[samples.length >> 1]
                }
                while(true){
                    const ival = trace.values[i] ?? null
                    if(ival != null) {
                        samples.push(ival)
                        indices.push(i)
                        i++
                        break
                    }
                    i++
                    if(i >= trace.values.length) {
                        trace.smooth_from = indices[write_index - 1]
                        state = State.EMPTY
                        break
                    }
                }
                if(state == State.ROLL) {
                    samples.shift()
                    indices.shift()
                }
                else if(state == State.EMPTY) {
                    samples.shift()
                    indices.shift()
                    if (write_index == samples.length) {
                        write_index--
                    }
                }
                else if(state == State.FILL) {
                    if (samples.length == count) {
                        state = State.ROLL
                    }
                    write_index++
                }
            }
            return trace.smooth
        }
    }

    /**
     * Select a smoother for a trace, smoother is one of: raw, median,
     * average, savitzky-golay. factor is smoothing factor, 10 is set
     * to be good for many real-time traces.
     */
    smoother_choose(trace_id: number, smoother: string, factor?: number) {
        if (smoother == 'raw') {
            this.traces[trace_id].smoother = this.smoother_raw(trace_id)
            this.filters.factor = 0
        }
        else if (smoother == 'average' && typeof(factor) == 'number') {
            this.traces[trace_id].smoother = this.smoother(trace_id, factor, AVERAGE)
            this.traces[trace_id].smooth_from = 0
            this.filters.factor = factor
        }
        else if (smoother == 'median' && typeof(factor) == 'number') {
            this.traces[trace_id].smoother = this.smoother(trace_id, factor, MEDIAN)
            this.traces[trace_id].smooth_from = 0
            this.filters.factor = factor
        }
        else if (smoother == 'tester') {
            this.traces[trace_id].smoother = this.smoother_tester(trace_id)
        }
    }

    /**
     * Return a dataset suitable for uplot
     */
    get_uplot_data(): [number[], ...(number|null)[][]] {
        let traces: (number|null)[][] = []
        for (let i = 0; i < this.trace_by_col.length; i++) {
            traces[i] = this.traces[this.trace_by_col[i]].smoother()
        }
        return [
            this.times,
            ...traces
        ]
    }

    /**
     * Add history
     */
    add_history(trace_id: number, times_ms: number[], values: (number | null)[]) {
        let times = times_ms.map(x => x / 1000)
        const exist_len = this.times.length
        // New trace, create a default null alignment first
        if (!(trace_id in this.traces)) {
            this.trace_by_col.push(trace_id)
            this.traces[trace_id] = {
                values: Array(exist_len).fill(null) as Array<null>,
                smooth: [],
                smooth_from: 0,
                smoothing: false,
                smoother: this.smoother_raw(trace_id),
            }
        }
        const add_new_len = times.length
        // Earliest new time is after latest this time, append and return
        if (this.times[exist_len - 1] < times[0]) {
            for (let i = 0; i < times.length; i++) {
                this.times.push(times[i]) 
            }
            for (let i = 0; i < this.trace_by_col.length; i++) {
                const do_id = this.trace_by_col[i]
                const do_trace = this.traces[do_id]
                if (do_id == trace_id) {
                    for (let i = 0; i < values.length; i++) {
                        do_trace.values.push(values[i])
                    }
                }
                else {
                    for (let i = 0; i < add_new_len; i++) {
                        do_trace.values.push(null)
                    }
                }
                // No existing smoothed results to keep, add nulls
                if (do_trace.smoothing) {
                    for (let i = 0; i < add_new_len; i++) {
                        do_trace.smooth.push(null)
                    }
                }
            }
            return
        }
        // No more easy options so do generalised stitching into empty arrays
        let new_times: number[] = []
        let new_values: {[trace_id: number]: (number|null)[]} = {}
        let new_smooth: {[trace_id: number]: (number|null)[]} = {}
        for (let i = 0; i < this.trace_by_col.length; i++) {
            const t_id = this.trace_by_col[i]
            new_values[t_id] = []
            new_smooth[t_id] = []
        }
        let exist_pos = 0
        let new_pos = 0
        while (true) {
            // Index exist_pos and new_pos until at the end of both existing and new
            if (exist_pos == this.times.length) {
                // At the end of existing data, append new
                const new_remain_len = times.length - new_pos
                for (let i = new_pos; i < times.length; i++) {
                    new_times.push(times[i])
                }
                for (let i = 0; i < this.trace_by_col.length; i++) {
                    const do_id = this.trace_by_col[i]
                    const do_trace = this.traces[do_id]
                    // No smoothing has been done for new appended data
                    if (do_trace.smoothing) {
                        new_smooth[do_id].push(...Array(new_remain_len).fill(null))
                    }
                    // Only nulls available for existing data
                    if (do_id == trace_id) {
                        for (let i = new_pos; i < values.length; i++) {
                            new_values[do_id].push(values[i])                                
                        }
                    }
                    else {
                        for (let i = 0; i < new_remain_len; i++) {
                            new_values[do_id].push(null)                                
                        }
                    }
                }
                break
            }
            if (new_pos == times.length) {
                // At the end of new data, append existing
                const exist_remain_len = this.times.length - exist_pos
                for (let i = exist_pos; i < this.times.length; i++) {
                    new_times.push(this.times[i])
                }
                for (let i = 0; i < this.trace_by_col.length; i++) {
                    const do_id = this.trace_by_col[i]
                    const do_trace = this.traces[do_id]
                    // smooth_from will increase for unchanged data because of added nulls
                    if (do_trace.smoothing) {
                        if (do_id == trace_id) {
                            for (let i = 0; i < exist_remain_len; i++) {
                                new_smooth[do_id].push(null)                                
                            }
                        }
                        else {
                            for (let i = exist_pos; i < do_trace.smooth.length; i++) {
                                new_smooth[do_id].push(do_trace.smooth[i])                                
                            }
                        }
                    }
                    // Added trace data either has values or nulls, so all the same
                    for (let i = exist_pos; i < do_trace.values.length; i++) {
                        new_values[do_id].push(do_trace.values[i])                                
                    }
                }
                break
            }
            const exist_time = this.times[exist_pos]
            const new_time = times[new_pos]
            if (exist_time == new_time) {
                // Times match, copy the individual values into new arrays
                new_times.push(times[new_pos])
                for (let i = 0; i < this.trace_by_col.length; i++) {
                    const do_id = this.trace_by_col[i]
                    const do_trace = this.traces[do_id]
                    // reset smooth_from to new value if needed
                    if (do_trace.smoothing) {
                        if (do_id == trace_id) {
                            if (do_trace.smooth_from > new_smooth[do_id].length){
                                do_trace.smooth_from = new_smooth[do_id].length
                            }
                            new_smooth[do_id].push(null)
                        }
                        else {
                            new_smooth[do_id].push(do_trace.smooth[exist_pos])
                        }
                    }
                    // new values might replace existing, nulls or values
                    if (do_id == trace_id) {
                        new_values[do_id].push(values[new_pos])
                    }
                    else {
                        new_values[do_id].push(do_trace.values[exist_pos])
                    }
                }
                exist_pos += 1
                new_pos += 1
            }
            else if (exist_time < new_time){
                // next lot of data is existing
                const add_in_this = bisect(this.times, new_time)
                for (let i = exist_pos; i < add_in_this; i++) {
                    new_times.push(this.times[i])
                }
                for (let i = 0; i < this.trace_by_col.length; i++) {
                    const do_id = this.trace_by_col[i]
                    const do_trace = this.traces[do_id]
                    // smooth_from should not change as keeping existing
                    if (do_trace.smoothing) {
                        for (let i = exist_pos; i < add_in_this; i++) {
                            new_smooth[do_id].push(do_trace.smooth[i])
                        }
                    }
                    // all values already exist, none are new
                    for (let i = exist_pos; i < add_in_this; i++) {
                        new_values[do_id].push(do_trace.values[i])
                    }
                }
                exist_pos = add_in_this
            }
            else { // must be new_time < exist_time
                const exist_in_new = bisect(times, exist_time)
                const add_new_len = exist_in_new - new_pos
                for (let i = new_pos; i < exist_in_new; i++) {
                    new_times.push(times[i])
                }
                for (let i = 0; i < this.trace_by_col.length; i++) {
                    const do_id = this.trace_by_col[i]
                    const do_trace = this.traces[do_id]
                    // Inserting new values will offset any smooth_from not yet reached
                    if (do_trace.smoothing) {
                        if (do_id == trace_id) {
                            if (do_trace.smooth_from > new_smooth[do_id].length){
                                do_trace.smooth_from = new_smooth[do_id].length
                            }
                            new_smooth[do_id].push(...Array(add_new_len).fill(null))
                        }
                        else {
                            if (do_trace.smooth_from >= new_smooth[do_id].length){
                                do_trace.smooth_from += add_new_len
                            }
                            new_smooth[do_id].push(...Array(add_new_len).fill(null))
                        }
                    }
                    // Only have values for new data, add nulls for rest
                    if (do_id == trace_id) {
                        for (let i = new_pos; i < exist_in_new; i++) {
                            new_values[do_id].push(values[i])
                        }
                    }
                    else {
                        for (let i = 0; i < add_new_len; i++) {
                            new_values[do_id].push(null)
                        }
                    }
                }
                new_pos = exist_in_new
            }
        }
        // Finally replace the existing arrays with new arrays
        this.times = new_times
        for (let i = 0; i < this.trace_by_col.length; i++) {
            const do_id = this.trace_by_col[i]
            this.traces[do_id].values = new_values[do_id]
            this.traces[do_id].smooth = new_smooth[do_id]
        }
    }
}