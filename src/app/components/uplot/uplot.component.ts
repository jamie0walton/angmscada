import { Component, OnInit, OnDestroy, Input, ViewChild, HostListener, ElementRef, inject } from '@angular/core'
import { timer, Observable } from 'rxjs'
import uPlot from 'uplot'
import { DataSet } from 'src/app/shared/datasets'
import { Tag, TagSubject } from 'src/app/store/tag'
import { MsForm, FormSubject } from 'src/app/store/form'
import { name2rgba } from 'src/app/shared/functions'

// Typescript Module Augmentation, allows adding a field that doesn't exist. Cool!
declare module 'uplot' {
    interface Series {
        nolegend?: boolean
    }
}

const COLORS = [  // Set1 and Set3
    'rgb(228,26,28)', 'rgb(55,126,184)', 'rgb(77,175,74)', 'rgb(152,78,163)',
    'rgb(255,127,0)', 'rgb(255,255,51)', 'rgb(166,86,40)', 'rgb(247,129,191)',
    'rgb(153,153,153)',
    'rgb(141,211,199)', 'rgb(255,255,179)', 'rgb(190,186,218)', 'rgb(251,128,114)',
    'rgb(128,177,211)', 'rgb(253,180,98)', 'rgb(179,222,105)', 'rgb(252,205,229)',
    'rgb(217,217,217)', 'rgb(188,128,189)', 'rgb(204,235,197)', 'rgb(255,237,111)',
]

@Component({
    selector: 'app-uplot',
    templateUrl: './uplot.component.html',
    styleUrls: []
})
export class UplotComponent implements OnInit, OnDestroy {
    tagstore = inject(TagSubject)
    formstore = inject(FormSubject)
    subs: any = []
    @Input() item: any
    @ViewChild('msu') parent!: ElementRef
    @ViewChild('uplot') child!: ElementRef
    desc: string
    plot: uPlot | undefined
    height: number = -1
    legend_class: string = ''
    legend_show: boolean = true
    time_pos: string = ''
    time_show: boolean = false
    // duration: number = 172800
    controls: MsForm.Control[] = []
    form: MsForm.Form
    source: Observable<number>
    options: uPlot.Options = {
        width: 100,
        height: 100,
        series: []
    }
    minx: number = 0
    maxx: number = 0
    series: any[] = []
    bands: any[] = []
    axes: any[] = []
    dataset: DataSet
    configrange: { [key: string]: [number, number] } = {}
    currentrange: { [key: string]: [number, number] } = {}
    ranges: { [key: string]: [number, number] } = {}
    zoomed_x: boolean = false
    zoomed_y: boolean = false
    datefmt: string = '{H}:{mm}:{ss}.{fff}'

    constructor(
    ) {
        this.source = timer(0, 500)
        this.dataset = new DataSet()
        this.form = new MsForm.Form()
        this.desc = ''
    }

    arrayMinMax(values: (number | null | undefined)[], minmax: (number | null | undefined)[]) {
        return values.reduce((previous, current) => {
            let min = previous[0]
            let max = previous[1]
            if(typeof current === 'number') {
                if(typeof min !== 'number' || current < min) {
                    min = current
                }
                if(typeof max !== 'number' || current > max) {
                    max = current
                }
            }
            return [min, max]
        }, [minmax[0], minmax[1]])
    }

    showForm(e: any) {
        this.form.name = 'Configure Plot'
        if(this.plot != undefined) {
            this.form.requestid = 'uplot'
            this.form.description = 'Plot Config'
            let controls: MsForm.Control[] = []
            let minmax: any = {}
            for (let i = 0; i < this.series.length; i++) {
                const trace = this.series[i]
                if(trace.hasOwnProperty('scale') && typeof trace.scale === 'string') {
                    let lastminmax = [null, null]
                    if(trace.scale in minmax) {
                        lastminmax = minmax[trace.scale]
                    }
                    let res = this.arrayMinMax(this.dataset.show[i + 1], lastminmax)
                    minmax[trace.scale] = [res[0], res[1]]
                }
                minmax[trace.scale] = [Math.trunc(minmax[trace.scale][0] * 100) / 100, Math.trunc(minmax[trace.scale][1] * 100 + 1) / 100]
            }
            let seen = new Set()
            for (let i = 0; i < this.plot.series.length; i++) {
                const trace: uPlot.Series = this.plot.series[i]
                if(trace.scale != undefined && !seen.has(trace.scale)) {
                    seen.add(trace.scale)
                    if(trace.scale == 'x'){
                        let control = new MsForm.Control()
                        control.inputtype = 'filter'
                        control.name = 'duration'
                        control.options = ['30m', '1h', '8h', '1d', '2d', '1w']
                        controls.push(control)
                    }
                    else {
                        let controlmin = new MsForm.Control()
                        controlmin.inputtype = 'filter'
                        controlmin.name = trace.scale + ' min'
                        controlmin.options = [
                            this.configrange[trace.scale][0].toString(),
                            minmax[trace.scale][0].toString()
                        ]
                        controls.push(controlmin)
                        let controlmax = new MsForm.Control()
                        controlmax.inputtype = 'filter'
                        controlmax.name = trace.scale + ' max'
                        controlmax.options = [
                            this.configrange[trace.scale][1].toString(),
                            minmax[trace.scale][1].toString()
                        ]
                        controls.push(controlmax)
                    }
                }
            }
            this.form.controls = controls
            this.formstore.showForm(this.form)
        }
    }

    formAction(cmd: any) {
        let c = Object.keys(cmd)
        let duration = 0
        for (let i = 0; i < c.length; i++) {
            const element = c[i]
            if(cmd[element].length == 0){continue}
            if(element === 'duration') {
                duration = parseFloat(cmd[element])
                let units: string = cmd[element].slice(-1)
                if(units == 'm') {duration *= 60}
                else if(units == 'h') {duration *= 3600}
                else if(units == 'd') {duration *= 86400}
                else if(units == 'w') {duration *= 604800}
            }
            else if(element.endsWith(' min')){

            }
            else if(element.endsWith(' max')){

            }
        }
        if('duration' in cmd) {
            let units: number
            switch (cmd.duration.slice(-1)) {
                case 's':
                    units = 1
                    break
                case 'm':
                    units = 60
                    break
                case 'h':
                    units = 3600
                    break
                case 'd':
                    units = 86400
                    break
                case 'w':
                    units = 604800
                    break
                default:
                    units = 3600
            }
            let duration: number = parseInt(cmd.duration.slice(0,-1)) * units
            if(!isNaN(duration)){
                this.dataset.setduration(duration)
                this.zoomed_x = false
                this.zoomed_y = false
            }
        }
        this.plot?.batch(() => {
            for (const scale in this.plot?.scales) {
                if(scale === 'x' || scale === 'y') { continue }
                const minstr = scale + ' min'
                if(minstr in cmd) {
                    let newmin = parseFloat(cmd[minstr])
                    if(!isNaN(newmin)) {
                        this.currentrange[scale][0] = newmin
                    }
                }
                const maxstr = scale + ' max'
                if(maxstr in cmd) {
                    let newmax = parseFloat(cmd[maxstr])
                    if(!isNaN(newmax)) {
                        this.currentrange[scale][1] = newmax
                    }
                }
                this.plot?.setScale(scale, {
                    min: this.currentrange[scale][0],
                    max: this.currentrange[scale][1]
                })
            }
        })
    }

    initLegend(u: uPlot) {
        u.root.classList.add(this.legend_class)
        let legends = u.root.querySelectorAll('.u-legend .u-series')
        for (let i = 0; i < legends.length; i++) {
            const element = legends[i] as HTMLElement
            if (u.series[i + 1].nolegend) {
                element.style.display = 'none'
            }
        }
    }

    toggleLegend() {
        if(this.legend_class == 'ms-uplot-none') {
            return
        }
        if(this.plot?.root.classList.contains('ms-uplot-none')) {
            this.plot?.root.classList.replace('ms-uplot-none', this.legend_class)
        }
        else {
            this.plot?.root.classList.replace(this.legend_class, 'ms-uplot-none')
        }
    }

    getSize(afterviewinit: boolean) {
        // Getting different results for element width which is causing the
        // graph to be overwidth, - 41. HACK.
        let width = window.innerWidth - 41
        let height = 300
        if(afterviewinit) {
            width = Math.min(width, this.parent.nativeElement.clientWidth)
            if(this.height == -1) {
                // Pixel accuracy is not noticed immediately in Edge, so -1. HACK.
                height = window.innerHeight - this.parent.nativeElement.offsetTop - 1
            }
            else {
                height = this.height
            }
        }
        // console.log('width', width, 'height', height)
        return {
            width: width,
            height: height
        }
    }

    getCursor() {
        let cursor: uPlot.Cursor = {}
        if(this.legend_show == false) {
            cursor.show = false
        }
        else {
            // uni sets the pixels you have to move to infer a zoom
            // Infinity means it will never box zoom
            cursor.drag = {
                x: true,
                y: true,
                uni: 20
            }
            cursor.dataIdx = (u: uPlot, seriesIdx: any, hoveredIdx: any) => {
                let seriesData = u.data[seriesIdx]
                if (seriesData[hoveredIdx] == null) {
                    let non_null_left = hoveredIdx
                    let i = hoveredIdx
                    while (non_null_left == hoveredIdx && i-- > 0)
                        if (seriesData[i] != null)
                            non_null_left = i
                    return non_null_left
                }
                return hoveredIdx;
            }
        }
        return { cursor: cursor }
    }

    getSeries() {
        let series: uPlot.Series[] = [{}]
        for (let index = 0; index < this.series.length; index++) {
            const trace = this.series[index]
            this.dataset.addtag(trace.tagname, trace.ms_type || 'default')
            // series holds the config of each dataset, such as visibility, styling, labels & value display
            // in the legend, and the scale key along which they should be drawn. Implicit scale keys are x
            // for the data[0] series and y for data[1..N]
            series.push({
                label: trace.label || trace.tagname,
                scale: trace.scale,
                // value: (_plot: uPlot, raw: number, _seriesIdx: number, _idx: number) => {
                //     return raw == null ? '-' : raw.toFixed(trace.dp) + trace.scale
                // },
                values: (_plot: uPlot, sidx: number, idx: number | null) => {
                    if (idx === null) {return {}}
                    let display
                    let time = new Date(this.dataset.show[0][idx]! * 1000)
                    const data_point = this.dataset.show[sidx][idx]
                    if (typeof data_point === 'number') {
                        display = data_point.toFixed(trace.dp) + trace.scale
                    }
                    else {
                        display = data_point
                    }
                    return {
                        '': uPlot.fmtDate(this.datefmt)(time) + ' ' + display
                    }
                },
                stroke: trace.color || COLORS[index],
                width: trace.hasOwnProperty('width') ? trace.width : 1,
                spanGaps: trace.hasOwnProperty('spanGaps') ? trace.spanGaps : true,
                dash: trace.hasOwnProperty('dash') ? trace.dash : undefined,
                fill: trace.hasOwnProperty('fill') ? name2rgba(trace.fill[0], trace.fill[1]) : undefined,
                // paths: typeof uPlot.paths.stepped != 'undefined' ? uPlot.paths.stepped({align:  1}) : undefined
                paths: (
                    (!trace.hasOwnProperty('linestyle') || trace.linestyle == 'stepped') ?
                    (typeof uPlot.paths.stepped != 'undefined' ? uPlot.paths.stepped({ align: 1 }) : undefined)
                    : trace.linestyle == 'linear' ?
                    (typeof uPlot.paths.linear != 'undefined' ? uPlot.paths.linear() : undefined)
                    : trace.linestyle == 'spline' ?
                    (typeof uPlot.paths.spline != 'undefined' ? uPlot.paths.spline() : undefined)
                    : undefined
                ),
                points: trace.hasOwnProperty('points') ? {show: trace.points} : undefined,
                nolegend: trace.hasOwnProperty('nolegend') ? true : false
            })
        }
        return {series: series}
    }

    getBands(): any { // cuPlot.Band {
        if(this.item.config.hasOwnProperty('bands')) {
            let bands = []
            for (let i = 0; i < this.item.config.bands.length; i++) {
                const element = this.item.config.bands[i]
                const name0 = element.series[0]
                const name1 = element.series[1]
                const series0 = this.series.findIndex((s1) => s1.tagname === name0)
                const series1 = this.series.findIndex((s2) => s2.tagname === name1)
                let band = {
                    series: [series0 + 1, series1 + 1],  // counts from 1 in uplot
                    fill: name2rgba(element.fill[0], element.fill[1]),
                    dir: element.hasOwnProperty('dir') ? element.dir : undefined
                }
                bands.push(band)
            }
            return {bands: bands}
        }
        else {
            return {}
        }
    }

    getAxes() {
        let axes: uPlot.Axis[] = []
        let scales: uPlot.Scales = {}
        for (let index = 0; index < this.axes.length; index++) {
            const obj: any = this.axes[index]
            // axes render the ticks, values, labels and grid along their scale. Tick & grid spacing,
            // value granularity & formatting, timezone & DST handling is done here.
            if (obj.scale == 'x') {  // no side, no scale
                axes.push({
                    scale: obj.scale,
                    values: [
                    //   tick incr        default          year                         month day                     hour  min           sec   mode
                        [3600 * 24 * 365, "{YYYY}",        null,                        null, null,                   null, null,         null, 1],
                        [3600 * 24 * 28,  "{MMM}",         "\n{YYYY}",                  null, null,                   null, null,         null, 1],
                        [3600 * 24,       "{D}/{M}",       "\n{YYYY}",                  null, null,                   null, null,         null, 1],
                        [3600,            "{H}:{mm}",      "\n{D}/{MMM}/{YY}",          null, "\n{D}/{MMM}",          null, null,         null, 1],
                        [60,              "{H}:{mm}",      "\n{D}/{MMM}/{YY}",          null, "\n{D}/{MMM} {H}",      null, null,         null, 1],
                        [1,               "{mm}:{ss}",     "\n{D}/{MMM}/{YY} {H}",      null, "\n{D}/{MMM} {H}:{mm}", null, "\n{H}:{mm}", null, 1],
                        [0.001,           ":{ss}.{fff}",   "\n{D}/{MMM}/{YY} {H}:{mm}", null, "\n{D}/{MMM} {H}:{mm}", null, "\n{H}:{mm}", null, 1]
                    ]
                })
                if (obj.hasOwnProperty('range')) {
                    this.dataset.setduration(obj.range[1] - obj.range[0])
                }
            }
            else {  // with scale and possibly side
                let axis: uPlot.Axis = {}
                axis.scale = obj.scale
                if(obj.hasOwnProperty('side')){ axis.side = obj.side }
                axes.push(axis)
                if(obj.hasOwnProperty('range')) {
                    this.configrange[obj.scale] = [obj.range[0], obj.range[1]]
                    this.currentrange[obj.scale] = [obj.range[0], obj.range[1]]
                    scales[obj.scale] = {
                        auto: false,
                        range: (_u, _newMin, _newMax) => {  // current range as var doesn't work
                            return this.currentrange[obj.scale]
                        }
                    }
                }
                else {
                    scales[obj.scale] = { auto: true }
                }
            }
        }
        return {
            axes: axes,
            scales: scales
        }
    }

    getHooks(): uPlot.Hooks.Arrays {
        return {
            init: [u => { // opts are defaulted & merged but data has not been set 
                this.initLegend(u)
            }],
            draw: [u => { // fires after everything is drawn
                // see https://github.com/leeoniya/uPlot/issues/565
                // compare displayed range with original ranges to see if zoomed.
                const startime = u.data[0][0]
                const endtime = u.data[0][u.data[0].length - 1]
                for (const scale in u.scales) {
                    let { min, max } = u.scales[scale]
                    if(scale == 'x'){
                        if (min === startime && max === endtime) {
                            this.zoomed_x = false
                        }
                        else {
                            this.zoomed_x = true
                        }
                    }
                    else if(scale in this.currentrange) {
                        if (this.currentrange[scale][0] === min && this.currentrange[scale][1] === max) {
                            this.zoomed_y = false
                        }
                        else {
                            this.zoomed_y = true
                        }
                    }
                }
            }]
        }
    }

    getOptions() {
        return {
            ...this.getSize(false),
            ...this.getCursor(),
            ...this.getSeries(),
            ...this.getBands(),
            ...this.getAxes(),
            hooks: this.getHooks()
        }
    }

    parseConfig() {
        this.minx = this.item.config.axes[0].range[0]
        this.maxx = this.item.config.axes[0].range[1]
        this.series = this.item.config.series
        this.bands = this.item.config.hasOwnProperty('bands') ? this.item.config.bands : null
        this.axes = this.item.config.axes
        if(this.item.config.hasOwnProperty('ms')) {
            const ms = this.item.config.ms
            if(typeof ms.desc == 'string') {this.desc = ms.desc}
            if(typeof ms.height === 'number') { this.height = ms.height}
            if(typeof ms.legend_pos === 'string') {
                switch(ms.legend_pos) {
                    case 'left':
                        this.legend_class = 'ms-uplot-left'
                        break
                    case 'right':
                        this.legend_class = 'ms-uplot-right'
                        break
                    case 'after':
                        this.legend_class = 'ms-uplot-after'
                        break
                    default:
                        this.legend_class = 'ms-uplot-none'
                }
            }
            if(typeof ms.legend_show === 'boolean') { this.legend_show = ms.legend_show}
            if(typeof ms.time_pos === 'string') { this.time_pos = ms.time_pos}
            if(typeof ms.time_show === 'boolean') { this.time_show = ms.time_show}
            switch(ms.time_res) {
                case 'ms':
                    this.datefmt = '{mm}:{ss}.{fff}'
                    break
                case 's':
                    this.datefmt = '{H}:{mm}:{ss}'
                    break
                case 'm':
                    this.datefmt = '{D}/{MMM} {H}:{mm}'
                    break
                case 'D':
                    this.datefmt = '{D}/{MMM}/{YY}'
                    break
                default:
                    this.datefmt = '{H}:{mm}:{ss}.{fff}'
            }
        }
    }

    ngOnInit() {
        // -----------initialise from the page config items
        this.parseConfig()
        this.options = this.getOptions()
        if (this.maxx == 0) {
            this.dataset.extend = true
        }
        this.subs.push(
            this.source.subscribe(() => {
                if (this.dataset.updateshow) {
                    this.dataset.updateshow = false
                    if (this.plot != undefined) {
                        const zoomed = this.zoomed_x || this.zoomed_y
                        this.dataset.update()
                        if (zoomed) {
                            this.plot.setData(this.dataset.show, false)
                        }
                        else {
                            this.plot.setData(this.dataset.show)
                        }
                    }
                }
            })
        )
        this.dataset.taglist.forEach(tagname => {
            this.subs.push(
                this.tagstore.subject(tagname).asObservable().subscribe((value: Tag) => {
                    this.dataset.addtagdata(value)
                })
            )
        })
        this.subs.push(
            this.formstore.closesubject.asObservable().subscribe((cmd: any) => {
                if(cmd.requestid === this.form.requestid) {
                    if(cmd.action === 'submit'){
                        this.formAction(cmd.setvalue)
                    }
                }
            })
        )
    }

    ngOnDestroy() {
        for (let i = 0; i < this.subs.length; i++) {
            this.subs[i].unsubscribe()
        }
        if (typeof this.plot != 'undefined') {
            this.plot.destroy()
        }
    }

    ngAfterViewInit() {
        let options: any = {
            ... this.options,
            ... this.getSize(true)
        }
        this.dataset.update()
        this.plot = new uPlot(options, this.dataset.show, this.child.nativeElement)
    }

    @HostListener('window:resize')
    onResize() {
        this.plot?.setSize(this.getSize(true))
    }
}
