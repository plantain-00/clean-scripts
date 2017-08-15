"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minimist = require("minimist");
const childProcess = require("child_process");
const path = require("path");
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
    for (const scriptName of scriptNames) {
        // tslint:disable-next-line:no-eval
        const scriptValues = scripts[scriptName] || eval("scripts." + scriptName);
        if (!scriptValues) {
            throw new Error(`Unknown script name: ${scriptName}`);
        }
        await executeScript(scriptValues);
    }
}
async function execAsync(script) {
    return new Promise((resolve, reject) => {
        const subProcess = childProcess.exec(script, { encoding: "utf8" }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
        subProcess.stdout.pipe(process.stdout);
        subProcess.stderr.pipe(process.stderr);
    });
}
async function executeScript(script) {
    if (typeof script === "string") {
        printInConsole(script);
        await execAsync(script);
    }
    else if (Array.isArray(script)) {
        for (const child of script) {
            await executeScript(child);
        }
    }
    else if (script instanceof Set) {
        const promises = [];
        for (const child of script) {
            promises.push(executeScript(child));
        }
        await Promise.all(promises);
    }
    else if (script instanceof Function) {
        await script();
    }
    else {
        const promises = [];
        for (const key in script) {
            if (script.hasOwnProperty(key)) {
                promises.push(executeScript(script[key]));
            }
        }
        await Promise.all(promises);
    }
}
executeCommandLine().then(() => {
    printInConsole("script success.");
}, error => {
    printInConsole(error);
    process.exit(1);
});
