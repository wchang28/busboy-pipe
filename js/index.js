var Busboy = require('busboy');
// supports the following events:
// 1. begin (EventParamsBase)
// 2. end (EventParamsBase)
// 3. total-files-count (FilesCountParams)
// 4. file-data-rcvd (FilePipeParams)
// 5. file-piped (FilePipeParams)
function get(writeStreamFactory, eventEmitter) {
    return function (req, res, next) {
        var contentType = req.headers['content-type'];
        if (req.method.toLowerCase() === 'post' && contentType && contentType.match(/multipart\/form-data/)) {
            if (eventEmitter)
                eventEmitter.emit('begin', { req: req });
            var num_files_piped_1 = 0;
            var num_files_total_1 = null;
            var counter_1 = 0;
            req.body = {};
            var busboy = new Busboy({ headers: req.headers });
            busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
                //console.log('File {' + fieldname + '}: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
                var fileInfo = { filename: filename, encoding: encoding, mimetype: mimetype, length: 0 };
                if (!req.body[fieldname])
                    req.body[fieldname] = [];
                req.body[fieldname].push(fileInfo);
                counter_1++;
                var ret = writeStreamFactory({ req: req, fileInfo: fileInfo });
                var writeStream = ret.stream;
                if (ret.streamInfo)
                    fileInfo.streamInfo = ret.streamInfo;
                var pipeDone = function (err) {
                    if (err)
                        fileInfo.err = err;
                    if (eventEmitter)
                        eventEmitter.emit('file-piped', { req: req, fileInfo: fileInfo });
                    num_files_piped_1++;
                    if (typeof num_files_total_1 === 'number' && num_files_total_1 === num_files_piped_1) {
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
                writeStream.on('close', function () {
                    pipeDone(null);
                });
                file.on('error', pipeDone).pipe(writeStream).on('error', pipeDone);
            });
            busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
                req.body[fieldname] = val;
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
