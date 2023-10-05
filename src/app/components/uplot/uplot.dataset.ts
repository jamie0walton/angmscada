import { Tag, History } from 'src/app//store/tag'

export class UplotDataSet {
    tags: Tag[]
    times: { [key: number]: (number | null)[] }
    raw: (number|null)[][]
    show: [number[], ...(number | null)[][]]
    last: { [key: number]: {
        start_ms: number
        end_ms: number
    }}
    start_ms: number
    end_ms: number
    updateshow: boolean

    constructor() {
        this.tags = []
        this.times = {}
        this.last = {}
        this.raw = [[]]
        this.show = [[]]
        let now = new Date().getTime() / 1000
        this.end_ms = now
        this.start_ms = now - 3600 * 4
        this.updateshow = false
    }

    set_duration(duration: number) {
        // Set duration in seconds.
        let now = new Date().getTime() / 1000
        this.end_ms = now
        this.start_ms = now - duration
    }

    update_show() {
        const start = this.raw[0].findIndex(element => element)
    }

    populate_raw() {
        this.raw = [[]]
        for (let index = 0; index < this.tags.length; index++) {
            this.raw.push([])
        }
        let times = Object.keys(this.times).sort()
        for (let index = 0; index < times.length; index++) {
            const time = parseFloat(times[index])
            this.raw[0].push(time)
            for (let index = 1; index < this.raw.length; index++) {
                // const HACK: any = this.times[time][index - 1]
                // this.raw[index].push(HACK)
                let yValues = this.raw[index] as (number | null)[];
                yValues.push(this.times[time][index - 1])
            }
        }
    }

    private add_to_times(index: number, history: History) {
        for (let j = 0; j < history.length; j++) {
            const record = history[j]
            this.times[record[0]] ??= Array(this.tags.length).fill(null)
            this.times[record[0]][index] = record[1]
        }
    }

    update_tag_data(tag: Tag) {
        // Any time that tag value or history changes
        if (tag.id === null) {return}
        let tagid = tag.id
        const newtimes = tag.history.filter(record => record[0] < this.last[tagid].start_ms || record[0] > this.last[tagid].end_ms)
        this.add_to_times(this.tags.indexOf(tag), newtimes)
        this.populate_raw()
    }

    init_tags(tags: Tag[]) {
        // Call once with all the tags required.
        this.tags = tags
        for (let i = 0; i < tags.length; i++) {
            const tag = tags[i]
            if (tag.id === null) {return}
            this.last[tag.id] = {
                start_ms: tag.history[0][0],
                end_ms: tag.history[tag.history.length - 1][0]
            }
            this.add_to_times(i, tag.history)
        }
        this.populate_raw()
    }
}