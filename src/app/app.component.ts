import { Component, OnInit } from '@angular/core'
import { ConfigSubject } from 'src/app/store/config'

/**
 * URL Parameters:
 * ws   - WebSocket connection string. Examples:
 *        ws://localhost:8000/ws         - Standard WebSocket
 *        wss://example.com:8443/ws      - Secure WebSocket
 *        <empty>                        - Production assumes ./ws
 * site - Site identifier. Example: ?site=MySite
 * yaml - Configuration file path. Example: ?yaml=/config/mysite.yaml
 * 
 * Example:
 * https://scada.company.com?ws=wss://192.168.1.1/ws&site=MySite
 */
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    title = 'pymscada'

    constructor(
        private configstore: ConfigSubject
    ) {}

    ngOnInit(): void {
        console.log('angmscada build', this.configstore.get().buildDate)
        const urlParams = new URLSearchParams(window.location.search)
        const ws = urlParams.get('ws')
        const site = urlParams.get('site')
        const yaml = urlParams.get('yaml')
        if (ws !== null) {
            this.configstore.set_ws(ws)
        }
        if (site !== null) {
            this.configstore.set_site(site)
        }
        if (yaml !== null) {
            this.configstore.set_yaml(yaml)
        }
    }
}
