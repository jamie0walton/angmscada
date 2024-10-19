import { TestBed } from '@angular/core/testing'
import { TagSubject } from "./tag"
import { mockNow, setupMockTags } from '../mocks/mockTags'

describe('store\\tag', () => {
    let tagStore: TagSubject

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TagSubject]
        })
        tagStore = TestBed.inject(TagSubject)
        setupMockTags(tagStore)
    })

    it('should have correct properties for Temperature tag', () => {
        const tempTag = tagStore.tag_by_name['Temperature']
        expect(tempTag.id).toBe(1)
        expect(tempTag.value).toBe(22.5)
        expect(tempTag.history.values.length).toBe(3)
        expect(tempTag.history.times_ms[0]).toBe(mockNow - 60000)
        expect(tempTag.history.values[0]).toBe(21.5)
    })

    it('should have correct properties for Pressure tag', () => {
        const pressureTag = tagStore.tag_by_name['Pressure']
        expect(pressureTag.id).toBe(2)
    })

    it('should have correct properties for Status tag', () => {
        const statusTag = tagStore.tag_by_name['Status']
        expect(statusTag.id).toBe(3)
    })

    it('should have correct history for Temperature tag', () => {
        const tempTag = tagStore.tag_by_name['Temperature']
        expect(tempTag.history.times_ms.length).toBe(3)
    })

    it('should have correct string history for Status tag', () => {
        const statusTag = tagStore.tag_by_name['Status']
        expect(statusTag.stringhistory.times_ms.length).toBe(3)
    })

    it('should update tag values', () => {
        const scratchTag = tagStore.tag_by_name['Scratch']
        const initialLength = scratchTag.history.values.length
        const newTime = Date.now()
        tagStore.update(4, newTime, 24.5)
        expect(scratchTag.history.values.length).toBe(initialLength + 1)
        expect(scratchTag.value).toBe(24.5)
    })

    it('should provide a subject for observing tag changes', (done) => {
        const scratchSubject = tagStore.subject('Scratch')
        let emissionCount = 0
        const subscription = scratchSubject.subscribe(tag => {
            emissionCount++
            if (emissionCount === 1) {
                // First emission is the current value
                expect(tag.name).toBe('Scratch')
                expect(tag.value).toBe(0)
            } else if (emissionCount === 2) {
                // Second emission is the updated value
                expect(tag.name).toBe('Scratch')
                expect(tag.value).toBe(24.5)
                subscription.unsubscribe()
                done()
            }
        })
        const newTime = Date.now()
        tagStore.update(4, newTime, 24.5)
    })
})
