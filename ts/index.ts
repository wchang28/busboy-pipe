let Busboy = require('busboy');
import * as express from 'express';
import * as stream from 'stream';
import * as events from 'events';

export interface FileInfo {
	length: number;

	filename?: string;
	encoding?: string;
	mimetype?: string;

	err?: any;
	streamInfo?: any;
}

export interface WriteStreamInfo {
	stream: stream.Writable;
	streamInfo?: any;
}

export interface Body {
	[field:string]: string | FileInfo[]
}

export interface EventParamsBase {
	req: express.Request
}

export interface FilePipeParams extends EventParamsBase {
	fileInfo: FileInfo;
}

export interface FilesCountParams extends EventParamsBase {
	count: number;
}

export interface WriteStreamFactory {
	(params: FilePipeParams) : WriteStreamInfo
}

// supports the following events:
// 1. begin (EventParamsBase)
// 2. end (EventParamsBase)
// 3. total-files-count (FilesCountParams)
// 4. file-data-rcvd (FilePipeParams)
// 5. file-piped (FilePipeParams)
export function get(writeStreamFactory: WriteStreamFactory, eventEmitter?: events.EventEmitter) : express.RequestHandler {
	return (req: express.Request, res:express.Response, next: express.NextFunction) => {
		let contentType = req.headers['content-type'];
		if (req.method.toLowerCase() === 'post' && contentType && contentType.match(/multipart\/form-data/)){
			if (eventEmitter) eventEmitter.emit('begin', {req});
			let num_files_piped = 0;
			let num_files_total:number = null;
			let counter:number = 0;
			req.body = {};
			let busboy = new Busboy({ headers: req.headers });
			busboy.on('file', (fieldname:string, file:stream.Readable, filename?:string, encoding?:string, mimetype?:string) => {
				//console.log('File {' + fieldname + '}: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
				let fileInfo:FileInfo = {filename: filename, encoding: encoding, mimetype: mimetype, length:0};
				if (!req.body[fieldname]) req.body[fieldname] = [];
				req.body[fieldname].push(fileInfo);
				counter++;
				let ret = writeStreamFactory({req, fileInfo});
				let writeStream = ret.stream;
				if (ret.streamInfo) fileInfo.streamInfo = ret.streamInfo;
				let pipeDone = (err: any) => {
					if (err) fileInfo.err = err;
					if (eventEmitter) eventEmitter.emit('file-piped', {req, fileInfo});
					num_files_piped++;
					if (typeof num_files_total === 'number' && num_files_total === num_files_piped) {
						if (eventEmitter) eventEmitter.emit('end', {req});
						next();
					}					
				}
				file.on('data', (data: Buffer) => {
					fileInfo.length += data.length;
					if (eventEmitter) eventEmitter.emit('file-data-rcvd', {req, fileInfo});
				});
				writeStream.on('close', () => {
					pipeDone(null);
				});
				file.on('error', pipeDone).pipe(writeStream).on('error', pipeDone);
			});
			busboy.on('field', (fieldname:string, val:string, fieldnameTruncated, valTruncated, encoding, mimetype) => {
				req.body[fieldname] = val;
			});
			busboy.on('finish', () => {
				num_files_total = counter;
				if (eventEmitter) eventEmitter.emit('total-files-count', {req, count: num_files_total});
			});
			req.pipe(busboy);
		} else
			next();
	};
}