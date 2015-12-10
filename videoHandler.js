var fs = require('fs');
var path = require('path');

var config = require('./config');
var filescanner = require('./filescanner');
var entryHandler = require('./entryHandler');

// rename files with crypto-id
var moveAndRename = function(parsedObject) {

    if (config.enableRename) {
        entryHandler.sendToStatisticsMachine(parsedObject);
        renameVideo(parsedObject);
    }

};

var renameVideo = function(parsedObject) {
    if (!config.enableRename) return;

    fs.rename(parsedObject.originalName, path.dirname(parsedObject.originalName) +"/"+ parsedObject.id);
};

module.exports.analyze = function () {

    filescanner.walkDirectory(config.videoOriginalsDir, function (err, results) {
        if (err) throw err;

        //run through all files
        results.forEach(function (filepath) {
            //check filetype

            if (filescanner.isValidFiletype(filepath, config.videoFileTypes) && filescanner.isUnhandledFile(filepath)) {

                var parsedObject = entryHandler.createParsedImage(filepath, true);

                parsedObject.tags.push("video");

                moveAndRename(parsedObject);

            } else {
                console.log("File skipped: " + filepath);
            }
        });
        console.log("All files scanned.");
    });
};
