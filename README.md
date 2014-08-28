#TinyG-Updater

This is an atom-shell app that can be used to update a TinyG with the latest hex files from http://synthetos.github.io/

This app is in early development, so documentation is thin.


Following the contents of the original README that came with the atom-shell exmaple that this project originated from:

---

# atom-shell example app

This is an example atom-shell app based off these instructions:
- https://github.com/atom/atom-shell/blob/master/docs/tutorial/quick-start.md

To run you should be able to do the following:

`./run.sh`

OR manually:

Install grunt if you haven't already

```
npm install -g grunt-cli
```

Then run the following to download version 0.12.2 of atom-shell
```
cd ./build
npm install
grunt download-atom-shell
```

Then you should be able to run the app:

```
./build/atom-shell/Atom.app/Contents/MacOS/Atom ./hello-app
```
