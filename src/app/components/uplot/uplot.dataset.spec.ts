import { TestBed } from '@angular/core/testing'
import { UplotDataSet } from './uplot.dataset'
import { TagSubject } from 'src/app/store/tag'
import { setupMockTags } from 'src/app/mocks/mockTags'

describe('components\\uplot\\dataset', () => {
    let tagStore: TagSubject
    let uplotDataSet: UplotDataSet

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TagSubject, UplotDataSet]
        })
        tagStore = TestBed.inject(TagSubject)
        setupMockTags(tagStore)
        uplotDataSet = TestBed.inject(UplotDataSet)
    })

    it('create an instance', () => {
        expect(uplotDataSet).toBeTruthy()
    })

    it('set duration correctly with a single number', () => {
        uplotDataSet.set_duration(60)
        expect(uplotDataSet.age).toBe(-60)
        expect(uplotDataSet.future).toBe(0)
        expect(uplotDataSet.duration).toBe(-60)
    })

    it('set duration correctly with an array', () => {
        uplotDataSet.set_duration([-30, 15])
        expect(uplotDataSet.age).toBe(30)
        expect(uplotDataSet.future).toBe(15)
        expect(uplotDataSet.duration).toBe(45)
    })

    it('set duration correctly for minutes', () => {
        uplotDataSet.set_duration_string('5m')
        expect(uplotDataSet.age).toBe(300)
    })

    it('set duration correctly for hours', () => {
        uplotDataSet.set_duration_string('2h')
        expect(uplotDataSet.age).toBe(7200)
    })

    it('update x-axis range when given a range', () => {
        const range: [number, number] = [1000, 2000]
        uplotDataSet.axes['x'] = { range: [0, 0], configrange: [0, 0], zoomrange: [0, 0], reset: false }
        uplotDataSet.step_x_axis(range)
        expect(uplotDataSet.axes['x'].range).toEqual(range)
    })

    it('update x-axis range based on age and future when no range is given', () => {
        const now = Date.now() / 1000
        uplotDataSet.age = -60
        uplotDataSet.future = 30
        uplotDataSet.axes['x'] = { range: [0, 0], configrange: [0, 0], zoomrange: [0, 0], reset: false }
        uplotDataSet.step_x_axis()
        expect(uplotDataSet.axes['x'].range[0]).toBeCloseTo(now - uplotDataSet.age)
        expect(uplotDataSet.axes['x'].range[1]).toBeCloseTo(now + uplotDataSet.future)
    })

    it('set y-axis ranges correctly', () => {
        const axis = 'y1'
        const range: [number, number] = [0, 100]
        uplotDataSet.set_yaxes(axis, range)
        expect(uplotDataSet.axes[axis].configrange).toEqual(range)
        expect(uplotDataSet.axes[axis].range).toEqual(range)
        expect(uplotDataSet.axes[axis].zoomrange).toEqual(range)
        expect(uplotDataSet.axes[axis].reset).toBeTrue()
    })
})
