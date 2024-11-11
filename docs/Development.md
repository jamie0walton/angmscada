This needs testing, incrementally got here and haven't installed clean
for a while.

# Introduction
Testing minimises use of mocking. The test server uses the pymscada python
module to run a basic ```pymscada bus``` and ```pymscada wwwserver``` with
some tags so that the Angular tests can run against a real webserver and
socket. ```pymscada wwwserver``` serves pages from ```./dist/angmscada```
to serve the actual test and debugging environment pages.

# Testing
```bash
cd angmscada/docs/test_server
source .venv/bin/activate
nohup pymscada bus --config bus.yaml --verbose &
nohup pymscada wwwserver --config wwwserver.yaml --tags tags.yaml --verbose &
tail -f nohup.out
```

```
start chrome --incognito --remote-debugging-port=9222 http://192.168.1.28:8324/
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
