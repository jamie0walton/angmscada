import { Tag } from "./tag"

describe('store\\tag', () => {
    it('should create a tag', () => {
        let tag1 = new Tag()
        expect(tag1.id).toBeNull()
        expect(tag1.age_ms).toEqual(0)
    })
})