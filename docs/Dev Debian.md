# Development Setup in Debian

I have been having troubles getting Karma tests to run in windows
so I ran a debian vm and it worked.

## Config and commands

On a terminal run 
```cmd
start chrome --remote-debugging-port=9222
```

Open localhost:8324 in chrome to access the running pymscada wwwserver

From launch.json

```json
{
    "name": "chrome python",
    "type": "chrome",
    "request": "attach",
    "port": 9222
}
```

Later ng build --configuration development --watch
