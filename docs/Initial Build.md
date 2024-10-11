# Build

Ocassionally useful to rebase from the latest Angular.

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

```
git remote add origin https://github.com/jamie0walton/angmscada.git
git fetch
git add .
git commit -m "initial ng project"
git pull origin main
# likely complains about unrelated histories
git pull origin main --allow-unrelated-histories
# edit README.md to include both, only conflict in this instance.
git push --set-upstream origin main
```

# Writing

```
npm install bootstrap
npm install uplot
# make it so bootstrap and uplot scss imports work
ng generate component bus
ng generate component navbar
ng generate component pages
# update app.component.html
# this will generate a pretty boring navbar works! etc.
```

Migrate copies of components in from MobileSCADA (this is a work in progress)
