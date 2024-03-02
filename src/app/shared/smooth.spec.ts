import { average } from './smooth'
import { Tag } from '../store/tag'

describe('shared\\smooth', () => {

  it('average: centres on requested sample, time weighted', () => {
    let tag1 = new Tag()
    tag1.history.times_ms = [10, 20,  50,   80,    90]
    tag1.history.values   = [ 1, 10, 100, 1000, 10000]
    let av10 = average(tag1, 10)
    expect(av10(0)).toEqual([10, 1])
    expect(av10(1)).toEqual([20, 5.5])
    expect(av10(2)).toEqual([50, 55])
    expect(av10(3)).toEqual([80, 550])
    expect(av10(4)).toEqual([90, 5500])
    let av40 = average(tag1, 40)
    expect(av40(0)).toEqual([10, 3.25])
    expect(av40(1)).toEqual([20, 5.5])
    expect(av40(2)).toEqual([50, 55])
    expect(av40(3)).toEqual([80, 2800])
    expect(av40(4)).toEqual([90, 5275])
    let av100 = average(tag1, 100)
    expect(av100(0)).toEqual([10, 13.6])
    expect(av100(1)).toEqual([20, 23.5])
    expect(av100(2)).toEqual([50, 1133.2])
    expect(av100(3)).toEqual([80, 4132])
    expect(av100(4)).toEqual([90, 5131])
  })

//   it('average: should return the first index greater if bounded', () => {
//     const vect = [1, 2, 3, 4, 5]
//     const value = 2.5
//     expect(bisect(vect, value)).toBe(2)
//   })

//   it('average: should return 0 if lower than all', () => {
//     const vect = [1, 2, 3, 4, 5]
//     const value = 0.5
//     expect(bisect(vect, value)).toBe(0)
//   })

//   it('average: should return length if lower than all', () => {
//     const vect = [1, 2, 3, 4, 5]
//     const value = 50
//     expect(bisect(vect, value)).toBe(5)
//   })

//   it('average: still work if short', () => {
//     const vect = [4]
//     const value = 6
//     expect(bisect(vect, value)).toBe(1)
//   })

//   it('average: still work if empty', () => {
//     const vect: number[] = []
//     const value = 6
//     expect(bisect(vect, value)).toBe(0)
//   })
})