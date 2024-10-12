/**
 * Primarily used for CSV downloads
 */
function pad(number: number) {
    if (number < 10) {
        return '0' + number
    }
    return number
}

export function datestring(d: Date) {
    // new Date().toISOString().substring(0, 16),
    let now = d.getFullYear() +
        '-' + pad(d.getMonth() + 1) +
        '-' + pad(d.getDate())
    return now
}

export function datetimestring(d: Date) {
    // new Date().toISOString().substring(0, 16),
    let now = d.getFullYear() +
        '-' + pad(d.getMonth() + 1) +
        '-' + pad(d.getDate()) +
        'T' + pad(d.getHours()) +
        ':' + pad(d.getMinutes()) +
        ':' + pad(d.getSeconds())
    return now
}

export function csvdatetimestring(d: Date) {
    // new Date().toISOString().substring(0, 16),
    let now = pad(d.getDate()) +
        '/' + pad(d.getMonth() + 1) +
        '/' + d.getFullYear() +
        ' ' + pad(d.getHours()) +
        ':' + pad(d.getMinutes()) +
        ':' + pad(d.getSeconds())
    return now
}

export function csvdatetimestring_ms(d: Date) {
    // new Date().toISOString().substring(0, 16),
    let now = d.getDate().toString().padStart(2, '0') +
        '/' + (d.getMonth() + 1).toString().padStart(2, '0') +
        '/' + d.getFullYear() +
        ' ' + d.getHours().toString().padStart(2, '0') +
        ':' + d.getMinutes().toString().padStart(2, '0') +
        ':' + d.getSeconds().toString().padStart(2, '0') +
        '.' + d.getMilliseconds().toString().padStart(3, '0')
    return now
}
