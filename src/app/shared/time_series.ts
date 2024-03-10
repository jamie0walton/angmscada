import { bisect } from "./functions"

export type TimeNumberSeries = {times_ms: number[], values: number[]}
export type TimeStringSeries = {times_ms: number[], values: string[]}

/**
 * Return the earliest series extended with the latest. Assumes strictly
 * increasing time and that overlaps are identical.
 */
export function merge_time_series<Type>(
    a_series: {times_ms: number[], values: Type[]},
    b_series: {times_ms: number[], values: Type[]}
): {times_ms: number[], values: Type[]} {
    const a_len = a_series.times_ms.length
    const b_len = b_series.times_ms.length
    if ( a_series.times_ms[a_len - 1] < b_series.times_ms[0]) {
        // clean append to a_series
        a_series.times_ms.push(...b_series.times_ms)
        a_series.values.push(...b_series.values)
        return a_series
    }
    else if ( b_series.times_ms[b_len - 1] < a_series.times_ms[0]) {
        // clean append to b_series
        b_series.times_ms.push(...a_series.times_ms)
        b_series.values.push(...a_series.values)
        return b_series
    }
    else if ( a_series.times_ms[0] < b_series.times_ms[0]) {
        // pruned append to a_series, succeed when b totally inside a
        let end = bisect(b_series.times_ms, a_series.times_ms[a_len - 1]) + 1
        a_series.times_ms.push(...b_series.times_ms.slice(end))
        a_series.values.push(...b_series.values.slice(end))
        return a_series
    }
    else { // effectively b_series.times_ms[0] < a_series.times_ms[0]
        // pruned append to b_series, succeed when a totally inside b
        let end = bisect(a_series.times_ms, b_series.times_ms[b_len - 1]) + 1
        b_series.times_ms.push(...a_series.times_ms.slice(end))
        b_series.values.push(...a_series.values.slice(end))
        return b_series
    }
}