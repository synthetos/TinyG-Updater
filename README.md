#TinyG-Updater

This is an atom-shell app that can be used to update a TinyG with the latest hex files from http://synthetos.github.io/

This app is in early development, so documentation is thin.


## Building the node_modules for the various OS's

Due to problems with the build system not supporting atom-shell's version of node, we have to build the node_modules directory for each platform on that platform. Here are the npm calls per platform:

```bash
# OS X with XCode Command-Line Tools installed:
npm install --dd --target='0.11.13' --disturl='https://gh-contractor-zcbenz.s3.amazonaws.com/atom-shell/dist' --arch=x64 --target_arch=x64
zip -r ../node_modules-node-v14-darwin-x64.zip node_modules
rm -rf node_modules


# Windows with MSVC 2013 and cygwin (and python intalled outside of cygwin):
npm install --dd --target='0.11.13' --msvs_version=2013 --disturl='https://gh-contractor-zcbenz.s3.amazonaws.com/atom-shell/dist' --arch=ia32 --target_arch=ia32
zip -r ../node_modules-node-v14-win32-ia32.zip node_modules
rm -rf node_modules
```

To build for OSX and Windows, from OSX:
```bash
cd build
npm install
grunt -v
```


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
