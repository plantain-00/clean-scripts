"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
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
        readable.on('end', () => {
            resolve();
        });
        readable.on('error', error => {
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
/**
 * @public
 */
class Program {
    constructor(script, timeout, processKey) {
        this.script = script;
        this.timeout = timeout;
        this.processKey = processKey;
    }
}
exports.Program = Program;
const childProcess = tslib_1.__importStar(require("child_process"));
const util = tslib_1.__importStar(require("util"));
/**
 * @public
 */
exports.execAsync = util.promisify(childProcess.exec);
async function executeStringScriptAsync(script, context, subProcesses, processKey, timeout) {
    return new Promise((resolve, reject) => {
        const now = Date.now();
        const subProcess = childProcess.exec(script, { encoding: 'utf8' }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(Date.now() - now);
            }
        });
        subProcess.stdout.pipe(process.stdout);
        subProcess.stderr.pipe(process.stderr);
        if (processKey) {
            context[processKey] = subProcess;
        }
        subProcesses.push(subProcess);
        if (timeout) {
            setTimeout(() => {
                resolve(Date.now() - now);
            }, timeout);
        }
    });
}
/**
 * @public
 */
// tslint:disable-next-line:cognitive-complexity
async function executeScriptAsync(script, parameters = [], context = {}, subProcesses = []) {
    if (script === undefined || script === null) {
        return [];
    }
    else if (typeof script === 'string') {
        console.log(script);
        const time = await executeStringScriptAsync(script, context, subProcesses);
        return [{ time, script }];
    }
    else if (Array.isArray(script)) {
        const times = [];
        for (const child of script) {
            const time = await executeScriptAsync(child, parameters, context, subProcesses);
            times.push(...time);
        }
        return times;
    }
    else if (script instanceof Set) {
        const promises = [];
        for (const child of script) {
            promises.push(executeScriptAsync(child, parameters, context, subProcesses));
        }
        const times = await Promise.all(promises);
        let result = [];
        let maxTotalTime = 0;
        for (const time of times) {
            const totalTime = time.reduce((p, c) => p + c.time, 0);
            if (totalTime > maxTotalTime) {
                result = time;
                maxTotalTime = totalTime;
            }
        }
        return result;
    }
    else if (script instanceof Service) {
        console.log(script.script);
        const now = Date.now();
        executeStringScriptAsync(script.script, context, subProcesses, script.processKey);
        return [{ time: Date.now() - now, script: script.script }];
    }
    else if (script instanceof Program) {
        console.log(script.script);
        const time = await executeStringScriptAsync(script.script, context, subProcesses, script.processKey, script.timeout);
        return [{ time, script: script.script }];
    }
    else if (script instanceof Function) {
        const now = Date.now();
        await script(context, parameters);
        return [{ time: Date.now() - now, script: script.name || 'custom function script' }];
    }
    else {
        const promises = [];
        for (const key in script) {
            if (script.hasOwnProperty(key)) {
                promises.push(executeScriptAsync(script[key], parameters, context, subProcesses));
            }
        }
        const times = await Promise.all(promises);
        let result = [];
        let maxTotalTime = 0;
        for (const time of times) {
            const totalTime = time.reduce((p, c) => p + c.time, 0);
            if (totalTime > maxTotalTime) {
                result = time;
                maxTotalTime = totalTime;
            }
        }
        return result;
    }
}
exports.executeScriptAsync = executeScriptAsync;
const fs = tslib_1.__importStar(require("fs"));
/**
 * @public
 */
async function checkGitStatus() {
    const { stdout } = await exports.execAsync('git status -s');
    if (stdout) {
        console.log(stdout);
        const files = stdout.split('\n').filter(s => s.length > 0).map(s => s.substring(3));
        for (const file of files) {
            if (fs.existsSync(file)) {
                console.log(`${file}:`);
                console.log(fs.readFileSync(file).toString());
            }
        }
        throw new Error(`generated files doesn't match.`);
    }
}
exports.checkGitStatus = checkGitStatus;
