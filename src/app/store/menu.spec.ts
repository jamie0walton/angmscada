import { TestBed } from '@angular/core/testing'
import { MenuSubject } from './menu'
import { Menu } from './menu'

describe('store\\menu', () => {
    let service: MenuSubject

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [MenuSubject]
        })
        service = TestBed.inject(MenuSubject)
    })

    it('created', () => {
        expect(service).toBeTruthy()
    })

    it('initialize with loading state', () => {
        const initialMenu = service.get()
        expect(initialMenu).toEqual([{
            id: 0,
            name: 'Loading',
            parent: null
        }])
    })

    it('update menu when load is called', () => {
        const testMenu: Menu[] = [
            {
                id: 1,
                name: 'Test Menu',
                parent: null
            },
            {
                id: 2,
                name: 'Sub Menu',
                parent: 'Test Menu'
            }
        ]

        service.load(testMenu)
        
        // Check direct get() method
        expect(service.get()).toEqual(testMenu)
        
        // Check BehaviorSubject emission
        service.subject.subscribe(menu => {
            expect(menu).toEqual(testMenu)
        })
    })
}) 