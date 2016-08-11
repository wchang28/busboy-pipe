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
    [field: string]: string | FileInfo[];
}
export interface EventParamsBase {
    req: express.Request;
}
export interface FilePipeParams extends EventParamsBase {
    fileInfo: FileInfo;
}
export interface FilesCountParams extends EventParamsBase {
    count: number;
}
export interface WriteStreamFactory {
    (params: FilePipeParams): WriteStreamInfo;
}
export declare function get(writeStreamFactory: WriteStreamFactory, eventEmitter?: events.EventEmitter): express.RequestHandler;
