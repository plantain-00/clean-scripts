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
/**
 * @public
 */
class Service {
    constructor(script, processKey) {
        this.script = script;
        this.processKey = processKey;
    }
}
exports.Service = Service;
const childProcess = require("child_process");
const util = require("util");
/**
 * @public
 */
exports.execAsync = util.promisify(childProcess.exec);
