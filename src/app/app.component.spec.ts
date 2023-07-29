import { TestBed } from '@angular/core/testing'
import { AppComponent } from './app.component'
import { NavBarComponent } from './components/navbar/navbar.component'
import { PagesComponent } from './components/pages/pages.component'
import { FormComponent } from './components/form/form.component'
import { Component } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'

describe('AppComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    declarations: [AppComponent, MockBusComponent, NavBarComponent, PagesComponent, FormComponent],
    imports: [FormsModule, ReactiveFormsModule]
  }))

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  })

  it(`should have as title 'angmscada'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('angmscada');
  })

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // console.log(compiled.querySelector('.container-fluid div'))
    expect(compiled.querySelector('.container-fluid div')?.textContent).toContain('Mobile');
  })
})

@Component({
  selector: 'app-bus',
  template: ''
})
class MockBusComponent {
}
