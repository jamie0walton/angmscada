# Test Webserver

To run the test:
```
python3 -m venv .venv
source .venv/bin/activate
pip install pymscada
nohup pymscada bus --config bus.yaml --verbose &
nohup pymscada wwwserver --config wwwserver.yaml --tags tags.yaml --verbose &
```

To check the webserver is working, open a browser and navigate to:

http://server_ip:9325/

karma.conf.js needs the IP address of the server. Change this
to suit your environment.
