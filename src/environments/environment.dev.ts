// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// Dev
// let ws = 'ws://127.0.0.1:8324/ws'

// Prod and some Dev environments
let wsp = window.location.pathname.split('/')
wsp.pop()
let ws = window.location.origin.replace(/^http/, 'ws') + wsp.join('/') + '/ws'

export const environment = {
    production: false,
    ws: ws
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
