'use strict';

// Declare app level module which depends on filters, and services
var binaryApp = angular.module('binaryApp', ['ui.bootstrap']);
var ipc = require('ipc');

binaryApp.controller('BinaryCtrl', function ($scope, $http, $modal) {
  $scope.binaries = [];
  $scope.ports = [];
  $scope.portVersions = {};
  $scope.autoReset = true;

  // Load the list of bundled binaries
  // $http.get('./tinyg-binaries.json').success(function(data) {
  //   $scope.binaries = data.binaries;
  //   $scope.updateList();
  // });

  // Update the list of online binaries
  $scope.updateList = function() {
    $http.get('http://synthetos.github.io/tinyg-binaries.json').success(function(data) {
      $scope.binaries = data.binaries;
      $scope.binaryClicked($scope.binaries[0]);
      for (var i = 1; i < $scope.binaries.length; i++) {
        var binary = $scope.binaries[i];
        if (!binary.downloaded) {
          binary.loading = true;
          ipc.send('load-hex', {name:binary.name+".hex", sum:binary.sum, checkOnly:true});
        }
      };
    });
  }

  $scope.updateList();

  ipc.on('portList', function(portList) {
    $scope.ports = portList;
    if (portList == null || portList.length == 0) {
      $scope.$parent.selectedPort = null;
    } else if ($scope.$parent.selectedPort == null) {
      $scope.$parent.selectedPort = $scope.ports[0].comName;
    }

    for (var i = 0; i < $scope.ports.length; i++) {
      var port = $scope.ports[i];
      if ($scope.portVersions[port.comName]) {
        var cached = $scope.portVersions[port.comName];
        port.failedCheck = cached.failed;
        port.version = cached.version;
      }
    }

    $scope.$apply();
  });

  ipc.on('hexDownloaded', function(data) {
    for (var i = 0; i < $scope.binaries.length; i++) {
      var bin = $scope.binaries[i];
      if (data.name == bin.name+".hex") {
        bin.downloaded = data.downloaded;
        bin.checksumError = data.checksumError;
        bin.loading = false;
      }
    }
  });

  ipc.on('process', function (data) {
    $scope.process = data;
  })

  $scope.checkVersion = function(port) {
    ipc.send('check-version', {port:port.comName});
    port.checking = true;
  }

  ipc.on('versionCheckResponse', function(data) {
    $scope.portVersions[data.port] = data;
    for (var i = 0; i < $scope.ports.length; i++) {
      var port = $scope.ports[i];
      if (port.comName == data.port) {
        port.checking = false;
        port.failedCheck = data.failed;
        port.version = data.version;
      }
    }
    $scope.$apply();
  });

  $scope.binaryClicked = function(binary) {
    $scope.selectedHex = binary;
    if (!binary.downloaded) {
      binary.loading = true;
      ipc.send('load-hex', {name:binary.name+".hex", sum:binary.sum});
    }
  }

  $scope.go = function() {
    $scope.programming = true;
    $scope.progress = {text:"Starting...", percent:0, error:false};
    delete $scope.portVersions[$scope.selectedPort];
    ipc.send('program-hex', {name:$scope.selectedHex.name+".hex", port:$scope.selectedPort, reset:$scope.autoReset});

    var modalInstance = $modal.open({
      templateUrl: 'programming.html',
      controller: ProgramInstanceCtrl,
      size: "sm",
      resolve: {
        data: function () {
          return {
              programming: $scope.programming,
              progress:    $scope.progress
          };
        }
      },
      backdrop: 'static'
    });

    modalInstance.result.then(function (selectedItem) {
      $scope.selected = selectedItem;
    }, function () {
      // dismissed
    });

  }
});


// Please note that $modalInstance represents a modal window (instance) dependency.
// It is not the same as the $modal service used above.

var ProgramInstanceCtrl = function ($scope, $modalInstance, data) {

  $scope.programming = data.programming;
  $scope.progress = data.progress;
  $scope.isCollapsed = true;
  $scope.log = "";

  $scope.ok = function () {
    $modalInstance.close('ok');
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };


  ipc.on('status', function(progress) {
    $scope.progress.text = progress.text || $scope.progress.text;
    $scope.progress.error = progress.error || $scope.progress.error ;
    $scope.progress.percent = progress.percent || $scope.progress.percent ;
    if ($scope.progress.percent == 1) {
      $scope.progress.type = $scope.progress.error ? "danger" : "success";
      $scope.programming = false;
    } else {
      $scope.progress.type = "info";
    };
    if (progress.log) {
      // var c = $( '#console' );
      // consoleFromBottom = c.scollHeight-c.scrollTop;
      $scope.log += progress.log;
      // if (consoleFromBottom < 10) {
        // c.scollHeight = c.scrollTop;
      // }
    }
  });
};
