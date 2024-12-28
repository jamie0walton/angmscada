This needs testing, incrementally got here and haven't installed clean
for a while.

I run cursor / VScode on a Windows computer and use remote development to
make an ssh connection to the Debian server on IP address 192.168.1.28.

# Introduction
Testing minimises use of mocking. The test server uses the pymscada python
module to run a basic ```pymscada bus``` and ```pymscada wwwserver``` with
some tags so that the Angular tests can run against a real webserver and
socket. ```pymscada wwwserver``` serves pages from ```./dist/angmscada```
to serve the actual test and debugging environment pages.

# Testing
## Ports
Preferred ports:
- Production  1324 for bus 8324 for webserver
- Karma       1325         8325
- Development 1326         8326

## Production
Permanent setup intended to run in Debian using systemd to manage services.
Use ```pymscada checkout``` to get default configuration and then set up
systemd services.

## Karma
Either Karma or Development, not both. However the following webserver is
required for Karma and will not cause Development to fail.

```bash
cd angmscada/docs/test_server
source .venv/bin/activate
nohup pymscada bus --config bus.yaml --verbose &
nohup pymscada wwwserver --config wwwserver.yaml --tags tags.yaml --verbose &
tail -f nohup.out
```

I need to add Port 8325 and Forwarded Address localhost:8325 to VSCode Ports
in order to get the components/bus tests to connect. If you have a browser
connect to the pymscada server at the same time you can see the Integer Setpoint
value change.

Then run the karm server debugging in VSCode or Cursor. This should prompt to
open with a browser, do that and then click on Debug. Parts of this depend on
getting the IP address of the server correct check ```karma.conf.js```.

## Development
Either Development OR Karma, not both.

Use this for running the debugging connections for development of the Angular
application. Note the ws parameter allows you to point a development web client
at a websocket with more interesting information that the test server in this
repository. The most interesting bit being real trend data (which you have set
up already :), of course ).

```cmd
start chrome --incognito --remote-debugging-port=9222 http://192.168.73.43:8325/?ws=ws://192.168.1.28:8326/

start chrome --incognito --remote-debugging-port=9222 https://192.168.73.43/pymscada/?ws=wss://192.168.73.43/pymscada/ws
```

Then either
```bash
ng build --configuration development --watch
```
or

In VSCode (or Cursor) choose `headless chrome` from ```launch.json``` debugging
options.

# Production
```bash
ng build --configuration production
cd ../pymscada-html  # assumes you are in angmscada
python3 update_wwwserver.py
vi pyproject.toml  # change version
git add .
git commit -m "bump version"
git push
source ~/.venv/bin/activate
pdm build
pdm publish
```

Of course you need to adjust for your branch.

# Setup on the Dev machine

Started with a headless Debian 12 with ssh, apache2, git and git-docs.
During install also:

```bash
su -
apt install chromium
apt install npm
npm install -g @angular/cli
npm install --save-dev jasmine-spec-reporter
adduser mscada
su mscada
git clone https://github.com/jamie0walton/angmscada.git
cd angmscada
npm install
cd docs/test_server/
python3 -m venv .venv
source .venv/bin/activate
python -c "import sys; print(sys.prefix)"
pip install pymscada
pymscada -h
ng build --configuration development --watch
```
