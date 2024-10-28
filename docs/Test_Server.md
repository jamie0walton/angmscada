# Test Webserver

To run the test:
```
python3 -m venv .venv
source .venv/bin/activate
pip install pymscada
pymscada wwwserver --config wwwserver.yaml --tags tags.yaml
```

To check the webserver is working, open a browser and navigate to:

http://server_ip:8324/
