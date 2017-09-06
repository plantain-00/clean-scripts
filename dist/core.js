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
function readableStreamEnd(stream) {
    return new Promise((resolve, reject) => {
        stream.on("end", () => {
            resolve();
        });
    });
}
exports.readableStreamEnd = readableStreamEnd;
