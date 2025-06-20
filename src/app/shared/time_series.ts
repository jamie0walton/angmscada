import { bisect } from "./functions"

export type TimeNumberSeries = {times_ms: number[], values: number[]}
export type TimeStringSeries = {times_ms: number[], values: string[]}

/**
 * Return the a new series based on updating ordered_series with update_series.
 * 
 * ordered_series is strictly increasing in time with no duplicates.
 * ordered_series will start empty and shall be maintained ordered by
 * this function.
 * 
 * update_series has three specific forms, any mix may occur together:
 * - Single value with the time before, during or after  ordered_series times
 *   If the time matches an existing time, the value is replaced.
 * - Multiple values with a large set of times before the ordered_series
 * - Multiple values with some overlap at the end of ordered_series. This
 *   set of data shall generally replace ordered_series.
 * 
 * update_series may have several values for the same time. Normalise
 * update_series first so that only one value is present for each time and
 * that this values is the last value for that time in the received
 * update_series.
 */
export function merge_time_series<Type>(
    ordered_series: {times_ms: number[], values: Type[]},
    update_series: {times_ms: number[], values: Type[]}
): {times_ms: number[], values: Type[]} {
    console.log('Input ordered_series:', {
        times: ordered_series.times_ms,
        values: ordered_series.values
    })
    console.log('Input update_series:', {
        times: update_series.times_ms,
        values: update_series.values
    })

    // First normalize update_series to handle duplicate times
    const normalized: {times_ms: number[], values: Type[]} = {times_ms: [], values: []}
    const seen = new Map<number, Type>()
    // Process in reverse to keep last value for each time
    for (let i = update_series.times_ms.length - 1; i >= 0; i--) {
        const time = update_series.times_ms[i]
        if (!seen.has(time)) {
            seen.set(time, update_series.values[i])
        }
    }
    // Convert map back to arrays, maintaining time order
    const sortedTimes = Array.from(seen.keys()).sort((a, b) => a - b)
    normalized.times_ms = sortedTimes
    normalized.values = sortedTimes.map(time => seen.get(time)!)
    console.log('Normalized update_series:', {
        times: normalized.times_ms,
        values: normalized.values
    })

    // Handle empty ordered_series case
    if (ordered_series.times_ms.length === 0) {
        console.log('Empty ordered_series case - returning normalized')
        return normalized
    }

    // Handle single value case
    if (normalized.times_ms.length === 1) {
        const time = normalized.times_ms[0]
        const value = normalized.values[0]
        const insertIndex = bisect(ordered_series.times_ms, time)
        if (insertIndex < ordered_series.times_ms.length && ordered_series.times_ms[insertIndex] === time) {
            // Replace existing value
            ordered_series.values[insertIndex] = value
            console.log('Single value case - replaced existing value at index', insertIndex)
        } else {
            // Insert new value
            ordered_series.times_ms.splice(insertIndex, 0, time)
            ordered_series.values.splice(insertIndex, 0, value)
            console.log('Single value case - inserted new value at index', insertIndex)
        }
        console.log('Single value case - returning:', {
            times: ordered_series.times_ms,
            values: ordered_series.values
        })
        return ordered_series
    }

    // Unified approach for all other cases
    console.log('Multiple values case - processing')
    const result: {times_ms: number[], values: Type[]} = {times_ms: [], values: []}
    let orderedIndex = 0
    let updateIndex = 0
    while (orderedIndex < ordered_series.times_ms.length || updateIndex < normalized.times_ms.length) {
        if (orderedIndex >= ordered_series.times_ms.length) {
            // Only update values remain
            result.times_ms.push(...normalized.times_ms.slice(updateIndex))
            result.values.push(...normalized.values.slice(updateIndex))
            break
        }
        if (updateIndex >= normalized.times_ms.length) {
            // Only ordered values remain
            result.times_ms.push(...ordered_series.times_ms.slice(orderedIndex))
            result.values.push(...ordered_series.values.slice(orderedIndex))
            break
        }
        const orderedTime = ordered_series.times_ms[orderedIndex]
        const updateTime = normalized.times_ms[updateIndex]
        if (orderedTime < updateTime) {
            // Keep ordered value
            result.times_ms.push(orderedTime)
            result.values.push(ordered_series.values[orderedIndex])
            orderedIndex++
        } else if (orderedTime > updateTime) {
            // Add update value
            result.times_ms.push(updateTime)
            result.values.push(normalized.values[updateIndex])
            updateIndex++
        } else {
            // Times match, use update value
            result.times_ms.push(updateTime)
            result.values.push(normalized.values[updateIndex])
            orderedIndex++
            updateIndex++
        }
    }
    console.log('Multiple values case - returning:', {
        times: result.times_ms,
        values: result.values
    })
    return result
}