var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Imagemagick = require('imagemagick');
var mkdirp = require('mkdirp');
var querystring = require('querystring');
var http = require('http');

var fileTypes = [".jpg", ".png", ".bmp"];
var _ORIGINALSIMAGEFOLDER = "./public/originals";
var _originalDir = "originals";
var _RENAME = true;
var _RESIZE = true;
var totalImagesToResize = 0;
var amountOfImagesResized = 0;

var mongoArray = [];

// rename files with crypto-id
var renameAndResizeFile = function (parsedImage) {
    if (!_RESIZE) return;

    mkdirp("./public/resized/" + path.dirname(parsedImage.path), function (err) {
        // path was created unless there was error
        if (err) {
            console.log("Couldn't create folder: " + "./public/resized/" + path.dirname(parsedImage.path));
            return;
        }

        var destinationPath = _RENAME ? path.resolve("./public/resized/" + parsedImage.path) : parsedImage.originalName;
        //console.log("Destination", destinationPath);
        Imagemagick.convert([parsedImage.originalName, '-resize', '816', destinationPath], function (err, stdout) {
            if (err) throw err;
            console.log(parsedImage.id + " has been resized.");
            amountOfImagesResized++;
            checkIsResizingDone();
            sendToStatisticsMachine(parsedImage);
            fs.rename(parsedImage.originalName, path.dirname(parsedImage.originalName) +"/"+ parsedImage.id);
        });
    });

};

// sends a imageobject to meteor

var sendToStatisticsMachine = function (parsedImage) {
    var data = JSON.stringify({
        id: parsedImage.id,
        path: parsedImage.path,
        dateTime: parsedImage.dateTime,
        workshop: parsedImage.workshop,
        class: parsedImage.class,
        round: parsedImage.round,
        baseName: parsedImage.baseName
    });
    console.log(data);

    var options = {
        host: '127.0.0.1',
        port: 3000,
        path: '/add_image',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log("ImageData send to meteor: " + chunk);
        });
    });

    req.write(data);
    req.end();

};

// checks if there is images in the resizing queue
var checkIsResizingDone = function () {
    if (amountOfImagesResized === totalImagesToResize) {
        console.log("All images have been resized.");
    }
}

// parallel recursive file finder
var walk = function (dir, done) {
    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function (err, res) {
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


//add to directory array
var addToDirectoryArray = function (parsedImage) {
    parsedImage.path = _originalDir;
    var dirs = path.dirname(parsedImage.originalName).split(path.sep);

    var subDirs = dirs.slice(dirs.indexOf(_originalDir) + 1);
    parsedImage.workshop = subDirs[0] || null;
    parsedImage.class = subDirs[1] || null;
    parsedImage.round = subDirs[2] || null;
    parsedImage.path = subDirs.join("/") + "/" + parsedImage.id;

    // Add tags
    if (subDirs.length > 2) {
        parsedImage.tags = subDirs.slice(2);
    }
};

//returns a parsed object from path
var createParsedImage = function (entry) {

    return {
        originalName: entry,
        extname: path.extname(entry).toLowerCase(),
        baseName: path.basename(entry, path.extname(entry)),
        id: null,
        path: null,
        tags: [],
        metadata: {}
    };
};

module.exports.analyze = function () {

    walk(_ORIGINALSIMAGEFOLDER, function (err, results) {
        if (err) throw err;

        //run through all files
        results.forEach(function (entry) {
            //check filetype
            if (fileTypes.indexOf(path.extname(entry).toLowerCase()) > -1) {
                console.log(entry);
                var basename = path.basename(entry);

                // if the image is new to the system..
                if (basename.substring(0, 3) !== "SM_") {

                    var parsedImage = createParsedImage(entry);

                    //generate random id for filename
                    parsedImage.id = "SM_" + parsedImage.baseName + "_" + crypto.randomBytes(10).toString('hex') + parsedImage.extname;

                    addToDirectoryArray(parsedImage);

                    Imagemagick.readMetadata(entry, function (err, meta) {
                        parsedImage.dateTime = meta.exif.dateTimeOriginal;
                        console.log("Resizing image " + parsedImage.baseName);
                        totalImagesToResize++;
                        renameAndResizeFile(parsedImage);
                    });
                }

            } else {
                console.log("File skipped: " + entry);
            }
        });
        console.log("All files scanned.");
    });
    return mongoArray;
};
