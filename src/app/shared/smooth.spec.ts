import { average, average_weighted, median } from './smooth'
import { Tag } from '../store/tag'

describe('shared\\smooth', () => {

  it('average_weighted: centres on requested sample, time weighted', () => {
    let tag1 = new Tag()
    tag1.history.times_ms = [10, 20,  50,   80,    90]
    tag1.history.values   = [ 1, 10, 100, 1000, 10000]
    let av40 = average_weighted(tag1, 40)
    expect(av40(0)).toEqual([10, 3.25])
    expect(av40(1)).toEqual([20, 5.5])
    expect(av40(2)).toEqual([50, 55])
    expect(av40(3)).toEqual([80, 2800])
    expect(av40(4)).toEqual([90, 5275])
  })

  it('average: centres on requested sample', () => {
    let tag2 = new Tag()
    tag2.history.times_ms = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    tag2.history.values   = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    let av1 = average(tag2, 1)
    expect(av1(1)).toEqual([2, 2])
    expect(av1(8)).toEqual([9, 9])
    expect(av1(14)).toEqual([15, 14.5])
    let av4 = average(tag2, 4)
    expect(av4(0)).toEqual([1, 3])
    expect(av4(8)).toEqual([9, 9])
    expect(av4(14)).toEqual([15, 13])
  })

  it('median: centres on requested sample', () => {
    let tag2 = new Tag()
    tag2.history.times_ms = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    tag2.history.values   = [1, 2, 55, 4, 5, 6, 7, 8, 55, 10, 11, 12, 13, 14, 55]
    let mv1 = median(tag2, 3)
    expect(mv1(1)).toEqual([2, 4])
    expect(mv1(8)).toEqual([9, 10])
    expect(mv1(14)).toEqual([15, 13])
  })
})