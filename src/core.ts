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
export function readableStreamEnd(stream: stream.Readable) {
    return new Promise<void>((resolve, reject) => {
        stream.on("end", () => {
            resolve();
        });
    });
}
