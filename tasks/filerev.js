'use strict';
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var chalk = require('chalk');
var eachAsync = require('each-async');

module.exports = function (grunt) {
  grunt.registerMultiTask('filerev', 'File revisioning based on content hashing', function () {
    var options = this.options({
      encoding: 'utf8',
      algorithm: 'md5',
      length: 8,
      dropCwd: false
    });
    var target = this.target;
    var filerev = grunt.filerev || {summary: {}};
    var cwd = this.data.cwd || '';

    eachAsync(this.files, function (el, i, next) {
      var move = true;

      // If dest is furnished it should indicate a directory
      if (el.dest) {
        // When globbing is used, el.dest contains basename, we remove it
        if (el.orig.expand) {
          el.dest = path.dirname(el.dest);
        }

        try {
          var stat = fs.lstatSync(el.dest);
          if (stat && !stat.isDirectory()) {
            grunt.fail.fatal('Destination ' + el.dest  + ' for target ' + target + ' is not a directory');
          }
        } catch (err) {
          grunt.log.writeln('Destination dir ' + el.dest + ' does not exists for target ' + target + ': creating');
          grunt.file.mkdir(el.dest);
        }
        // We need to copy file as we now have a dest different from the src
        move = false;
      }

      el.src.forEach(function (file) {
        if (grunt.file.isDir(file)) {
          return;
        }

        var dirname;
        var hash = crypto.createHash(options.algorithm).update(grunt.file.read(file), options.encoding).digest('hex');
        var suffix = hash.slice(0, options.length);
        var ext = path.extname(file);
        var newName = [path.basename(file, ext), suffix, ext.slice(1)].join('.');
        var resultPath;

        if (move) {
          dirname = path.dirname(file);
          resultPath = path.resolve(dirname, newName);
          fs.renameSync(file, resultPath);
        } else {
          dirname = el.dest;
          resultPath = path.resolve(dirname, newName);
          grunt.file.copy(file, resultPath);
        }

        filerev.summary[fixPath(path.normalize(file))] = fixPath(path.join(dirname, newName));
        grunt.log.writeln(chalk.green('✔ ') + file + chalk.gray(' changed to ') + newName);
      });

      next();
    }, this.async());

    function fixPath (path) {
        // Drop cwd from path if relative option is set to true
        if (options.dropCwd === true && cwd.length) {
            var pos = path.indexOf(cwd);
            if (pos === 0) {
                path = path.slice(cwd.length);
            }
        }
        return path;
    }

    grunt.filerev = filerev;
  });
};
