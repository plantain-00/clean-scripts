"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minimist = require("minimist");
const path = require("path");
const prettyMs = require("pretty-ms");
const core_1 = require("./core");
const packageJson = require("../package.json");
const defaultConfigName = 'clean-scripts.config.js';
function showToolVersion() {
    console.log(`Version: ${packageJson.version}`);
}
const subProcesses = [];
const context = {};
async function executeCommandLine() {
    const argv = minimist(process.argv.slice(2), { '--': true });
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
    const scriptValues = scripts[scriptName] || eval('scripts.' + scriptName);
    if (!scriptValues) {
        throw new Error(`Unknown script name: ${scriptName}`);
    }
    const times = await core_1.executeScriptAsync(scriptValues, parameters, context, subProcesses);
    const totalTime = times.reduce((p, c) => p + c.time, 0);
    console.log(`----------------total: ${prettyMs(totalTime)}----------------`);
    for (const { time, script } of times) {
        const pecent = Math.round(100.0 * time / totalTime);
        console.log(`${prettyMs(time)} ${pecent}% ${script}`);
    }
    console.log(`----------------total: ${prettyMs(totalTime)}----------------`);
}
executeCommandLine().then(() => {
    for (const subProcess of subProcesses) {
        subProcess.kill('SIGINT');
    }
    console.log('script success.');
    process.exit();
}, error => {
    if (error instanceof Error) {
        console.log(error.message);
    }
    else {
        console.log(error);
    }
    for (const subProcess of subProcesses) {
        subProcess.kill('SIGINT');
    }
    process.exit(1);
});
