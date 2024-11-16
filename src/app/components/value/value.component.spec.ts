import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ValueComponent } from './value.component'
import { By } from '@angular/platform-browser'
import { Component } from '@angular/core'
import { TagSubject } from '../../store/tag'
import { setupMockTags } from '../../mocks/mockTags'

// Create a test host component
@Component({
    template: '<app-value [item]="item"></app-value>'
})
class TestHostComponent {
    item = { style: 'test-style', tagname: 'TestValue' }
}

describe('components\\value', () => {
    let hostComponent: TestHostComponent
    let valueComponent: ValueComponent
    let fixture: ComponentFixture<TestHostComponent>
    let tagStore: TagSubject

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ ValueComponent, TestHostComponent ],
            providers: [ TagSubject ]
        }).compileComponents()

        tagStore = TestBed.inject(TagSubject)
        setupMockTags(tagStore)

        fixture = TestBed.createComponent(TestHostComponent)
        hostComponent = fixture.componentInstance
        valueComponent = fixture.debugElement.query(By.directive(ValueComponent)).componentInstance
        fixture.detectChanges()
        await fixture.whenStable()
    })

    it('create', () => {
        expect(valueComponent).toBeTruthy()
    })

    it('display the correct description', () => {
        const descElement = fixture.debugElement.query(By.css('.ms-pad-v-s'))
        expect(descElement.nativeElement.textContent.trim()).toBe('Test Description')
    })

    it('apply the correct style class', () => {
        const rowElement = fixture.debugElement.query(By.css('.row'))
        expect(rowElement.nativeElement.classList).toContain('test-style')
    })

    it('display the correct formatted value for float', () => {
        const valueElement = fixture.debugElement.query(By.css('.col-8.ms-pad-v-e'))
        expect(valueElement.nativeElement.textContent).toContain('123.45')
    })

    it('display the correct units', () => {
        const unitsElement = fixture.debugElement.query(By.css('.col-4.ms-pad-v-s'))
        expect(unitsElement.nativeElement.textContent).toContain('units')
    })

    it('update when tag value changes', async () => {
        const newTime = Date.now()
        tagStore.update(6, newTime, 150.67)
        fixture.detectChanges()
        await fixture.whenStable()
        const valueElement = fixture.debugElement.query(By.css('.col-8.ms-pad-v-e'))
        expect(valueElement.nativeElement.textContent).toContain('150.67')
    })

    // Add more tests for different formats (int, multi, time, date, etc.)

    it('have correct tag data', () => {
        expect(valueComponent['tag']).withContext('Component should have tag data').toBeTruthy()
        expect(valueComponent['tag'].desc).toBe('Test Description')
        expect(valueComponent['tag'].value).toBe(123.45)
    });
});
