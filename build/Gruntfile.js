// We are using node.js v0.11.13 and atom-shell 0.15.9.
var path = require('path');
var decompressZip = require('decompress-zip');

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    "download-atom-shell": {
      version: "0.15.9",
      outputDir: "./atom-shell",
      rebuild: true
    },
    'build-atom-shell-app': {
        options: {
            platforms: ["darwin-x64", "win32-ia32"],
            atom_shell_version: "v0.15.9",
            app_dir: "../TinyG-Updater"
        }
    }
  });

  grunt.loadNpmTasks('grunt-atom-shell-app-builder');
  grunt.loadNpmTasks('grunt-download-atom-shell');

  grunt.registerTask('postprocess', 'put the node_modules files in place...', function() {

  });

  grunt.registerTask('default', 'Build TinyG-Uploader for all suppported platforms.', ['grunt-atom-shell-app-builder', 'postprocess'] );

};
