/// <reference types="node" />
/**
 * @public
 */
export declare function sleep(ms: number): Promise<{}>;
import * as stream from "stream";
/**
 * @public
 */
export declare function readableStreamEnd(readable: stream.Readable): Promise<void>;
/**
 * @public
 */
export declare class Service {
    script: string;
    processKey: string | undefined;
    constructor(script: string, processKey?: string | undefined);
}
import * as childProcess from "child_process";
/**
 * @public
 */
export declare const execAsync: typeof childProcess.exec.__promisify__;
