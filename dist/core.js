"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @public
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.sleep = sleep;
/**
 * @public
 */
function readableStreamEnd(readable) {
    return new Promise((resolve, reject) => {
        readable.on("end", () => {
            resolve();
        });
        readable.on("error", error => {
            reject(error);
        });
    });
}
exports.readableStreamEnd = readableStreamEnd;
