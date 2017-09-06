/**
 * @public
 */
export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

import * as stream from "stream";

/**
 * @public
 */
export function readableStreamEnd(readable: stream.Readable) {
    return new Promise<void>((resolve, reject) => {
        readable.on("end", () => {
            resolve();
        });
        readable.on("error", error => {
            reject(error);
        });
    });
}
