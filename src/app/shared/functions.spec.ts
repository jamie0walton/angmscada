import { bisect } from './functions'

describe('shared\\functions', () => {

  it('return the index if lookup exists', () => {
    const vect = [1, 2, 3, 4, 5]
    const value = 3
    expect(bisect(vect, value)).toBe(2)
  })

  it('return the first index greater if bounded', () => {
    const vect = [1, 2, 3, 4, 5]
    const value = 2.5
    expect(bisect(vect, value)).toBe(2)
  })

  it('return 0 if lower than all', () => {
    const vect = [1, 2, 3, 4, 5]
    const value = 0.5
    expect(bisect(vect, value)).toBe(0)
  })

  it('return length if lower than all', () => {
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