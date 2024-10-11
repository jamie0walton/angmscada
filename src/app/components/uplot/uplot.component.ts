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

const SCALE = [
    // tick incr, default, year, month, day, hour, min, sec, mode
    [3600 * 24 * 365, "{YYYY}", null, null, null, null, null, null, 1],
    [3600 * 24 * 28, "{MMM}", "\n{YYYY}", null, null, null, null, null, 1],
    [3600 * 24, "{D}/{M}", "\n{YYYY}", null, null, null, null, null, 1],
    [60, "{HH}:{mm}", "\n{D}/{MMM}/{YY}", null, "\n{D}/{MMM}", null, null, null, 1],
    [1, "{ss}s", "\n{D}/{MMM}/{YY} {H}", null, "\n{D}/{MMM} {H}:{mm}", null, "\n{H}:{mm}", null, 1],
    [0.001, "{ss}.{fff}s", "\n{D}/{MMM}/{YY} {H}:{mm}", null, "\n{D}/{MMM} {H}:{mm}", null, "\n{H}:{mm}", null, 1]
]

@Component({
    selector: 'app-uplot',
    templateUrl: './uplot.component.html',
    styleUrls: []
})
export class UplotComponent implements OnInit, OnDestroy {
    tagstore = inject(TagSubject)
    tags: Tag[] = []
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
    options: uPlot.Options
    minx: number = 0
    maxx: number = 0
    series: any[] = []
    bands: any[] = []
    udataset: UplotDataSet
    datefmt: string = '{H}:{mm}:{ss}.{fff}'

    constructor(
    ) {
        this.source = timer(0, 500)
        this.udataset = new UplotDataSet()
        this.form = new MsForm.Form()
        this.desc = ''
        this.options = {
            width: 100,
            height: 100,
            series: [],
            hooks: {},
            axes: [],
            scales: {},
            plugins: []
        }
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

    formScale() {
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
                        let range = this.udataset.axes[trace.scale].configrange
                        controlmin.options = [
                            range[0].toString(),
                            minmax[trace.scale][0].toString()
                        ]
                        controls.push(controlmin)
                        let controlmax = new MsForm.Control()
                        controlmax.inputtype = 'filter'
                        controlmax.name = trace.scale + ' max'
                        controlmax.options = [
                            range[1].toString(),
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

    scaleAction(cmd: any) {
        let c = Object.keys(cmd)
        for (let i = 0; i < c.length; i++) {
            const element = c[i]
            if(cmd[element].length == 0) { continue }
            if(element === 'duration') {
                this.udataset.set_duration_string(cmd['duration'])
            }
            else {
                let tagname = element.slice(0, element.length - 4)
                if (this.plot && tagname in this.plot.scales) {
                    let range = this.udataset.axes[tagname].range
                    if (element.endsWith(' min')){
                        range[0] = parseFloat(cmd[element])
                    }
                    else if (element.endsWith(' max')){
                        range[1] = parseFloat(cmd[element])
                    }
                    this.plot.setScale(tagname, {
                        min: range[0],
                        max: range[1]
                    })
                }
            }
        }
    }

    formSmooth() {
        this.form.name = 'Smoothing'
        let active = this.udataset.aligned.filters
        if(this.plot != undefined) {
            this.form.requestid = 'uplot-smooth'
            this.form.description = 'Plot Config Smoothing'
            this.form.action = 'update'
            let controls: MsForm.Control[] = []
            let filter = new MsForm.Control()
            filter.inputtype = 'multi'
            filter.name = 'filter'
            filter.options = active.options
            filter.numbervalue = active.selected
            controls.push(filter)
            let factor = new MsForm.Control()
            factor.inputtype = 'int'
            factor.name = 'factor'
            factor.min = 3
            factor.max = 50
            if (active.factor < 3) {
                factor.numbervalue = 15
            }
            else {
                factor.numbervalue = active.factor
            }
            controls.push(factor)
            this.form.controls = controls
            this.formstore.pubFormOpts(this.form)
        }
    }

    smoothAction(cmd: any) {
        this.udataset.set_filter(cmd.filter, cmd.factor)
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

    parse_ms() {
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

    setSize(afterviewinit: boolean) {
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
        this.options.width = width
        this.options.height = height
    }

    cursor_dataIdx = (u: uPlot, seriesIdx: any, hoveredIdx: any) => {
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

    cursor_dblclick(u: uPlot) {
        return () => {
            this.udataset.updateshow = true
            for (let index = 0; index < this.item.config.axes.length; index++) {
                const series: any = this.item.config.axes[index]
                this.udataset.axes[series.scale].reset = true
            }
            // .redraw does not recheck the scales.
            // https://github.com/leeoniya/uPlot/issues/183
            return null
        }
    }

    x_scale_range = (u: uPlot, min: number|null, max: number|null) => {
        return this.udataset.zoom_x([min, max])
    }

    y_scale_range(obj: any) {
        return (u: uPlot) => {  // Ought to be like x, isn't
            const min = u.scales[obj.scale].min
            const max = u.scales[obj.scale].max
            return this.udataset.zoom_y(obj.scale, [min, max])
        }
    }

    setCursor() {
        this.options.cursor = {}
        if(this.legend_show == false) {
            this.options.cursor.show = false
        }
        else {
            // uni sets the pixels you have to move to infer a zoom
            // Infinity means it will never box zoom
            this.options.cursor.drag = {x: true, y: true, uni: 20}
            this.options.cursor.dataIdx = this.cursor_dataIdx
            this.options.cursor.bind = {
                dblclick: (u: uPlot) => {return this.cursor_dblclick(u)}
            }
        }
    }

    setSeries() {
        this.options.series = [{}]
        for (let index = 0; index < this.series.length; index++) {
            const trace = this.series[index]
            // series holds the config of each dataset, such as visibility, styling, labels & value display
            // in the legend, and the scale key along which they should be drawn. Implicit scale keys are x
            // for the data[0] series and y for data[1..N]
            this.options.series.push({
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
                // assume that stepped, linear and spline are always defined in uPlot despite the ? in the library
                paths: (
                    (!trace.hasOwnProperty('linestyle') || trace.linestyle == 'stepped') ? uPlot.paths.stepped!({ align: 1 }) : (
                        trace.linestyle == 'linear' ? uPlot.paths.linear!() : (
                            trace.linestyle == 'spline' ? uPlot.paths.spline!() : undefined
                        )
                    )
                ),
                points: trace.hasOwnProperty('points') ? {show: trace.points} : undefined,
                nolegend: trace.hasOwnProperty('nolegend') ? true : false
            })
        }
    }

    bgGradientPlugin(background: {'xpos': string|number, 'color': string}[]) {
        // Initialise plugin background
        let bg: {'xpos': number, 'color': string}[] = []
        let offset = 0
        for (let i = 0; i < background.length; i++) {
            let xpos = background[i].xpos
            const color = background[i].color
            if (typeof(xpos) == 'string') {
                offset = Date.now() / 1000
                xpos = 0
            }
            bg.push({'xpos': xpos + offset, 'color': color})
        }

        function drawBg(u: uPlot) {
            let x = u.scales['x']
            if (x.min === undefined || x.max === undefined) {
                return
            }
            let { left, top, width, height } = u.bbox
            let working_left = left
            let working_bg = []
            for (let i = 0; i < bg.length; i++) {
                let xpos = bg[i].xpos
                const color = bg[i].color
                if (xpos <= x.min) {
                    working_bg[0] = {xpos: working_left, color: color}
                }
                else if (xpos < x.max) {
                    working_left = left + (xpos - x.min) / (x.max - x.min) * width
                    working_bg.push({xpos: working_left, color: color})
                }
            }

            if (working_bg.length > 0) {
                u.ctx.save()
                for (let i = 0; i < working_bg.length; i++) {
                    const xpos = working_bg[i].xpos
                    let working_width = width - (xpos - left)
                    if (i + 1 < working_bg.length) {
                        working_width = width - (xpos - left)
                    }
                    const color = working_bg[i].color
                    u.ctx.fillStyle = color
                    u.ctx.fillRect(xpos, top, working_width, height)
                }
                u.ctx.restore()
            }
        }

        return {hooks: {drawClear: drawBg}}
    }

    setPlugins() {
        if(this.item.config.ms?.hasOwnProperty('bghighlight')) {
            this.options.plugins!.push(this.bgGradientPlugin(this.item.config.ms.bghighlight))
        }
    }

    setBands() {
        if(this.item.config.hasOwnProperty('bands')) {
            this.options.bands = []
            for (let i = 0; i < this.item.config.bands.length; i++) {
                const element = this.item.config.bands[i]
                const series0 = this.series.findIndex((s1) => s1.tagname === element.series[0])
                const series1 = this.series.findIndex((s2) => s2.tagname === element.series[1])
                let band: uPlot.Band = {
                    series: [series0 + 1, series1 + 1],  // counts from 1 in uplot
                    fill: name2rgba(element.fill[0], element.fill[1]),
                    dir: element.hasOwnProperty('dir') ? element.dir : undefined
                }
                this.options.bands.push(band)
            }
        }
    }

    setAxesScales() {
        for (let index = 0; index < this.item.config.axes.length; index++) {
            const obj: any = this.item.config.axes[index]
            // axes render the ticks, values, labels and grid along their
            // scale. Tick & grid spacing, value granularity & formatting,
            // timezone & DST handling is done here.
            if (obj.scale == 'x') {  // no side, no scale
                this.udataset.set_duration(obj.range)
                this.options.scales![obj.scale] = {
                    auto: false,
                    range: this.x_scale_range
                }
                let axis: uPlot.Axis = {
                    scale: obj.scale,
                    values: SCALE,
                    grid: {stroke: "#999", width: 0.5}
                }
                this.options.axes!.push(axis)
            }
            else {  // with scale and possibly side
                let axis: uPlot.Axis = {
                    scale: obj.scale,
                    grid: {stroke: "#999", width: 0.5}
                }
                if(obj.hasOwnProperty('side')){ axis.side = obj.side }
                this.options.axes!.push(axis)
                this.udataset.set_yaxes(obj.scale, obj.range)
                this.options.scales![obj.scale] = {
                    auto: false,
                    range: this.y_scale_range(obj)
                }
            }
        }
    }

    setHooks() {
        this.options.hooks!.init = [(u: uPlot) => {
            u.root.classList.add(this.legend_class)
            let legends = u.root.querySelectorAll('.u-legend .u-series')
            for (let i = 0; i < legends.length; i++) {
                const element = legends[i] as HTMLElement
                if (u.series[i + 1].nolegend) {
                    element.style.display = 'none'
                }
            }
        }]
    }

    set_options() {
        this.setSize(false)
        this.setCursor()
        this.setSeries()
        this.setPlugins()
        this.setBands()
        this.setAxesScales()
        this.setHooks()
    }

    initConfig() {
        this.series = this.item.config.series
        this.tags = this.series.map(x => this.tagstore.tag_by_name[x.tagname])
        this.udataset.initialise(this.tags)
        this.bands = this.item.config.hasOwnProperty('bands') ? this.item.config.bands : null
        this.parse_ms()
        this.set_options()
    }

    ngOnInit() {
        // -----------initialise from the page config items
        this.initConfig()
        this.subs.push(
            this.source.subscribe(() => {
                if (!this.udataset.received_new_data && !this.udataset.updateshow) { return }
                this.udataset.received_new_data = false
                this.udataset.step_x_axis()
                if (this.udataset.updateshow) {
                    this.udataset.updateshow = false
                    this.plot?.setData(this.udataset.show, this.udataset.reset_scales)
                }
            })
        )
        this.udataset.tags.forEach(tag => {
            this.subs.push(
                this.tagstore.subject(tag.name).asObservable().subscribe((tag: Tag) => {
                    this.udataset.add_tag_value(tag)
                })
            )
        })
        this.subs.push(
            this.formstore.closesubject.asObservable().subscribe((cmd: any) => {
                if(cmd.requestid === 'uplot') {
                    if(cmd.action === 'submit'){
                        this.scaleAction(cmd.setvalue)
                    }
                }
                else if(cmd.requestid === 'uplot-smooth') {
                    if(cmd.action === 'submit'){
                        this.smoothAction(cmd.setvalue)
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
        this.setSize(true)
        this.plot = new uPlot(this.options, this.udataset.show, this.child.nativeElement)
    }

    @HostListener('window:resize')
    onResize() {
        this.setSize(true)
        this.plot?.setSize({
            width: this.options.width,
            height: this.options.height
        })
    }
}
