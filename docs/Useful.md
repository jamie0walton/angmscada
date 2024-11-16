# Kill all chromium processes

```bash
ps -ef | grep -e chromium | awk '{print $2}' | xargs kill -9
```
