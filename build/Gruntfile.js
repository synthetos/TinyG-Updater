// We are using node.js v0.11.13 and atom-shell 0.15.9.
var path = require('path');
var wrench = require('wrench');

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
    },
    'postprocess': {}
  });

  grunt.loadNpmTasks('grunt-atom-shell-app-builder');
  grunt.loadNpmTasks('grunt-download-atom-shell');

  grunt.registerTask('postprocess', 'put the node_modules files in place...', function() {
    var build_dir = grunt.config['build-atom-shell-app.options.build_dir'] || 'build';

    [
      {
        'platform': 'darwin',
        'atom-path': path.join(build_dir, "darwin-x64", "atom-shell", "Atom.app", "Contents","Resources", "app"),
        'module-path': path.join(process.cwd(), "../node_modules-node-v14-darwin-x64.zip"),
        'bin-path': path.join(process.cwd(), "../darwin-bin")
      },
      {
        'platform': 'win32',
        'atom-path': path.join(build_dir, "win32-ia32", "atom-shell", "resources", "app"),
        'module-path': path.join(process.cwd(), "../node_modules-node-v14-win32-ia32.zip"),
        'bin-path': path.join(process.cwd(), "../win32-bin")
      }
    ].forEach(function (plat_arch) {
      grunt.log.ok("Extracting node_modules for " + plat_arch.platform);
      spawn = require('child_process').spawn;
      zip = spawn('unzip',['-qq','-o', plat_arch['module-path'], '-d', plat_arch['atom-path']]);
      zip.on('exit', function(code) {
        localcallback(null);
      });
      zip.stdout.on('data', function(data) { });
      zip.stderr.on('data', function(data) { });
      zip.on('error', function(err){
        grunt.log.error(err);
        localcallback(err);
      });

      grunt.log.ok("Copying binary path for " + plat_arch.platform);
      wrench.copyDirSyncRecursive(plat_arch['bin-path'], path.join(plat_arch['atom-path'], "bin"), {
        forceDelete: true,
        excludeHiddenUnix: true,
        preserveFiles: false,
        preserveTimestamps: true,
        inflateSymlinks: true
      });

    })
  });

  grunt.registerTask('default', ['build-atom-shell-app', 'postprocess'] );

};
