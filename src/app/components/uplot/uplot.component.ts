import { Component, OnInit, OnDestroy, Input, ViewChild, HostListener, ElementRef, inject } from '@angular/core'
import { timer, Observable } from 'rxjs'
import uPlot from 'uplot'  // Uses time in seconds, accepts float.
import { UplotDataSet } from './uplot.dataset'
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

interface AxisRange {
    range: [number, number]
    zoomed: boolean
    range_zoom: [number, number]
}

class AxisRange implements AxisRange {
    constructor() {
        this.range = [0, 100]
        this.zoomed = false
        this.range_zoom = [0, 100]
    }

    set_range(range: [number, number]) {
        this.range = range
        this.zoomed = false
    }

    check_zoom(min: number | undefined, max: number | undefined) {
        if (typeof(min) == 'number' && typeof(max) == 'number' && min > this.range[0] && max < this.range[1]) {
            this.range_zoom = [min, max]
            this.zoomed = true
        }
        else {
            this.zoomed = false
        }
        console.log("scale min "+ min + " max " + max + " zoomed " + this.zoomed)
    }
}

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
    udataset: UplotDataSet
    axes_ranges: { [key: string]: AxisRange}
    datefmt: string = '{H}:{mm}:{ss}.{fff}'

    constructor(
    ) {
        this.source = timer(0, 500)
        this.udataset = new UplotDataSet()
        this.form = new MsForm.Form()
        this.desc = ''
        this.axes_ranges = {}
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
                    let res = this.arrayMinMax(this.udataset.show[i + 1], lastminmax)
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
                            this.axes_ranges[trace.scale].range[0].toString(),
                            minmax[trace.scale][0].toString()
                        ]
                        controls.push(controlmin)
                        let controlmax = new MsForm.Control()
                        controlmax.inputtype = 'filter'
                        controlmax.name = trace.scale + ' max'
                        controlmax.options = [
                            this.axes_ranges[trace.scale].range[1].toString(),
                            minmax[trace.scale][1].toString()
                        ]
                        controls.push(controlmax)
                    }
                }
            }
            this.form.controls = controls
            this.formstore.pubFormOpts(this.form)
        }
    }

    formAction(cmd: any) {
        let c = Object.keys(cmd)
        for (let i = 0; i < c.length; i++) {
            const element = c[i]
            if(cmd[element].length == 0) { continue }
            if(element === 'duration') {
                this.udataset.time_range.set_duration_string(cmd['duration'])
            }
            else if(element.endsWith(' min')){
                let tagname = element.slice(0, element.length - 4)
                if (this.plot && tagname in this.plot.scales) {
                    let min = parseFloat(cmd[element])
                    this.axes_ranges[tagname].range[0] = min
                    this.plot.setScale(tagname, {
                        min: min,
                        max: this.axes_ranges[tagname].range[1]
                    })
                }
            }
            else if(element.endsWith(' max')){
                let tagname = element.slice(0, element.length - 4)
                if (this.plot && tagname in this.plot.scales) {
                    let max = parseFloat(cmd[element])
                    this.axes_ranges[tagname].range[1] = max
                    this.plot.setScale(tagname, {
                        min: this.axes_ranges[tagname].range[1],
                        max: max
                    })
                }
            }
        }
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
            cursor.bind = {
                dblclick: (u) => {
                    return () => {
                        for (let i in this.axes_ranges) {
                            this.axes_ranges[i].zoomed = false
                        }
                        this.udataset.time_range.zoomed = false
                        // .redraw does not recheck the scales.
                        // https://github.com/leeoniya/uPlot/issues/183
                        u.setScale('x', {min: this.udataset.time_range.start, max: this.udataset.time_range.end})
                        return null
                    }
                }
            }
        }
        return { cursor: cursor }
    }

    getSeries() {
        let series: uPlot.Series[] = [{}]
        let tags: Tag[] = []
        for (let index = 0; index < this.series.length; index++) {
            const trace = this.series[index]
            // this.dataset.addtag(trace.tagname, trace.ms_type || 'default')
            tags.push(this.tagstore.tag_by_name[trace.tagname])
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
                    let time = new Date(this.udataset.show[0][idx]! * 1000)
                    const data_point = this.udataset.show[sidx][idx]
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
                scales[obj.scale] = {
                    auto: false,
                    range: (_u, min, max) => {
                        this.udataset.time_range.check_zoom(min, max)
                        if (this.udataset.time_range.zoomed) {
                            min = this.udataset.time_range.start_zoom
                            max = this.udataset.time_range.end_zoom
                        }
                        else {
                            min = this.udataset.time_range.start
                            max = this.udataset.time_range.end
                        }
                        return [min, max]
                    }
                }
                axes.push({
                    scale: obj.scale,
                    values: [
                    //   tick incr        default          year                         month day                     hour  min           sec   mode
                        [3600 * 24 * 365, "year {YYYY}", null, null, null, null, null, null, 1],
                        [3600 * 24 * 28, "month {MMM}", "\n{YYYY}", null, null, null, null, null, 1],
                        [3600 * 24, "day {D}/{M}", "\n{YYYY}", null, null, null, null, null, 1],
                        [60, "{HH}:{mm}", "\n{D}/{MMM}/{YY}", null, "\n{D}/{MMM}", null, null, null, 1],
                        [1, "sec {mm}:{ss}", "\n{D}/{MMM}/{YY} {H}", null, "\n{D}/{MMM} {H}:{mm}", null, "\n{H}:{mm}", null, 1],
                        [0.001, "ms :{ss}.{fff}", "\n{D}/{MMM}/{YY} {H}:{mm}", null, "\n{D}/{MMM} {H}:{mm}", null, "\n{H}:{mm}", null, 1]
                    ]
                })
                if (obj.hasOwnProperty('range')) {
                    this.udataset.time_range.set_duration(-obj.range[0])
                }
            }
            else {  // with scale and possibly side
                let axis: uPlot.Axis = {}
                axis.scale = obj.scale
                if(obj.hasOwnProperty('side')){ axis.side = obj.side }
                axes.push(axis)
                this.axes_ranges[obj.scale] = new AxisRange()
                if(obj.hasOwnProperty('range')) {
                    this.axes_ranges[obj.scale].set_range(obj.range)
                    scales[obj.scale] = {
                        auto: false,
                        range: (_u, min, max) => {
                            if (min != null && max != null) {
                                this.axes_ranges[obj.scale].check_zoom(min, max)
                            }
                            if (this.axes_ranges[obj.scale].zoomed) {
                                return this.axes_ranges[obj.scale].range_zoom
                            }
                            else {
                                return this.axes_ranges[obj.scale].range
                            }
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
            init: [u => { // opts default & merged but data not set 
                this.initLegend(u)
            }],
            draw: [u => {
                for (const scale in u.scales) {
                    let { min, max } = u.scales[scale]
                    if (scale == 'x' || typeof(min) != 'number' || typeof(max) != 'number') { continue }
                    this.axes_ranges[scale].check_zoom(min, max)
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

    initDataset() {
        for (let index = 0; index < this.series.length; index++) {
            const trace = this.series[index]
            this.udataset.add_tagname(this.tagstore.tag_by_name[trace.tagname])
        }
        this.udataset.init()
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
        this.initDataset()
        this.options = this.getOptions()
        this.subs.push(
            this.source.subscribe(() => {
                this.udataset.time_range.update_time()
                if (this.udataset.updateshow) {
                    this.udataset.updateshow = false
                    if (this.plot != undefined) {
                        if (this.udataset.time_range.zoomed) {
                            this.plot.setData(this.udataset.show, false)
                        }
                        else {
                            this.plot.setData(this.udataset.show)
                        }
                    }
                }
            })
        )
        this.udataset.tags.forEach(tag => {
            this.subs.push(
                this.tagstore.subject(tag.name).asObservable().subscribe((tag: Tag) => {
                    this.udataset.add_tag_history(tag)
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
        this.plot = new uPlot(options, this.udataset.show, this.child.nativeElement)
    }

    @HostListener('window:resize')
    onResize() {
        this.plot?.setSize(this.getSize(true))
    }
}
