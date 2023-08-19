import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { BusComponent } from './components/bus/bus.component';
import { NavBarComponent } from './components/navbar/navbar.component';
import { PagesComponent } from './components/pages/pages.component';
import { AlarmsComponent } from './components/alarms/alarms.component';
import { CalloutComponent } from './components/callout/callout.component';
import { DescStringBigComponent } from './components/desc-string-big/desc-string-big.component';
import { DescStringListComponent } from './components/desc-string-list/desc-string-list.component';
import { DragsheetComponent } from './components/dragsheet/dragsheet.component';
import { DrawingsComponent } from './components/drawings/drawings.component';
import { FormComponent } from './components/form/form.component';
import { IconComponent } from './components/icon/icon.component';
import { OpNotesComponent } from './components/opnotes/opnotes.component';
import { ProgressComponent } from './components/progress/progress.component';
import { SetpointComponent } from './components/setpoint/setpoint.component';
import { StringSetpointComponent } from './components/string-setpoint/string-setpoint.component';
import { UploadComponent } from './components/upload/upload.component';
import { UplotComponent } from './components/uplot/uplot.component';
import { ValueComponent } from './components/value/value.component';
import { DndDirective } from './shared/dnd.directive';
import { DropdownDirective } from './shared/dropdown.directive';
import { msMultiPipe, msTimePipe, msDatePipe, msNL2BRPipe } from './shared/pipe';

@NgModule({
  declarations: [
    AppComponent,
    BusComponent,
    NavBarComponent,
    PagesComponent,
    AlarmsComponent,
    CalloutComponent,
    DescStringBigComponent,
    DescStringListComponent,
    DragsheetComponent,
    DrawingsComponent,
    FormComponent,
    IconComponent,
    OpNotesComponent,
    ProgressComponent,
    SetpointComponent,
    StringSetpointComponent,
    UploadComponent,
    UplotComponent,
    ValueComponent,
    DndDirective,
    DropdownDirective,
    msMultiPipe, msDatePipe, msTimePipe, msNL2BRPipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
