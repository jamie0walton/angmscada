# Build

## Initial creation

You'll need node.

```
npm -v
# something like 9.6.7
npm install -g @angular/cli
ng new angmscada
# no to angular routing - use a single page app instead
# scss - planning to use bootstrap
ng serve --open
# basic empty version is running
```

What might be nice in future is to edit ```angular.json``` with
```"outputPath": "../pymscada/src/html",``` so that the build goes
directly in with the python package which will serve the pages.
