import { Pipe, PipeTransform } from '@angular/core'

@Pipe({name: 'msSelect'})
export class msSelectPipe implements PipeTransform {
    transform(value: number|null, opts: any): string {
        if (opts.type == 'multi') {
            if (typeof(value) === 'number' && Array.isArray(opts.multi) && value < opts.multi.length) {
                return opts.multi[value]
            }
        }
        else if (opts.type == 'float') {
            if (typeof(value) == 'number') {
                return value.toFixed(opts.dp)
            }
        }
        return 'INVALID'
    }
}

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
    transform(usec: number, short: boolean = false): string {
        if (typeof usec == 'number') {
            const d = new Date(usec / 1000)
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
    transform(usec: number): string {
        if (typeof usec == 'number') {
            const d = new Date(usec / 1000)
            return d.toLocaleDateString([], { day: 'numeric', month: 'short' } as any)
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
            return "<p class='mb-2'>" + txt.replace(/\r?\n|\r/g, '<br/>') + "</p>"
        }
        else {
            return ""
        }
    }
}
