var http = require('http');
var path = require('path');
var crypto = require('crypto');
var config = require('./config');

var getOriginalsBaseDir = function() {
    return config.originalsDir.substring(config.originalsDir.lastIndexOf('/')+1);
};

var getOriginalVideoBaseDir = function() {
    return config.videoOriginalsDir.substring(config.videoOriginalsDir.lastIndexOf('/')+1);
};

var addDataFromImagePath = function (parsedImageData, isVideo) {

    var baseDir = isVideo ? getOriginalVideoBaseDir() : getOriginalsBaseDir();

    var dirs = path.dirname(parsedImageData.originalName).split(path.sep);

    var subDirs = dirs.slice(dirs.indexOf(baseDir) + 1);

    // Set values
    parsedImageData.workshop = subDirs[0] || null;
    parsedImageData.class = subDirs[1] || null;
    parsedImageData.round = subDirs[2] || null;
    parsedImageData.path = subDirs.join("/") + "/" + parsedImageData.id;

    // Add tags
    if (subDirs.length > 2) {
        parsedImageData.tags = subDirs.slice(2);
    }

    return parsedImageData;
};

var generateId = function(parsedImageData) {
    return "SM_" + parsedImageData.baseName + "_" + crypto.randomBytes(10).toString('hex') + parsedImageData.extname;
}


module.exports.createParsedImage = function (entryPath, isVideo) {

    var parsedImageData = {
        originalName: entryPath,
        extname: path.extname(entryPath).toLowerCase(),
        baseName: path.basename(entryPath, path.extname(entryPath)),
        video: isVideo,
        id: null,
        path: null,
        tags: [],
        metadata: {}
    };

    parsedImageData.id = generateId(parsedImageData);

    return addDataFromImagePath( parsedImageData, isVideo );
};

module.exports.sendToStatisticsMachine = function(parsedImageData) {
    var data = JSON.stringify({
        id: parsedImageData.id,
        path: parsedImageData.path,
        dateTime: parsedImageData.dateTime,
        workshop: parsedImageData.workshop,
        class: parsedImageData.class,
        round: parsedImageData.round,
        baseName: parsedImageData.baseName,
        video: parsedImageData.video || false,
        state: parsedImageData.video ? 'picture' : null,
        tags: parsedImageData.tags
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