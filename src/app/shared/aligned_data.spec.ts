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
    it('UplotVectors: single set tests', () => {
        let v, r
        v = new UplotVectors()
        v.add_history(10, tens, Array(tens.length).fill(1))
        r = v.get_uplot_data()
        expect(r).toEqual([tens, [1, 1, 1, 1, 1]])

        v.add_history(10, hi_evens, Array(tens.length).fill(2))
        r = v.get_uplot_data()
        expect(r).toEqual([
            joins(tens, hi_evens),
            [1, 1, 1, 1, 1, 2, 2, 2, 2, 2]
        ])

        v.add_history(10, lo_evens, Array(tens.length).fill(3))
        r = v.get_uplot_data()
        expect(r).toEqual([
            joins(tens, hi_evens, lo_evens),
            [3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2]
        ])

        v.add_history(10, lo_mix_odds, Array(tens.length).fill(4))
        r = v.get_uplot_data()
        expect(r).toEqual([
            joins(tens, hi_evens, lo_evens, lo_mix_odds),
            [3, 3, 3, 3, 4, 3, 4, 1, 4, 4, 4, 1, 1, 1, 1, 2, 2, 2, 2, 2]
        ])

        v.add_history(10, hi_mix_odds, Array(tens.length).fill(5))
        r = v.get_uplot_data()
        expect(r).toEqual([
            joins(tens, hi_evens, lo_evens, lo_mix_odds, hi_mix_odds),
            [3, 3, 3, 3, 4, 3, 4, 1, 4, 4, 4, 1, 1, 1, 5, 5, 5, 1, 5, 2, 5, 2, 2, 2, 2]
        ])

    })

    it('UplotVectors: multi set tests', () => {
        let v, r
        v = new UplotVectors()
        v.add_history(1, tens, Array(tens.length).fill(1))
        v.add_history(1, hi_evens, Array(tens.length).fill(2))
        v.add_history(2, tens, Array(tens.length).fill(1))
        v.add_history(2, lo_evens, Array(tens.length).fill(2))
        r = v.get_uplot_data()
        expect(r).toEqual([
            joins(tens, hi_evens, lo_evens),
            [null, null, null, null, null, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2],
            [2, 2, 2, 2, 2, 1, 1, 1, 1, 1, null, null, null, null, null]
        ])

        v.add_history(3, lo_mix_odds, Array(lo_mix_odds.length).fill(1))
        r = v.get_uplot_data()
        expect(r).toEqual([
            joins(tens, hi_evens, lo_evens, lo_mix_odds),
            [null, null, null, null, null, null, null, 1, null, null, null, 1, 1, 1, 1, 2, 2, 2, 2, 2],
            [2, 2, 2, 2, null, 2, null, 1, null, null, null, 1, 1, 1, 1, null, null, null, null, null],
            [null, null, null, null, 1, null, 1, null, 1, 1, 1, null, null, null, null, null, null, null, null, null]
        ])
    })

    it('UplotVectors: test smoother', () => {
        let v, r
        v = new UplotVectors()
        v.add_history(12, [5000], [5000])
        v.add_history(34, [5000], [5000])
        v.add_history(56, [5000], [5000])
        v.smoother_choose(12, 'tester')
        v.smoother_choose(34, 'tester')
        v.smoother_choose(56, 'tester')
        r = v.get_uplot_data()
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([0, 0, 0])
        expect(r).toEqual([
            [5000],
            [5000],
            [5000],
            [5000]
        ])

        v.add_history(34, [4980, 5020], [4980, 5020])
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([1, 0, 1])
        r = v.get_uplot_data()
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([1, 1, 1])
        expect(r).toEqual([
            [4980, 5000, 5020],
            [null, 5000, null],
            [4980, 5000, 5020],
            [null, 5000, null]
        ])

        v.add_history(12, [4960, 5040], [4960, 5040])
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([0, 2, 2])
        r = v.get_uplot_data()
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([2, 2, 2])
        expect(r).toEqual([
            [4960, 4980, 5000, 5020, 5040],
            [4960, null, 5000, null, 5040],
            [null, 4980, 5000, 5020, null],
            [null, null, 5000, null, null]
        ])

        v.add_history(12, [5060], [5060])
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([2, 2, 2])
        r = v.get_uplot_data()
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([4, 2, 2])
        expect(r).toEqual([
            [4960, 4980, 5000, 5020, 5040, 5060],
            [4960, null, 5000, null, 5040, 5060],
            [null, 4980, 5000, 5020, null, null],
            [null, null, 5000, null, null, null]
        ])

        v.add_history(56, [4940], [4940])
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([5, 3, 0])
        r = v.get_uplot_data()
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([5, 3, 0])
        expect(r).toEqual([
            [4940, 4960, 4980, 5000, 5020, 5040, 5060],
            [null, 4960, null, 5000, null, 5040, 5060],
            [null, null, 4980, 5000, 5020, null, null],
            [4940, null, null, 5000, null, null, null]
        ])

        v = new UplotVectors()
        v.add_history(12, [5000], [5000])
        v.add_history(34, [5000], [5000])
        v.add_history(56, [5000], [5000])
        v.smoother_choose(12, 'tester')
        v.smoother_choose(34, 'tester')
        v.smoother_choose(56, 'tester')
        r = v.get_uplot_data()

        v.add_history(34, [4978, 4980, 5020, 5022], [4978, 4980, 5020, 5022])
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([2, 0, 2])
        r = v.get_uplot_data()
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([2, 3, 2])
        expect(r).toEqual([
            [4978, 4980, 5000, 5020, 5022],
            [null, null, 5000, null, null],
            [4978, 4980, 5000, 5020, 5022],
            [null, null, 5000, null, null]
        ])

        v.add_history(12, [4958, 4960, 5040, 5042], [4958, 4960, 5040, 5042])
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([0, 5, 4])
        r = v.get_uplot_data()
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([7, 5, 4])
        expect(r).toEqual([
            [4958, 4960, 4978, 4980, 5000, 5020, 5022, 5040, 5042],
            [4958, 4960, null, null, 5000, null, null, 5040, 5042],
            [null, null, 4978, 4980, 5000, 5020, 5022, null, null],
            [null, null, null, null, 5000, null, null, null, null]
        ])

        v.add_history(12, [5060, 5062], [5060, 5062])
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([7, 5, 4])
        r = v.get_uplot_data()
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([9, 5, 4])
        expect(r).toEqual([
            [4958, 4960, 4978, 4980, 5000, 5020, 5022, 5040, 5042, 5060, 5062],
            [4958, 4960, null, null, 5000, null, null, 5040, 5042, 5060, 5062],
            [null, null, 4978, 4980, 5000, 5020, 5022, null, null, null, null],
            [null, null, null, null, 5000, null, null, null, null, null, null]
        ])

        v.add_history(56, [4938, 4940], [4938, 4940])
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([11, 7, 0])
        r = v.get_uplot_data()
        expect([v.traces[12].smooth_from, v.traces[34].smooth_from, v.traces[56].smooth_from]
            ).toEqual([11, 7, 1])
        expect(r).toEqual([
            [4938, 4940, 4958, 4960, 4978, 4980, 5000, 5020, 5022, 5040, 5042, 5060, 5062],
            [null, null, 4958, 4960, null, null, 5000, null, null, 5040, 5042, 5060, 5062],
            [null, null, null, null, 4978, 4980, 5000, 5020, 5022, null, null, null, null],
            [4938, 4940, null, null, null, null, 5000, null, null, null, null, null, null]
        ])
    })

    it('UplotVectors: averaging smoother', () => {
        let v
        v = new UplotVectors()
        v.add_history(22,
            [1000, 1020, 1030, 1040, 1050],
            [    0,   3,    6,    9,   12]
        )
        v.smoother_choose(22, 'average', 3)
        v.traces[22].smoother()
        expect([v.traces[22].smooth_from, v.traces[22].smooth]).toEqual([
            3, [1.5, 3, 6, 9, 10.5]
        ])
    })
    /*
    it('UplotVectors: averaging smoother', () => {
        let v, r
        v = new UplotVectors()
        v.add_history(55, [0, 10, 20, 30, 40], [3, 6, 9, 12, 15])
        v.smoother_choose(55, 'average', 3)
        expect(v.traces[55].smooth_from).toBe(0)
        r = v.get_uplot_data()
        expect(v.traces[55].smooth_from).toBe(3)
        expect(r).toEqual([
            [  0, 10, 20, 30,   40],
            [4.5,  6,  9, 12, 13.5]
        ])
        v.add_history(55, [50, 60, 70, 80, 90], [18, 15, 12, 9, 6])
        expect(v.traces[55].smooth_from).toBe(3)
        r = v.get_uplot_data()
        expect(v.traces[55].smooth_from).toBe(8)
        expect(r).toEqual([
            [  0, 10, 20, 30, 40, 50, 60, 70, 80,  90],
            [4.5,  6,  9, 12, 15, 16, 15, 12,  9, 7.5]
        ])
        v.add_history(17, [75, 85, 95, 105, 115], [1, 1, 5, 1, 1])
        expect(v.traces[55].smooth_from).toBe(8)
        r = v.get_uplot_data()
        expect(v.traces[55].smooth_from).toBe(9)
        expect(r).toEqual([
            [  0, 10, 20, 30, 40, 50, 60, 70, 75, 80, 85, 90, 95, 105, 115],
            [4.5,  6,  9, 12, 15, 16, 15, 12, null, 9, null, 7.5, null, null, null],
            [null, null, null, null, null, null, null, null, 1, null, 1, null, 5, 1, 1]
        ])

        v.add_history(55,[100, 110, 120, 130, 140], [3, 0, 0, 3, 6])
        expect(v.traces[55].smooth_from).toBe(9)
        r = v.get_uplot_data()
        expect(v.traces[55].smooth_from).toBe(18)
        expect(r).toEqual([
            [  0, 10, 20, 30, 40, 50, 60, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 130, 140],
            [4.5,  6,  9, 12, 15, 16, 15, 12, null, 9, null, 6, null, 3, null, 1, null, 1, 3, 4.5],
            [null, null, null, null, null, null, null, null, 1, null, 1, null, 5, null, 1, null, 1, null, null, null]
        ])
    })
    */
})
