import { UplotVectors } from "./aligned_data"

var tens = [10, 20, 30, 40, 50]
var lo_evens = [ 0,  2,  4,  6,  8]
var hi_evens = [52, 54, 56, 58, 60]
var lo_mix_odds = [7, 9, 11, 13, 15]
var hi_mix_odds = [45, 47, 49, 51, 53]

function joins(...numlists: number[][]) {
    let olist: number[] = []
    for (let i = 0; i < numlists.length; i++) {
        const numlist = numlists[i]
        olist.push(...numlist)
    }
    olist.sort((a, b) => a - b)
    return olist
}

describe('shared\\aligned_data', () => {
    it('single set tests', () => {
        let v, r
        v = new UplotVectors()
        v.add_history(10, tens.map(x => x * 1000), Array(tens.length).fill(1))
        r = v.get_uplot_data()
        expect(r).toEqual([tens, [1, 1, 1, 1, 1]])

        v.add_history(10, hi_evens.map(x => x * 1000), Array(tens.length).fill(2))
        r = v.get_uplot_data()
        expect(r).toEqual([
            joins(tens, hi_evens),
            [1, 1, 1, 1, 1, 2, 2, 2, 2, 2]
        ])

        v.add_history(10, lo_evens.map(x => x * 1000), Array(tens.length).fill(3))
        r = v.get_uplot_data()
        expect(r).toEqual([
            joins(tens, hi_evens, lo_evens),
            [3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2]
        ])

        v.add_history(10, lo_mix_odds.map(x => x * 1000), Array(tens.length).fill(4))
        r = v.get_uplot_data()
        expect(r).toEqual([
            joins(tens, hi_evens, lo_evens, lo_mix_odds),
            [3, 3, 3, 3, 4, 3, 4, 1, 4, 4, 4, 1, 1, 1, 1, 2, 2, 2, 2, 2]
        ])

        v.add_history(10, hi_mix_odds.map(x => x * 1000), Array(tens.length).fill(5))
        r = v.get_uplot_data()
        expect(r).toEqual([
            joins(tens, hi_evens, lo_evens, lo_mix_odds, hi_mix_odds),
            [3, 3, 3, 3, 4, 3, 4, 1, 4, 4, 4, 1, 1, 1, 5, 5, 5, 1, 5, 2, 5, 2, 2, 2, 2]
        ])
    })

    it('multi set tests', () => {
        let v, r
        v = new UplotVectors()
        v.add_history(1, tens.map(x => x * 1000), Array(tens.length).fill(1))
        v.add_history(1, hi_evens.map(x => x * 1000), Array(tens.length).fill(2))
        v.add_history(2, tens.map(x => x * 1000), Array(tens.length).fill(1))
        v.add_history(2, lo_evens.map(x => x * 1000), Array(tens.length).fill(2))
        r = v.get_uplot_data()
        expect(r).toEqual([
            joins(tens, hi_evens, lo_evens),
            [null, null, null, null, null, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2],
            [2, 2, 2, 2, 2, 1, 1, 1, 1, 1, null, null, null, null, null]
        ])

        v.add_history(3, lo_mix_odds.map(x => x * 1000), Array(lo_mix_odds.length).fill(1))
        r = v.get_uplot_data()
        expect(r).toEqual([
            joins(tens, hi_evens, lo_evens, lo_mix_odds),
            [null, null, null, null, null, null, null, 1, null, null, null, 1, 1, 1, 1, 2, 2, 2, 2, 2],
            [2, 2, 2, 2, null, 2, null, 1, null, null, null, 1, 1, 1, 1, null, null, null, null, null],
            [null, null, null, null, 1, null, 1, null, 1, 1, 1, null, null, null, null, null, null, null, null, null]
        ])
    })
})