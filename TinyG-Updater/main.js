var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.
var spawn = require('child_process').spawn;
var serialport = require('serialport');
var ipc = require('ipc');
var http = require('http');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

// Report crashes to our server.
require('crash-reporter').start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

// console.log("Path: " + process.execPath);
// console.log("CWD: " + process.cwd());
console.log("Node version: " + process.version);

if (process.platform == 'darwin') {
  if (/Contents\/MacOS/.test(process.execPath)) {
    // Running as an app
    avrdude_path = path.resolve(process.execPath, "../../Resources/app/bin/avrdude");
  }
  else {
    // Running from the command line
    avrdude_path = path.resolve(process.cwd(), "./osx-bin/avrdude");
  }
} else if (process.platform == 'win32') {
  // On windows, we see if we were passed an app name
  if (process.argv.length == 1) {
    // Running as an app
    avrdude_path = path.resolve(process.execPath, "../bin/avrdude.exe");
  }
  else {
    // Running from the command line
    avrdude_path = path.resolve(process.cwd(), process.argv[1], "../win-bin/avrdude.exe");
  }
}


// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // if (process.platform != 'darwin')
    app.quit();
});

// This method will be called when atom-shell has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 600, height: 700});

  // and load the index.html of the app.
  mainWindow.loadUrl('file://' + __dirname + '/index.html');

  mainWindow.webContents.on('did-finish-load', function() {
    listSerialPorts();
    mainWindow.webContents.send('process', avrdude_path);
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});

app.on('will-finish-launching', function() {
});

ipc.on('load-hex', function(event, data) {
  var hexName = data.name;
  var checkSum = data.sum;
  var checkOnly = data.checkOnly || false;
  console.log('requested load-hex: '+hexName);
  var data_path = app.getDataPath();
  if (!fs.existsSync(data_path))
    fs.mkdirSync(data_path);

  var full_hex_path = path.resolve(data_path, hexName);

  if (fs.existsSync(full_hex_path)) {
    getChecksum(full_hex_path, function (new_hash) {
      console.log("Check SHA1: " + new_hash);

      if (checkSum != new_hash) {
        console.log("checkSum: " + checkSum + "!=" + new_hash);
        fs.unlinkSync(full_hex_path);
        if (!checkOnly) {
          downloadHex(hexName, full_hex_path, checkSum);
        } else {
          mainWindow.webContents.send('hexDownloaded', {name: hexName, downloaded:false, checksumError:true});
        }
      } else {
        mainWindow.webContents.send('hexDownloaded', {name: hexName, downloaded:true, checksumError:false});
      }
    });
  } else {
    if (!checkOnly) {
      downloadHex(hexName, full_hex_path, checkSum);
    } else {
      mainWindow.webContents.send('hexDownloaded', {name: hexName, downloaded:false, checksumError:false});
    }
  }
});

ipc.on('program-hex', function(event, data) {
  if (data.reset) {
    resetTinyG(data.port, data.name);
  } else {
    runAvrdude(data.port, data.name);
  }
});

function getChecksum(full_path, callback) {
  var shasum = crypto.createHash('sha1');
  shasum.setEncoding('hex');
  var file = fs.createReadStream(full_path);
  var new_hash = null;
  file.on('end', function () {
    shasum.end();
    new_hash = shasum.read();
    callback(new_hash);
  });
  file.pipe(shasum);
}

function downloadHex(hexName, full_hex_path, checkSum) {
  var file = fs.createWriteStream(full_hex_path);
  var request = http.get("http://synthetos.github.io/binaries/"+hexName, function(response) {
    response.pipe(file);
    response.on('end', function () {
      file.end();
      console.log("Dowloaded: " + full_hex_path)

      getChecksum(full_hex_path, function (new_hash) {
        console.log("Post SHA1: " + new_hash);

        if (checkSum != new_hash) {
          console.log("checkSum: " + checkSum + "!=" + new_hash);
          fs.unlinkSync(full_hex_path);
          mainWindow.webContents.send('hexDownloaded', {name: hexName, downloaded:false, checksumError:true});
        } else {
          mainWindow.webContents.send('hexDownloaded', {name: hexName, downloaded:true, checksumError:false});
        }
      });
    });
  });
}

function runAvrdude(portPath, hexName) {
  var status = "connecting";
  var hashCount = 0;

  var data_path = app.getDataPath();
  var full_hex_path = path.resolve(data_path, hexName);

  console.log(portPath);

  mainWindow.webContents.send('status', {"text": "Connecting...", percent:0});

  avrdude = spawn(avrdude_path, ['-C', avrdude_path+'.conf', '-p', 'x192a3', '-c', 'avr109', '-b', '115200', '-P', portPath, '-U', 'flash:w:'+full_hex_path]);

  avrdude.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
  });

  avrdude.stderr.on('data', function (data) {
    console.log('stderr: ' + data);

    if (/AVR device initialized and ready to accept instructions/.test(data)) {
      status="connected";
      mainWindow.webContents.send('status', {"text": "Connected...", percent:0});
    }
    else if (/^Writing \|/m.test(data)) {
      if (status=="connected") {
        status="writing";
        hashCount=0;
        mainWindow.webContents.send('status', {"text": "Writing...", percent:0});
      }
    }
    else if (/^Reading \|/m.test(data)) {
      if (status=="writing") {
        status="verifying";
        hashCount=50;
        mainWindow.webContents.send('status', {"text": "Verifying...", percent:0});
      }
    }
    else if (/^#$/.test(data)) {
      if (status=="verifying" || status=="writing") {
        hashCount++;
        mainWindow.webContents.send('status', {percent:hashCount/100});
      }
    }
    else if (/^avrdude: (verification error|error:)/m.test(data)) {
      status="error";
      mainWindow.webContents.send('status', {"text": "Verify failed!", percent:1, error:true});
    }
    else if (/^avrdude: ([0-9]+) bytes of flash verified/m.test(data)) {
      status="verified";
      mainWindow.webContents.send('status', {"text": "Verified!", percent:1});
    }
  });

  avrdude.on('close', function (code) {
    console.log('child process exited with code ' + code);
    if (status!="verified") {
      mainWindow.webContents.send('status', {"text": "Verify failed!", percent:1, error:true});
    }
  });
};

ipc.on('check-version', function(event, data) {
  readVersion(data.port);
});

function readVersion(portPath) {
  var port = openTinyG(portPath);
  var portCloseTimeout = setTimeout(function() {
    try {
      port.close();
    } catch (e) {
      console.log("Timeout, closing port: " + e);
    }
    mainWindow.webContents.send('versionCheckResponse', {port:portPath, failed:true});
  }, 500);

  port.on('open', function () {
    port.flush(function() {
      port.write('{"fb":null}\n', function (err) {
        if (err) {
          console.log(err);
          port.close();
        }
      });
    });

    port.on('data', function (data) {
      console.log("tg> " + data);
      var err = false;
      try{
        if (/^{.+}$/m.test(data)) {
          var resp = JSON.parse(data);
          if (resp.r.fb) {
            console.log("fb: " + resp.r.fb.toString());
            mainWindow.webContents.send('versionCheckResponse', {port:portPath, failed:false, version:resp.r.fb});
            port.close();
          } else {
            console.log("resp: " + resp.toString());
          }
        } else {
          console.log("bad data: " + data);
        }
      } catch(e) {
        console.log("tg err> " + e.toString() + " parsing data: " + data.toString());
        err = true;
        port.close();
      }
      if (err) {
        mainWindow.webContents.send('versionCheckResponse', {port:portPath, failed:true});
      }
    });

    port.on('error', function (err) {
      console.log("err> " + err);
    });

    port.on('close', function (err) {
      clearTimeout(portCloseTimeout);
      console.log("closed> " + err);
    });
  });
}

function openTinyG(portPath) {
  var openOptions = {
    baudRate: 115200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    rtscts: true,
    parser: serialport.parsers.readline(/(?:\r\n|\r|\n)/)
  };
  return new serialport.SerialPort(portPath, openOptions);
}

function resetTinyG(portPath, hexName) {
  mainWindow.webContents.send('status', {"text": "Resetting into bootloader...", percent:0});

  var port = openTinyG(portPath);
  var portCloseTimeout = setTimeout(function() {
    try {
      port.close();
    } catch (e) {
      console.log("Timeout, closing port: " + e);
    }
    // mainWindow.webContents.send('versionCheckResponse', {port:portPath, failed:true});
  }, 500);
  port.on('open', function () {
    port.on('data', function (data) {
      console.log("tg> " + data.toString());
    });

    port.on('error', function (err) {
      console.log("err> " + err);
    });

    port.on('close', function (err) {
      clearTimeout(portCloseTimeout);
      runAvrdude(portPath, hexName);
    });

    port.write('{"boot":1}\n', function (err) {
      if (err) {
        console.log(err);
      } else {
        port.close();
      }
    });
  });
}

var _listSerialPortsTimeout = null;
function listSerialPorts() {
  clearTimeout(_listSerialPortsTimeout);
  console.log("Requested listing...");
  serialport.list(function (err, results) {
    if (err) {
      throw err;
    }

    var tinygs = [];

    for (var i = 0; i < results.length; i++) {
      var port = results[i];
      console.log(port);
      if ( /* OS X style:  */ (port.vendorId == 0x0403 && port.productId == 0x6015) ||
           /* Linux style: */ (port.pnpId == 'usb-0403_6015-if00') ||
           /* Win32 style: */ (/VID_0403\+PID_6015/.test(port.pnpId))
         ) {
        // TinyG attached
        tinygs.push(port);
      }
      // } else if ((port.vendorId == 0x03eb && port.productId == 0x6124) || (port.pnpId == 'usb-03eb_6124-if00')) {
      //   // TinyG v9 (SAM-BA Loader) attached
      //   console.log("Found G2v9 in Boot mode!\n")
      // } else if (port.vendorId == 0x03eb && port.productId == 0x2141 || (port.pnpId == 'usb-03eb_6124-if00')) {
      //   // TinyG v9 (SAM-BA Loader) attached
      //   console.log("Found SAM-ICE!\n")
      // }
    }


    mainWindow.webContents.send('portList', tinygs);
    _listSerialPortsTimeout = setTimeout(listSerialPorts, 1000);
  });
}
