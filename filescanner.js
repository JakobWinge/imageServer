var fs = require('fs');
var path = require('path');
var config = require('./config');

// parallel recursive file finder
var walkDirectory = function (dir, done) {
    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walkDirectory(file, function (err, res) {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    results.push(file);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};

module.exports.walkDirectory = walkDirectory;

module.exports.isValidFiletype = function(filepath, validFiletypes) {
    return validFiletypes.indexOf(path.extname(filepath).toLowerCase()) > -1;
};

module.exports.isUnhandledFile = function(filepath) {
    // if the image is new to the system (hasn't been renamed)
    return path.basename(filepath).substring(0, 3) !== config.handledPrefix;
};