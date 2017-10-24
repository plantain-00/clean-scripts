"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minimist = require("minimist");
const childProcess = require("child_process");
const path = require("path");
const prettyMs = require("pretty-ms");
const core = require("./core");
const packageJson = require("../package.json");
const defaultConfigName = "clean-scripts.config.js";
function printInConsole(message) {
    // tslint:disable-next-line:no-console
    console.log(message);
}
function showToolVersion() {
    printInConsole(`Version: ${packageJson.version}`);
}
async function executeCommandLine() {
    const argv = minimist(process.argv.slice(2), { "--": true });
    const showVersion = argv.v || argv.version;
    if (showVersion) {
        showToolVersion();
        return;
    }
    const scripts = require(path.resolve(process.cwd(), argv.config || defaultConfigName));
    const scriptNames = argv._;
    if (!scriptNames || scriptNames.length === 0) {
        throw new Error(`Need a script`);
    }
    const scriptName = scriptNames[0];
    const parameters = scriptNames.slice(1);
    // tslint:disable-next-line:no-eval
    const scriptValues = scripts[scriptName] || eval("scripts." + scriptName);
    if (!scriptValues) {
        throw new Error(`Unknown script name: ${scriptName}`);
    }
    const times = await executeScript(scriptValues, parameters);
    const totalTime = times.reduce((p, c) => p + c.time, 0);
    printInConsole(`----------------total: ${prettyMs(totalTime)}----------------`);
    for (const { time, script } of times) {
        const pecent = Math.round(100.0 * time / totalTime);
        printInConsole(`${prettyMs(time)} ${pecent}% ${script}`);
    }
    printInConsole(`----------------total: ${prettyMs(totalTime)}----------------`);
}
const serviceProcesses = [];
const context = {};
async function execAsync(script, isService, processKey) {
    return new Promise((resolve, reject) => {
        const now = Date.now();
        const subProcess = childProcess.exec(script, { encoding: "utf8" }, (error, stdout, stderr) => {
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
        if (isService) {
            serviceProcesses.push(subProcess);
        }
    });
}
async function executeScript(script, parameters) {
    if (typeof script === "string") {
        printInConsole(script);
        const time = await execAsync(script, false);
        return [{ time, script }];
    }
    else if (Array.isArray(script)) {
        const times = [];
        for (const child of script) {
            const time = await executeScript(child, parameters);
            times.push(...time);
        }
        return times;
    }
    else if (script instanceof Set) {
        const promises = [];
        for (const child of script) {
            promises.push(executeScript(child, parameters));
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
    else if (script instanceof core.Service) {
        printInConsole(script.script);
        const now = Date.now();
        execAsync(script.script, true, script.processKey);
        return [{ time: Date.now() - now, script: script.script }];
    }
    else if (script instanceof Function) {
        const now = Date.now();
        await script(context, parameters);
        return [{ time: Date.now() - now, script: script.name || "custom function script" }];
    }
    else {
        const promises = [];
        for (const key in script) {
            if (script.hasOwnProperty(key)) {
                promises.push(executeScript(script[key], parameters));
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
executeCommandLine().then(() => {
    for (const subProcess of serviceProcesses) {
        subProcess.kill("SIGINT");
    }
    printInConsole("script success.");
}, error => {
    printInConsole(error);
    for (const subProcess of serviceProcesses) {
        subProcess.kill("SIGINT");
    }
    process.exit(1);
});
