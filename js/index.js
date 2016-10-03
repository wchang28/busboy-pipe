"use strict";
var Busboy = require('busboy');
// supports the following events:
// 1. begin (EventParamsBase)
// 2. end (EventParamsBase)
// 3. total-files-count (FilesCountParams)
// 4. file-begin (FilePipeParams)
// 5. file-data-rcvd (FilePipeParams)
// 6. file-end (FilePipeParams)
// 7. field (FieldParams)
function get(writeStreamFactory, options) {
    var eventEmitter = (options && options.eventEmitter ? options.eventEmitter : null);
    return function (req, res, next) {
        var contentType = req.headers['content-type'];
        if (req.method.toLowerCase() === 'post' && contentType && contentType.match(/multipart\/form-data/)) {
            if (eventEmitter)
                eventEmitter.emit('begin', { req: req });
            var num_files_processed_1 = 0;
            var num_files_total_1 = null;
            var counter_1 = 0;
            req.body = {};
            var busboy = new Busboy({ headers: req.headers });
            busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
                var fileInfo = { filename: filename, encoding: encoding, mimetype: mimetype, length: 0 };
                if (eventEmitter)
                    eventEmitter.emit('file-begin', { req: req, fileInfo: fileInfo });
                if (!req.body[fieldname])
                    req.body[fieldname] = [];
                req.body[fieldname].push(fileInfo);
                counter_1++;
                var ret = writeStreamFactory({ req: req, fileInfo: fileInfo });
                var writeStream = ret.stream;
                if (ret.streamInfo)
                    fileInfo.streamInfo = ret.streamInfo;
                var fileDone = function (err) {
                    if (err)
                        fileInfo.err = err;
                    if (eventEmitter)
                        eventEmitter.emit('file-end', { req: req, fileInfo: fileInfo });
                    num_files_processed_1++;
                    if (typeof num_files_total_1 === 'number' && num_files_total_1 === num_files_processed_1) {
                        if (eventEmitter)
                            eventEmitter.emit('end', { req: req });
                        next();
                    }
                };
                file.on('data', function (data) {
                    fileInfo.length += data.length;
                    if (eventEmitter)
                        eventEmitter.emit('file-data-rcvd', { req: req, fileInfo: fileInfo });
                });
                if (writeStream) {
                    writeStream.on('close', function () {
                        //console.log('writeStream on "close", total bytes=' +  fileInfo.length);
                        fileDone(null);
                    });
                    file.on('error', fileDone).pipe(writeStream).on('error', fileDone);
                }
                else {
                    file.on('end', function () {
                        //console.log('file on "end", total bytes=' +  fileInfo.length);
                        fileDone(null);
                    });
                }
            });
            busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
                req.body[fieldname] = val;
                if (eventEmitter)
                    eventEmitter.emit('field', { req: req, fieldname: fieldname, val: val });
            });
            busboy.on('finish', function () {
                num_files_total_1 = counter_1;
                if (eventEmitter)
                    eventEmitter.emit('total-files-count', { req: req, count: num_files_total_1 });
            });
            req.pipe(busboy);
        }
        else
            next();
    };
}
exports.get = get;
