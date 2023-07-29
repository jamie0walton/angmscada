let wsp = window.location.pathname.split('/')
wsp.pop()
let ws = window.location.origin.replace(/^http/, 'ws') + wsp.join('/') + '/ws'

export const environment = {
    production: true,
    ws: ws
};
