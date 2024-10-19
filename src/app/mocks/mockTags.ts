import { TagSubject } from '../store/tag'

export const mockNow = Date.now()

export function setupMockTags(tagStore: TagSubject) {
    tagStore.add_tag({
        id: 1,
        name: 'Temperature',
        desc: 'Room temperature',
        type: 'float',
        value: 22.5,
        time_ms: mockNow,
        min: 0,
        max: 40,
        units: '°C',
        dp: 1,
        future_ms: 30000
    })

    tagStore.add_tag({
        id: 2,
        name: 'Pressure',
        desc: 'System pressure',
        type: 'int',
        value: 100,
        time_ms: mockNow,
        min: 0,
        max: 200,
        units: 'kPa',
        dp: 0,
        future_ms: 30000
    })

    tagStore.add_tag({
        id: 3,
        name: 'Status',
        desc: 'System status',
        type: 'string',
        value: 'Running',
        time_ms: mockNow,
        multi: ['Stopped', 'Starting', 'Running', 'Stopping'],
        future_ms: 30000
    })

    tagStore.add_tag({
        id: 4,
        name: 'Scratch',
        desc: 'Scratch pad',
        type: 'float',
        value: 0,
        time_ms: mockNow,
        min: -100,
        max: 100,
        dp: 2,
        future_ms: 30000
    })

    tagStore.add_tag({
        id: 5,
        name: 'DataSet',
        desc: 'Test data set',
        type: 'float',
        value: 50.0,
        time_ms: mockNow,
        min: 0,
        max: 100,
        units: 'units',
        dp: 1,
        future_ms: 30000
    })

    tagStore.add_tag({
        id: 6,
        name: 'TestValue',
        desc: 'Test Description',
        type: 'float',
        value: 123.45,
        time_ms: mockNow,
        min: 0,
        max: 200,
        units: 'units',
        dp: 2,
        future_ms: 30000
    })

    tagStore.update(1, mockNow - 60000, 21.5)
    tagStore.update(1, mockNow - 30000, 22.0)
    tagStore.update(1, mockNow, 22.5)

    tagStore.update(2, mockNow - 60000, 95)
    tagStore.update(2, mockNow - 30000, 98)
    tagStore.update(2, mockNow, 100)

    tagStore.update(3, mockNow - 60000, 'Stopped')
    tagStore.update(3, mockNow - 30000, 'Starting')
    tagStore.update(3, mockNow, 'Running')

    tagStore.update(5, mockNow - 60000, 40.0)
    tagStore.update(5, mockNow - 30000, 45.0)
    tagStore.update(5, mockNow, 50.0)

    tagStore.update(6, mockNow - 60000, 120.45)
    tagStore.update(6, mockNow - 30000, 122.45)
    tagStore.update(6, mockNow, 123.45)
}
