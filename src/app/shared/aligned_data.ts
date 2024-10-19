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

    // calc_average(trace_id: number) {
    //     let trace = this.traces[trace_id]
    //     return (write_index: number, indices: number[], samples: number[]) => {
    //         const sum = samples.reduce((sum, current) => sum + current, 0)
    //         trace.smooth[indices[write_index]] = sum / samples.length
    //     }
    // }

    // calc_median(trace_id: number) {
    //     let trace = this.traces[trace_id]
    //     let sorted_samples: number[] = []
    //     return (write_index: number, indices: number[], samples: number[]) => {
    //         sorted_samples = [...samples].sort((a, b) => a - b)
    //         trace.smooth[indices[write_index]] = sorted_samples[samples.length >> 1]
    //     }
    // }

    /**
     * Return average of count samples, centred (non-causal)
     */
    smoother(trace_id: number, count: number, s_type: number) {
        this.traces[trace_id].smoothing = true
        const side_count = Math.floor((count - 1) / 2)
        // let calc_smooth = (a: number, b: number[], c: number[]) => {}
        // if (s_type == AVERAGE) {
        //     calc_smooth = this.calc_average(trace_id)
        // }
        // else if (s_type == MEDIAN) {
        //     calc_smooth = this.calc_median(trace_id)
        // }
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
                indices.unshift(i)  // don't use!
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
                // calc_smooth(write_index, indices, samples)
                if (s_type == AVERAGE) {
                    const sum = samples.reduce((sum, current) => sum + current, 0)
                    this.traces[trace_id].smooth[indices[write_index]] = sum / samples.length
                }
                else if (s_type == MEDIAN) {
                    const sorted_samples = [...samples].sort((a, b) => a - b)
                    this.traces[trace_id].smooth[indices[write_index]] = sorted_samples[samples.length >> 1]
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
        if (!(trace_id in this.traces)) {
            this.initializeNewTrace(trace_id, exist_len)
        }
        if (this.canSimplyAppend(times)) {
            this.appendNewData(trace_id, times, values)
            return
        }
        this.mergeData(trace_id, times, values)
    }

    private initializeNewTrace(trace_id: number, exist_len: number) {
        this.trace_by_col.push(trace_id)
        this.traces[trace_id] = {
            values: Array(exist_len).fill(null),
            smooth: [],
            smooth_from: 0,
            smoothing: false,
            smoother: this.smoother_raw(trace_id),
        }
    }

    private canSimplyAppend(times: number[]): boolean {
        return this.times.length === 0 || this.times[this.times.length - 1] < times[0]
    }

    private appendNewData(trace_id: number, times: number[], values: (number | null)[]) {
        this.times.push(...times);
        for (const do_id of this.trace_by_col) {
            const do_trace = this.traces[do_id]
            if (do_id === trace_id) {
                do_trace.values.push(...values)
            } else {
                do_trace.values.push(...Array(times.length).fill(null))
            }
            if (do_trace.smoothing) {
                do_trace.smooth.push(...Array(times.length).fill(null))
            }
        }
    }

    private mergeData(trace_id: number, times: number[], values: (number | null)[]) {
        let new_times: number[] = [];
        let new_values: {[trace_id: number]: (number|null)[]} = {}
        let new_smooth: {[trace_id: number]: (number|null)[]} = {}
        this.initializeNewArrays(new_values, new_smooth)
        let exist_pos = 0
        let new_pos = 0
        while (exist_pos < this.times.length || new_pos < times.length) {
            if (exist_pos === this.times.length) {
                this.appendRemainingNewData(new_times, new_values, new_smooth, trace_id, times, values, new_pos)
                break
            }
            if (new_pos === times.length) {
                this.appendRemainingExistingData(new_times, new_values, new_smooth, trace_id, exist_pos)
                break
            }
            if (this.times[exist_pos] === times[new_pos]) {
                this.mergeDataPoint(new_times, new_values, new_smooth, trace_id, times, values, exist_pos, new_pos)
                exist_pos++
                new_pos++
            } else if (this.times[exist_pos] < times[new_pos]) {
                exist_pos = this.handleExistingDataPoint(new_times, new_values, new_smooth, exist_pos, times[new_pos])
            } else {
                new_pos = this.handleNewDataPoint(new_times, new_values, new_smooth, trace_id, times, values, new_pos, this.times[exist_pos])
            }
        }
        this.updateDataArrays(new_times, new_values, new_smooth)
    }

    private initializeNewArrays(new_values: {[trace_id: number]: (number|null)[]}, new_smooth: {[trace_id: number]: (number|null)[]}) {
        for (const t_id of this.trace_by_col) {
            new_values[t_id] = []
            new_smooth[t_id] = []
        }
    }

    private appendRemainingNewData(new_times: number[], new_values: {[trace_id: number]: (number|null)[]}, new_smooth: {[trace_id: number]: (number|null)[]}, trace_id: number, times: number[], values: (number | null)[], new_pos: number) {
        const new_remain_len = times.length - new_pos
        new_times.push(...times.slice(new_pos))
        for (const do_id of this.trace_by_col) {
            const do_trace = this.traces[do_id]
            if (do_trace.smoothing) {
                new_smooth[do_id].push(...Array(new_remain_len).fill(null))
            }
            if (do_id === trace_id) {
                new_values[do_id].push(...values.slice(new_pos))
            } else {
                new_values[do_id].push(...Array(new_remain_len).fill(null))
            }
        }
    }

    private appendRemainingExistingData(new_times: number[], new_values: {[trace_id: number]: (number|null)[]}, new_smooth: {[trace_id: number]: (number|null)[]}, trace_id: number, exist_pos: number) {
        const exist_remain_len = this.times.length - exist_pos
        new_times.push(...this.times.slice(exist_pos))
        for (const do_id of this.trace_by_col) {
            const do_trace = this.traces[do_id]
            if (do_trace.smoothing) {
                if (do_id === trace_id) {
                    new_smooth[do_id].push(...Array(exist_remain_len).fill(null))
                } else {
                    new_smooth[do_id].push(...do_trace.smooth.slice(exist_pos))
                }
            }
            new_values[do_id].push(...do_trace.values.slice(exist_pos))
        }
    }

    private mergeDataPoint(new_times: number[], new_values: {[trace_id: number]: (number|null)[]}, new_smooth: {[trace_id: number]: (number|null)[]}, trace_id: number, times: number[], values: (number | null)[], exist_pos: number, new_pos: number) {
        new_times.push(times[new_pos])
        for (const do_id of this.trace_by_col) {
            const do_trace = this.traces[do_id]
            if (do_trace.smoothing) {
                if (do_id === trace_id) {
                    if (do_trace.smooth_from > new_smooth[do_id].length) {
                        do_trace.smooth_from = new_smooth[do_id].length
                    }
                    new_smooth[do_id].push(null)
                } else {
                    new_smooth[do_id].push(do_trace.smooth[exist_pos])
                }
            }
            if (do_id === trace_id) {
                new_values[do_id].push(values[new_pos])
            } else {
                new_values[do_id].push(do_trace.values[exist_pos])
            }
        }
    }

    private handleExistingDataPoint(new_times: number[], new_values: {[trace_id: number]: (number|null)[]}, new_smooth: {[trace_id: number]: (number|null)[]}, exist_pos: number, next_new_time: number): number {
        const add_in_this = bisect(this.times, next_new_time)
        new_times.push(...this.times.slice(exist_pos, add_in_this))
        for (const do_id of this.trace_by_col) {
            const do_trace = this.traces[do_id]
            if (do_trace.smoothing) {
                new_smooth[do_id].push(...do_trace.smooth.slice(exist_pos, add_in_this))
            }
            new_values[do_id].push(...do_trace.values.slice(exist_pos, add_in_this))
        }
        return add_in_this
    }

    private handleNewDataPoint(new_times: number[], new_values: {[trace_id: number]: (number|null)[]}, new_smooth: {[trace_id: number]: (number|null)[]}, trace_id: number, times: number[], values: (number | null)[], new_pos: number, next_exist_time: number): number {
        const exist_in_new = bisect(times, next_exist_time)
        const add_new_len = exist_in_new - new_pos
        new_times.push(...times.slice(new_pos, exist_in_new))
        for (const do_id of this.trace_by_col) {
            const do_trace = this.traces[do_id]
            if (do_trace.smoothing) {
                if (do_id === trace_id) {
                    if (do_trace.smooth_from > new_smooth[do_id].length) {
                        do_trace.smooth_from = new_smooth[do_id].length
                    }
                    new_smooth[do_id].push(...Array(add_new_len).fill(null))
                } else {
                    if (do_trace.smooth_from >= new_smooth[do_id].length) {
                        do_trace.smooth_from += add_new_len
                    }
                    new_smooth[do_id].push(...Array(add_new_len).fill(null))
                }
            }
            if (do_id === trace_id) {
                new_values[do_id].push(...values.slice(new_pos, exist_in_new))
            } else {
                new_values[do_id].push(...Array(add_new_len).fill(null))
            }
        }
        return exist_in_new
    }

    private updateDataArrays(new_times: number[], new_values: {[trace_id: number]: (number|null)[]}, new_smooth: {[trace_id: number]: (number|null)[]}) {
        this.times = new_times
        for (const do_id of this.trace_by_col) {
            this.traces[do_id].values = new_values[do_id]
            if (this.traces[do_id].smoothing) {
                this.traces[do_id].smooth = new_smooth[do_id]
            }
        }
    }
}
