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

/**
 * @public
 */
export class Service {
    constructor(public script: string, public processKey?: string) { }
}

import * as childProcess from "child_process";
import * as util from "util";

/**
 * @public
 */
export const execAsync = util.promisify(childProcess.exec);

/**
 * @public
 */
export type Script = string | ((context: { [key: string]: any }, parameters: string[]) => Promise<void>) | any[] | Set<any> | Service | { [name: string]: any };

/**
 * @public
 */
export type Time = { time: number, script: string };

function printInConsole(message: any) {
    // tslint:disable-next-line:no-console
    console.log(message);
}

async function executeStringScriptAsync(script: string, context: { [key: string]: any }, subProcesses: childProcess.ChildProcess[], processKey?: string) {
    return new Promise<number>((resolve, reject) => {
        const now = Date.now();
        const subProcess = childProcess.exec(script, { encoding: "utf8" }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(Date.now() - now);
            }
        });
        subProcess.stdout.pipe(process.stdout);
        subProcess.stderr.pipe(process.stderr);
        if (processKey) {
            context[processKey] = subProcess;
        }
        subProcesses.push(subProcess);
    });
}

/**
 * @public
 */
export async function executeScriptAsync(script: Script, parameters: string[] = [], context: { [key: string]: any } = {}, subProcesses: childProcess.ChildProcess[] = []): Promise<Time[]> {
    if (typeof script === "string") {
        printInConsole(script);
        const time = await executeStringScriptAsync(script, context, subProcesses);
        return [{ time, script }];
    } else if (Array.isArray(script)) {
        const times: Time[] = [];
        for (const child of script) {
            const time = await executeScriptAsync(child, parameters, context, subProcesses);
            times.push(...time);
        }
        return times;
    } else if (script instanceof Set) {
        const promises: Promise<Time[]>[] = [];
        for (const child of script) {
            promises.push(executeScriptAsync(child, parameters, context, subProcesses));
        }
        const times = await Promise.all(promises);
        let result: Time[] = [];
        let maxTotalTime = 0;
        for (const time of times) {
            const totalTime = time.reduce((p, c) => p + c.time, 0);
            if (totalTime > maxTotalTime) {
                result = time;
                maxTotalTime = totalTime;
            }
        }
        return result;
    } else if (script instanceof Service) {
        printInConsole(script.script);
        const now = Date.now();
        executeStringScriptAsync(script.script, context, subProcesses, script.processKey);
        return [{ time: Date.now() - now, script: script.script }];
    } else if (script instanceof Function) {
        const now = Date.now();
        await script(context, parameters);
        return [{ time: Date.now() - now, script: script.name || "custom function script" }];
    } else {
        const promises: Promise<Time[]>[] = [];
        for (const key in script) {
            if (script.hasOwnProperty(key)) {
                promises.push(executeScriptAsync(script[key], parameters, context, subProcesses));
            }
        }
        const times = await Promise.all(promises);
        let result: Time[] = [];
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
