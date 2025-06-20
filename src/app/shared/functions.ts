/**
 * Return position of lookup in vect where vect is strictly increasing
 * limits are 0 and length
 */
export function bisect(vect: number[], lookup: number): number {
    let left = 0
    let right = vect.length - 1
    if (right < 0) { return 0 }
    while (left <= right) {
        const mid = Math.floor((left + right) / 2)
        if (vect[mid] === lookup) {
            return mid
        }
        else if (vect[mid] < lookup) {
            left = mid + 1
        }
        else {
            right = mid - 1
        }
    }
    return left
}

/**
 * Either one or other, not both.
 */
export function XOR(a: boolean, b: boolean): boolean {
    return (a || b) && !(a && b)
}

/**
 * Return an ipv4 address array, if it makes sense to
 * test valid return with array.length == 4
 */
export function ip(a: any): number[] {
    if (typeof (a) == 'string') {
        let vals: string[] = a.split('.')
        if (vals.length != 4) {
            return []
        }
        let address: number[] = []
        for (let i = 0; i < 4; i++) {
            address.push(Number(vals[i]))
            if (address[i] < 0 || address[i] > 255) {
                return []
            }
        }
        return address
    }
    else {
        return []
    }
}

// Date function that provides an offset function

let re = /^(-?\d+)(y|mo|d|h|mi|s)/i;

/**
 * Can't extend Date as a class, some magic breaks it
 * https://stackoverflow.com/questions/6075231/how-to-extend-the-javascript-date-object/30882416#30882416
 */
export function XDate(a?: any, b?: any, c?: any, d?: any, e?: any, f?: any, g?: any) {
    var x: any
    switch (arguments.length) {
        case 0:
            x = new Date();
            break;
        case 1:
            x = new Date(a);
            break;
        case 2:
            x = new Date(a, b);
            break;
        case 3:
            x = new Date(a, b, c);
            break;
        case 4:
            x = new Date(a, b, c, d);
            break;
        case 5:
            x = new Date(a, b, c, d, e);
            break;
        case 6:
            x = new Date(a, b, c, d, e, f);
            break;
        default:
            x = new Date(a, b, c, d, e, f, g);
    }
    x.__proto__ = XDate.prototype;
    return x;
}

XDate.prototype.__proto__ = Date.prototype;

// Now I can do what I need to do to set start and stop times
XDate.prototype.offsetDate = function (offset: string) {
    let year = this.getFullYear()
    let month = this.getMonth()
    let dayom = this.getDate()
    let hour = this.getHours()
    let minute = this.getMinutes()
    let second = this.getSeconds()
    let ms = this.getMilliseconds()
    let unit: any = re.exec(offset);
    if (unit.length == 3) {
        switch (unit[2].toLowerCase()) {
            case 'h':
                hour = hour - Number(unit[1]);
                break;
            case 'mi':
                minute = minute - Number(unit[1]);
                break;
            case 's':
                second = second - Number(unit[1]);
                break;
            case 'ms':
                ms = ms - Number(unit[1]);
                break;
            case 'y':
                year = year - Number(unit[1]);
                break;
            case 'mo':
                month = month - Number(unit[1]);
                break;
            case 'd': // default to days
            default:
                dayom = dayom - Number(unit[1]);
                break;
        }
    }
    let date = XDate(year, month, dayom, hour, minute, second, ms)
    return date;
};

let colors: { [key: string]: number[] } = {
    aliceblue: [240,248,255],
    antiquewhite: [250,235,215],
    aqua: [0,255,255],
    aquamarine: [127,255,212],
    azure: [240,255,255],
    beige: [245,245,220],
    bisque: [255,228,196],
    black: [0,0,0],
    blanchedalmond: [255,235,205],
    blue: [0,0,255],
    blueviolet: [138,43,226],
    brown: [165,42,42],
    burlywood: [222,184,135],
    cadetblue: [95,158,160],
    chartreuse: [127,255,0],
    chocolate: [210,105,30],
    coral: [255,127,80],
    cornflowerblue: [100,149,237],
    cornsilk: [255,248,220],
    crimson: [220,20,60],
    cyan: [0,255,255],
    darkblue: [0,0,139],
    darkcyan: [0,139,139],
    darkgoldenrod: [184,134,11],
    darkgray: [169,169,169],
    darkgrey: [169,169,169],
    darkgreen: [0,100,0],
    darkkhaki: [189,183,107],
    darkmagenta: [139,0,139],
    darkolivegreen: [85,107,47],
    darkorange: [255,140,0],
    darkorchid: [153,50,204],
    darkred: [139,0,0],
    darksalmon: [233,150,122],
    darkseagreen: [143,188,143],
    darkslateblue: [72,61,139],
    darkslategray: [47,79,79],
    darkslategrey: [47,79,79],
    darkturquoise: [0,206,209],
    darkviolet: [148,0,211],
    deeppink: [255,20,147],
    deepskyblue: [0,191,255],
    dimgray: [105,105,105],
    dimgrey: [105,105,105],
    dodgerblue: [30,144,255],
    firebrick: [178,34,34],
    floralwhite: [255,250,240],
    forestgreen: [34,139,34],
    fuchsia: [255,0,255],
    gainsboro: [220,220,220],
    ghostwhite: [248,248,255],
    gold: [255,215,0],
    goldenrod: [218,165,32],
    gray: [128,128,128],
    grey: [128,128,128],
    green: [0,128,0],
    greenyellow: [173,255,47],
    honeydew: [240,255,240],
    hotpink: [255,105,180],
    indianred: [205,92,92],
    indigo: [75,0,130],
    ivory: [255,255,240],
    khaki: [240,230,140],
    lavender: [230,230,250],
    lavenderblush: [255,240,245],
    lawngreen: [124,252,0],
    lemonchiffon: [255,250,205],
    lightblue: [173,216,230],
    lightcoral: [240,128,128],
    lightcyan: [224,255,255],
    lightgoldenrodyellow: [250,250,210],
    lightgray: [211,211,211],
    lightgrey: [211,211,211],
    lightgreen: [144,238,144],
    lightpink: [255,182,193],
    lightsalmon: [255,160,122],
    lightseagreen: [32,178,170],
    lightskyblue: [135,206,250],
    lightslategray: [119,136,153],
    lightslategrey: [119,136,153],
    lightsteelblue: [176,196,222],
    lightyellow: [255,255,224],
    lime: [0,255,0],
    limegreen: [50,205,50],
    linen: [250,240,230],
    magenta: [255,0,255],
    maroon: [128,0,0],
    mediumaquamarine: [102,205,170],
    mediumblue: [0,0,205],
    mediumorchid: [186,85,211],
    mediumpurple: [147,112,219],
    mediumseagreen: [60,179,113],
    mediumslateblue: [123,104,238],
    mediumspringgreen: [0,250,154],
    mediumturquoise: [72,209,204],
    mediumvioletred: [199,21,133],
    midnightblue: [25,25,112],
    mintcream: [245,255,250],
    mistyrose: [255,228,225],
    moccasin: [255,228,181],
    navajowhite: [255,222,173],
    navy: [0,0,128],
    oldlace: [253,245,230],
    olive: [128,128,0],
    olivedrab: [107,142,35],
    orange: [255,165,0],
    orangered: [255,69,0],
    orchid: [218,112,214],
    palegoldenrod: [238,232,170],
    palegreen: [152,251,152],
    paleturquoise: [175,238,238],
    palevioletred: [219,112,147],
    papayawhip: [255,239,213],
    peachpuff: [255,218,185],
    peru: [205,133,63],
    pink: [255,192,203],
    plum: [221,160,221],
    powderblue: [176,224,230],
    purple: [128,0,128],
    rebeccapurple: [102,51,153],
    red: [255,0,0],
    rosybrown: [188,143,143],
    royalblue: [65,105,225],
    saddlebrown: [139,69,19],
    salmon: [250,128,114],
    sandybrown: [244,164,96],
    seagreen: [46,139,87],
    seashell: [255,245,238],
    sienna: [160,82,45],
    silver: [192,192,192],
    skyblue: [135,206,235],
    slateblue: [106,90,205],
    slategray: [112,128,144],
    slategrey: [112,128,144],
    snow: [255,250,250],
    springgreen: [0,255,127],
    steelblue: [70,130,180],
    tan: [210,180,140],
    teal: [0,128,128],
    thistle: [216,191,216],
    tomato: [255,99,71],
    turquoise: [64,224,208],
    violet: [238,130,238],
    wheat: [245,222,179],
    white: [255,255,255],
    whitesmoke: [245,245,245],
    yellow: [255,255,0],
    yellowgreen: [154,205,5]
}

/**
 * Return [R,G,B, alpha] for a well known colour name.
 */
export function name2rgba(name: string, alpha: number): string {
    if (name.toLowerCase() in colors) {
        return 'rgba(' + [...colors[name], alpha].join() + ')'
    }
    else {
        return 'rgba(0,0,0,' + alpha + ')'
    }
}

export function name2rgb(name: string): string {
    if (name.toLowerCase() in colors) {
        return 'rgb(' + [...colors[name]].join(',') + ')'
    }
    else {
        return 'rgb(0,0,0)'
    }
}