var fs = require('fs');
var path = require('path');
var Imagemagick = require('imagemagick');
var mkdirp = require('mkdirp');

var config = require('./config');
var filescanner = require('./filescanner');
var entryHandler = require('./entryHandler');

var filetypes = [".jpg", ".png", ".bmp"];

var totalImagesToResize = 0;
var amountOfImagesResized = 0;

// rename files with crypto-id
var renameAndResizeFile = function(parsedImage) {

    mkdirp("./public/resized/" + path.dirname(parsedImage.path), function (err) {
        // path was created unless there was error
        if (err) {
            console.log("Couldn't create folder: " + "./public/resized/" + path.dirname(parsedImage.path));
            return;
        }

        if (config.enableResize) {
            var destinationPath = config.enableRename ? path.resolve("./public/resized/" + parsedImage.path) : parsedImage.originalName;
            console.log("Resizing image " + parsedImage.baseName);
            totalImagesToResize++;
            resizeImg(parsedImage.originalName, destinationPath, function() {
                afterImgResized();
                entryHandler.sendToStatisticsMachine(parsedImage);
                renameImg(parsedImage);
            });
        } else {
            entryHandler.sendToStatisticsMachine(parsedImage);
            renameImg(parsedImage);
        }
    });

};

var resizeImg = function(imgPath, imgDestination, onComplete) {
    Imagemagick.convert([imgPath, '-resize', '816', imgDestination], onComplete);
};

var renameImg = function(parsedImage) {
    if (!config.enableRename) return;

    fs.rename(parsedImage.originalName, path.dirname(parsedImage.originalName) +"/"+ parsedImage.id);
};

var afterImgResized = function(err) {
    if (err) throw err;

    amountOfImagesResized++;
    checkIsResizingDone();
};

// checks if there is images in the resizing queue
var checkIsResizingDone = function () {
    if (amountOfImagesResized === totalImagesToResize) {
        console.log("All images have been resized.");
    }
};

module.exports.analyze = function () {

    filescanner.walkDirectory(config.originalsDir, function (err, results) {
        if (err) throw err;

        //run through all files
        results.forEach(function (filepath) {
            //check filetype
            if (filescanner.isValidFiletype(filepath, config.imgFileTypes) && filescanner.isUnhandledFile(filepath)) {

                var parsedImage = entryHandler.createParsedImage(filepath);

                Imagemagick.readMetadata(filepath, function (err, meta) {
                    parsedImage.dateTime = meta.exif.dateTimeOriginal;
                    renameAndResizeFile(parsedImage);
                });

            } else {
                console.log("File skipped: " + filepath);
            }
        });
        console.log("All files scanned.");
    });
};
