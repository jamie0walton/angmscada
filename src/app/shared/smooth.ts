import {Tag} from 'src/app/store/tag'

export function raw(tag: Tag) {
    return function(i: number) {
        const time_ms = tag.history.times_ms[i]
        const value = tag.history.values[i]
        return [time_ms, value]
    }
}

export function median(tag: Tag, samples: number = 3) {
    return function(index: number) {
        let times_ms = tag.history.times_ms
        let values = tag.history.values
        let start = Math.max(index - samples, 0)
        let end = Math.min(index + samples, times_ms.length - 1)
        let set = []
        for (let i = start; i <= end; i++) {
            set.push(values[i])
        }
        set.sort((a, b) => a - b)
        return [times_ms[index], set[Math.floor((end - start) / 2)]]
    }
}

export function average(tag: Tag, samples: number = 3) {
    return function(index: number) {
        let times_ms = tag.history.times_ms
        let values = tag.history.values
        let start = Math.max(index - samples, 0)
        let end = Math.min(index + samples, times_ms.length - 1)
        let sum = 0
        for (let i = start; i <= end; i++) {
            sum += values[i]
        }
        return [times_ms[index], sum / (end - start + 1)]
    }
}

export function average_weighted(tag: Tag, duration: number = 600000) {
    return function(index: number): [number, number] {
        let times_ms = tag.history.times_ms
        let values = tag.history.values
        let sum = 0

        // Start from the given index and work earlier
        let start_time = times_ms[index] - duration / 2
        let i = index
        while (true) {
            i--
            if (i < 0) {
                sum += (times_ms[0] - start_time) * values[0]
                break
            }
            else if (times_ms[i] < start_time) {
                sum += (times_ms[i + 1] - start_time) * values[i]
                break
            }
            else {
                sum += (times_ms[i + 1] - times_ms[i]) * values[i]
            }
        }

        // Start from the given index and work later
        let end_time = times_ms[index] + duration / 2
        i = index
        while (true) {
            i++
            if (i >= times_ms.length || times_ms[i] > end_time) {
                sum += (end_time - times_ms[i - 1]) * values[i - 1]
                break
            }
            else {
                sum += (times_ms[i] - times_ms[i - 1]) * values[i - 1]
            }
        }

        return [times_ms[index], sum / duration]
    }
}