export type TimeNumberSeries = {times_ms: number[], values: number[]}
export type TimeStringSeries = {times_ms: number[], values: string[]}

/**
 * Return position of lookup in vect where vect is strictly increasing
 * limits are 0 and length
 */
export function bisect(vect: number[], lookup: number): number {
    let left = 0
    let right = vect.length - 1
    if (right < 0) { return 0 }
    while (left <= right) {
        const mid = Math.floor((left + right) / 2)
        if (vect[mid] === lookup) {
            return mid
        }
        else if (vect[mid] < lookup) {
            left = mid + 1
        }
        else {
            right = mid - 1
        }
    }
    return left
}

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