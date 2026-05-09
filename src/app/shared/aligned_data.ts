// Maintain a dataset close to what uplot uses. Handle
// time and value trace vector additions and insertions.

// uplot expects a single time series and every set of trace
// values to be exactly aligned with the time series with
// null values where the trace has no data.
import { bisect } from "./functions"

export class UplotVectors {
    times: number[]
    trace_by_col: number[]
    traces: {[trace_id: number]: {
        values: (number|null)[]
    }}

    constructor(){
        this.times = []
        this.trace_by_col = []
        this.traces = {}
    }

    /**
     * Return a dataset suitable for uplot
     */
    get_uplot_data(): [number[], ...(number|null)[][]] {
        let traces: (number|null)[][] = []
        for (let i = 0; i < this.trace_by_col.length; i++) {
            traces[i] = this.traces[this.trace_by_col[i]].values
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
        console.log('uplot add_history', {
            trace_id,
            incoming: times.length,
            existingTimes: this.times.length,
            existingTraceValues: this.traces[trace_id]?.values.length ?? 0
        })
        if (this.canSimplyAppend(times)) {
            this.appendNewData(trace_id, times, values)
            return
        }
        this.mergeData(trace_id, times, values)
    }

    private initializeNewTrace(trace_id: number, exist_len: number) {
        this.trace_by_col.push(trace_id)
        let values: (number|null)[] = []
        for (let i = 0; i < exist_len; i++) {
            values.push(null)
        }
        this.traces[trace_id] = {
            values: values,
        }
    }

    private canSimplyAppend(times: number[]): boolean {
        return this.times.length === 0 || this.times[this.times.length - 1] < times[0]
    }

    private appendNewData(trace_id: number, times: number[], values: (number | null)[]) {
        this.times = this.times.concat(times)
        for (const do_id of this.trace_by_col) {
            const do_trace = this.traces[do_id]
            if (do_id === trace_id) {
                do_trace.values = do_trace.values.concat(values)
            } else {
                for (let i = 0; i < times.length; i++) {
                    do_trace.values.push(null)
                }
            }
        }
    }

    private mergeData(trace_id: number, times: number[], values: (number | null)[]) {
        console.log('uplot mergeData', {
            trace_id,
            incoming: times.length,
            existingTimes: this.times.length,
            existingTraceValues: this.traces[trace_id]?.values.length ?? 0
        })
        let new_times: number[] = []
        let new_values: {[trace_id: number]: (number|null)[]} = {}
        this.initializeNewArrays(new_values)
        let exist_pos = 0
        let new_pos = 0
        while (exist_pos < this.times.length || new_pos < times.length) {
            if (exist_pos === this.times.length) {
                new_times = this.appendRemainingNewData(
                    new_times, new_values, trace_id, times, values, new_pos)
                break
            }
            if (new_pos === times.length) {
                new_times = this.appendRemainingExistingData(
                    new_times, new_values, exist_pos)
                break
            }
            if (this.times[exist_pos] === times[new_pos]) {
                this.mergeDataPoint(
                    new_times, new_values, trace_id, times, values,
                    exist_pos, new_pos)
                exist_pos++
                new_pos++
            } else if (this.times[exist_pos] < times[new_pos]) {
                [new_times, exist_pos] = this.handleExistingDataPoint(
                    new_times, new_values, exist_pos, times[new_pos])
            } else {
                [new_times, new_pos] = this.handleNewDataPoint(
                    new_times, new_values, trace_id, times, values,
                    new_pos, this.times[exist_pos])
            }
        }
        this.updateDataArrays(new_times, new_values)
    }

    private initializeNewArrays(
        new_values: {[trace_id: number]: (number|null)[]}
    ) {
        for (const t_id of this.trace_by_col) {
            new_values[t_id] = []
        }
    }

    private appendRemainingNewData(
        new_times: number[],
        new_values: {[trace_id: number]: (number|null)[]},
        trace_id: number,
        times: number[],
        values: (number | null)[],
        new_pos: number
    ): number[] {
        const new_remain_len = times.length - new_pos
        for (let i = new_pos; i < times.length; i++) {
            new_times.push(times[i])
        }
        for (const do_id of this.trace_by_col) {
            if (do_id === trace_id) {
                for (let i = new_pos; i < values.length; i++) {
                    new_values[do_id].push(values[i])
                }
            } else {
                for (let i = 0; i < new_remain_len; i++) {
                    new_values[do_id].push(null)
                }
            }
        }
        return new_times
    }

    private appendRemainingExistingData(
        new_times: number[],
        new_values: {[trace_id: number]: (number|null)[]},
        exist_pos: number
    ): number[] {
        for (let i = exist_pos; i < this.times.length; i++) {
            new_times.push(this.times[i])
        }
        for (const do_id of this.trace_by_col) {
            const do_trace = this.traces[do_id]
            for (let i = exist_pos; i < do_trace.values.length; i++) {
                new_values[do_id].push(do_trace.values[i])
            }
        }
        return new_times
    }

    private mergeDataPoint(
        new_times: number[],
        new_values: {[trace_id: number]: (number|null)[]},
        trace_id: number,
        times: number[],
        values: (number | null)[],
        exist_pos: number,
        new_pos: number
    ) {
        new_times.push(times[new_pos])
        for (const do_id of this.trace_by_col) {
            const do_trace = this.traces[do_id]
            if (do_id === trace_id) {
                new_values[do_id].push(values[new_pos])
            } else {
                new_values[do_id].push(do_trace.values[exist_pos])
            }
        }
    }

    private handleExistingDataPoint(
        new_times: number[],
        new_values: {[trace_id: number]: (number|null)[]},
        exist_pos: number,
        next_new_time: number
    ): [number[], number] {
        const add_in_this = bisect(this.times, next_new_time)
        for (let i = exist_pos; i < add_in_this; i++) {
            new_times.push(this.times[i])
        }
        for (const do_id of this.trace_by_col) {
            const do_trace = this.traces[do_id]
            for (let i = exist_pos; i < add_in_this; i++) {
                new_values[do_id].push(do_trace.values[i])
            }
        }
        return [new_times, add_in_this]
    }

    private handleNewDataPoint(
        new_times: number[],
        new_values: {[trace_id: number]: (number|null)[]},
        trace_id: number,
        times: number[],
        values: (number | null)[],
        new_pos: number,
        next_exist_time: number
    ): [number[], number] {
        const exist_in_new = bisect(times, next_exist_time)
        for (let i = new_pos; i < exist_in_new; i++) {
            new_times.push(times[i])
        }
        for (const do_id of this.trace_by_col) {
            if (do_id === trace_id) {
                for (let i = new_pos; i < exist_in_new; i++) {
                    new_values[do_id].push(values[i])
                }
            } else {
                const add_new_len = exist_in_new - new_pos
                for (let i = 0; i < add_new_len; i++) {
                    new_values[do_id].push(null)
                }
            }
        }
        return [new_times, exist_in_new]
    }

    private updateDataArrays(
        new_times: number[],
        new_values: {[trace_id: number]: (number|null)[]}
    ) {
        this.times = new_times
        for (const do_id of this.trace_by_col) {
            this.traces[do_id].values = new_values[do_id]
        }
    }
}
