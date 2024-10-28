/*
This is a test for the BusComponent.

Never mock WebSocket, the test setup includes running the pymscada wwwserver
which provides a real WebSocket connection.

Do not use fakeAsync or tick.

The pymscada wwwserver provides values. It is NEVER necessary to create a dummy
variable load in testing as these ALWAYS come from the wwwserver.
*/
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { BusComponent } from './bus.component'
import { ConfigSubject } from 'src/app/store/config'
import { TagSubject } from 'src/app/store/tag'
import { PageSubject } from 'src/app/store/page'
import { MenuSubject } from 'src/app/store/menu'
import { SendFileSubject } from 'src/app/store/sendfile'
import { CommandSubject } from 'src/app/store/command'

describe('components\\bus', () => {
    let component: BusComponent
    let fixture: ComponentFixture<BusComponent>
    let configSubject: ConfigSubject
    let tagSubject: TagSubject
    let pageSubject: PageSubject
    let commandSubject: CommandSubject

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [ BusComponent ],
            providers: [
                ConfigSubject,
                TagSubject,
                PageSubject,
                MenuSubject,
                SendFileSubject,
                CommandSubject
            ]
        }).compileComponents()

        configSubject = TestBed.inject(ConfigSubject)
        configSubject.set_ws('ws://127.0.0.1:9325/ws')
        tagSubject = TestBed.inject(TagSubject)
        pageSubject = TestBed.inject(PageSubject)
        commandSubject = TestBed.inject(CommandSubject)

        fixture = TestBed.createComponent(BusComponent)
        component = fixture.componentInstance
    })

    it('should have the correct ws url', () => {
        expect(configSubject.get().ws).toBe('ws://127.0.0.1:9325/ws')
    })

    it('should run ngOnInit and establish WebSocket connection', (done) => {
        fixture.detectChanges() // This triggers ngOnInit
        setTimeout(() => {
            expect(component.ws).toBeDefined()
            expect(component.ws?.readyState).toBe(WebSocket.OPEN)
            done()
        }, 500)
    })

    it('should return the value of the IntVal tag', (done) => {
        let test: number = 0
        fixture.detectChanges() // This triggers ngOnInit
        let tagsub = tagSubject.subject('IntVal').subscribe(tag => {
            if(tag.value == null) {
                test |= 0x1  // initially return null
            }
            else if(tag.value == 1) {
                test |= 0x2  // when it updates return 1
            }
        })
        setTimeout(() => {
            tagsub.unsubscribe()
            expect(test).toBe(3)  // both flags are set is a success
            done()
        }, 1500)
    })

    it('should increment the IntSet tag', (done) => {
        let count = 0
        fixture.detectChanges() // This triggers ngOnInit
        let tagsub = tagSubject.subject('IntSet').subscribe(tag => {
            if(tag.value == null) {
                return  // wait for the initial value
            }
            count += 1
            commandSubject.command({
                'type': 'set',
                'tagname': 'IntSet',
                'value': tag.value + 1
            })
        })
        setTimeout(() => {
            tagsub.unsubscribe()
            expect(count).toBeGreaterThan(10)
            done()
        }, 1000)
    })
})
