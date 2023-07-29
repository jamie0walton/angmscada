import { bisect, merge_time_series, TimeNumberSeries } from "./time_series"

describe('shared\\time_series bisect', () => {
    it('should return the index if lookup exists', () => {
        const vect = [1, 2, 3, 4, 5]
        const value = 3
        expect(bisect(vect, value)).toBe(2)
    })
    
    it('should return the first index greater if bounded', () => {
        const vect = [1, 2, 3, 4, 5]
        const value = 2.5
        expect(bisect(vect, value)).toBe(2)
    })
    
    it('should return 0 if lower than all', () => {
        const vect = [1, 2, 3, 4, 5]
        const value = 0.5
        expect(bisect(vect, value)).toBe(0)
    })
    
    it('should return length if lower than all', () => {
        const vect = [1, 2, 3, 4, 5]
        const value = 50
        expect(bisect(vect, value)).toBe(5)
    })
    
    it('still work if short', () => {
        const vect = [4]
        const value = 6
        expect(bisect(vect, value)).toBe(1)
    })
    
    it('still work if empty', () => {
        const vect: number[] = []
        const value = 6
        expect(bisect(vect, value)).toBe(0)
    })     
})

describe('shared\\time_series merge_time_series', () => {
    it('should append a on b', () => {
        let a: TimeNumberSeries = {
            times_ms: [101, 102, 103, 104, 105],
            values: [0, 100, 0, -100, 0]
        }
        let b: TimeNumberSeries = {
            times_ms: [1, 2],
            values: [999, 998]
        }
        let c: TimeNumberSeries = {
            times_ms: [1, 2, 101, 102, 103, 104, 105],
            values: [999, 998, 0, 100, 0, -100, 0]
        }
        expect(merge_time_series(a, b)).toEqual(c)
    })

    it('should append b on a', () => {
        let a: TimeNumberSeries = {
            times_ms: [101, 102, 103, 104, 105],
            values: [0, 100, 0, -100, 0]
        }
        let b: TimeNumberSeries = {
            times_ms: [901, 902],
            values: [999, 998]
        }
        let c: TimeNumberSeries = {
            times_ms: [101, 102, 103, 104, 105, 901, 902],
            values: [0, 100, 0, -100, 0, 999, 998]
        }
        expect(merge_time_series(a, b)).toEqual(c)
    })

    it('should merge a on b', () => {
        let a: TimeNumberSeries = {
            times_ms: [101, 102, 103, 104, 105],
            values: [0, 100, 0, -100, 0]
        }
        let b: TimeNumberSeries = {
            times_ms: [1, 2, 101, 102],
            values: [999, 998, 1, 101]
        }
        let c: TimeNumberSeries = {
            times_ms: [1, 2, 101, 102, 103, 104, 105],
            values: [999, 998, 1, 101, 0, -100, 0]
        }
        expect(merge_time_series(a, b)).toEqual(c)
    })

    it('should merge b on a', () => {
        let a: TimeNumberSeries = {
            times_ms: [101, 102, 103, 104, 105],
            values: [0, 100, 0, -100, 0]
        }
        let b: TimeNumberSeries = {
            times_ms: [104, 105, 901, 902],
            values: [-101, -1, 999, 998]
        }
        let c: TimeNumberSeries = {
            times_ms: [101, 102, 103, 104, 105, 901, 902],
            values: [0, 100, 0, -100, 0, 999, 998]
        }
        expect(merge_time_series(a, b)).toEqual(c)
    })
})