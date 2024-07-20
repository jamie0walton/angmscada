# Development Environment

This project initially started in Debian, when I started the open source version
I did the initial work up to this point in Windows. At a certain point the lack
of systemd become a compelling factor and I switched back.

## Debian
### Setup

Started with a headless Debian 12 with ssh and apache2 added (and git and git-docs).
During install also:

```bash
su -
apt install npm
npm install -g @angular/cli
adduser mscada
su mscada
git clone https://github.com/jamie0walton/pymscada.git
git clone https://github.com/jamie0walton/angmscada.git
# see pymscada Dev Environment.md for pymscada setup
cd angmscada
npm install
ng build --configuration development --watch
```

This will bring things to the point where pymscada can find some pages to serve
from ```./dist/angmscada```, i.e. it will serve a webpage on the network.

### VSCode and Debugging

In Windows with VSCode set up to use Remote - SSH, connect from Windows to the 
Debian dev box and then open ```\home\mscada\angmscada```, VSCode may prompt
you for the Angular Language service.

When pymscada-wwwserver service is running (and a few others) open a command
window and ```start chrome --remote-debugging-port=9222``` inside chrome
<Ctrl+Shift+I>, go to the Network tab and turn on ```Disable cache```.

```bat command prompt
start chrome --incognito --remote-debugging-port=9222 https://192.168.73.43/pymscada/
```
```bash
ng build --configuration development --watch
```

Back in VSCode, Run and Debug, select ```chrome python``` and the debugger
should connect at which point you can Restart the page and follow through
with the debugging tool.

## Windows

This is incomplete

### Setup

You'll need nodejs, git, CPython and VScode.

S

Assuming a base directory of ```Git``` Open three windows:
- VSCode with ```Git\pymscada``` open, in three terminals run:
  - ```pymscada run bus --verbose```
  - ```pymscada run wwwserver --config .\docs\examples\wwwserver.yaml --tags .\docs\examples\tags.yaml --verbose```
  - ```pymscada run files --config .\docs\examples\files.yaml```
- VSCode with ```Git\angmscada``` open, in one terminal run:
  - ```ng build --configuration development --watch```
- At a command prompt:
  - ```start chrome --remote-debugging-port=9222```
- Chrome opens
  - <Ctrl+Shift+I> and check the cache is disabled
  - Open [http://localhost:8324]
  - The demo page should come up in Chrome
  - in VSCode with angmscada, start debug and restart to confirm the chrome page refreshes
