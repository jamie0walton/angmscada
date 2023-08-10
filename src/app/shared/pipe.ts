import { Pipe, PipeTransform } from '@angular/core'

@Pipe({name: 'msMulti'})
export class msMultiPipe implements PipeTransform {
    transform(value: number|null, multi: string[]|null): string {
        if (typeof(value) === 'number' && Array.isArray(multi) && value < multi.length) {
            return multi[value]
        }
            return 'INVALID'
    }
}

@Pipe({name: 'msTime'})
export class msTimePipe implements PipeTransform {
    transform(sec: number, short: boolean = false): string {
        if (typeof sec == 'number') {
            const d = new Date(sec * 1000)
            if(short){
                return d.toLocaleTimeString([], {hour12: false, hour: "2-digit", minute: "2-digit"} as any)
            }
            else {
                return d.toLocaleTimeString([], {hour12: false} as any)
            }
        }
        else {
            return ""
        }
    }
}

@Pipe({name: 'msDate'})
export class msDatePipe implements PipeTransform {
    transform(sec: number): string {
        if (typeof sec == 'number') {
            const d = new Date(sec * 1000)
            return d.toLocaleDateString([], { day: 'numeric', month: 'numeric' } as any)
        }
        else {
            return ""
        }
    }
}

@Pipe({name: 'msNL2BR'})
export class msNL2BRPipe implements PipeTransform {
    transform(txt: string): string {
        if (typeof txt == 'string') {
            return "<p>" + txt.replace(/\r?\n|\r/g, '<br/>') + "</p>"
        }
        else {
            return ""
        }
    }
}
