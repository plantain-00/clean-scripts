"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const minimist_1 = (0, tslib_1.__importDefault)(require("minimist"));
const childProcess = (0, tslib_1.__importStar)(require("child_process"));
const path = (0, tslib_1.__importStar)(require("path"));
const fs = (0, tslib_1.__importStar)(require("fs"));
const core_1 = require("./core");
const packageJson = (0, tslib_1.__importStar)(require("../package.json"));
function showToolVersion() {
    console.log(`Version: ${packageJson.version}`);
}
function showHelp() {
    console.log(`Version ${packageJson.version}
Syntax:   clean-scripts [script name] [options]
Examples: clean-scripts build
          clean-scripts build --config clean-scripts.config.js
          clean-scripts build --config clean-scripts.config.ts
Options:
 -h, --help                                         Print this message.
 -v, --version                                      Print the version
 --config                                           Config file
`);
}
function statAsync(file) {
    return new Promise((resolve) => {
        fs.stat(file, (error, stats) => {
            if (error) {
                resolve(undefined);
            }
            else {
                resolve(stats);
            }
        });
    });
}
const subProcesses = [];
const context = {};
async function executeCommandLine() {
    const argv = (0, minimist_1.default)(process.argv.slice(2), { '--': true });
    const showVersion = argv.v || argv.version;
    if (showVersion) {
        showToolVersion();
        return;
    }
    if (argv.h || argv.help) {
        showHelp();
        return;
    }
    let configFilePath;
    if (argv.config) {
        configFilePath = path.resolve(process.cwd(), argv.config);
    }
    else {
        configFilePath = path.resolve(process.cwd(), 'clean-scripts.config.ts');
        const stats = await statAsync(configFilePath);
        if (!stats || !stats.isFile()) {
            configFilePath = path.resolve(process.cwd(), 'clean-scripts.config.js');
        }
    }
    if (configFilePath.endsWith('.ts')) {
        require('ts-node/register/transpile-only');
    }
    let scripts = require(configFilePath);
    if (scripts.default) {
        scripts = scripts.default;
    }
    const scriptNames = argv._;
    if (!scriptNames || scriptNames.length === 0) {
        throw new Error(`Need a script`);
    }
    const scriptName = scriptNames[0];
    const parameters = scriptNames.slice(1);
    const scriptValues = scripts[scriptName] || eval('scripts.' + scriptName);
    if (!scriptValues) {
        throw new Error(`Unknown script name: ${scriptName}`);
    }
    const times = await (0, core_1.executeScriptAsync)(scriptValues, parameters, context, subProcesses);
    (0, core_1.logTimes)(times);
}
function cleanup() {
    if (process.platform === 'darwin' || process.platform === 'linux') {
        const stdout = childProcess.execSync('ps -l').toString();
        const ps = stdout.split('\n')
            .map(s => s.split(' ').filter(s => s))
            .filter((s, i) => i > 0 && s.length >= 2)
            .map(s => ({ pid: +s[1], ppid: +s[2] }));
        const result = [];
        collectPids(process.pid, ps, result);
        for (const pid of result) {
            try {
                childProcess.execSync(`kill -9 ${pid}`);
            }
            catch {
                // do nothing
            }
        }
    }
    for (const subProcess of subProcesses) {
        if (!subProcess.killed) {
            subProcess.kill('SIGINT');
        }
    }
}
function handleError(error) {
    if (error instanceof Error) {
        console.log(error.message);
    }
    else {
        console.log(error);
    }
    cleanup();
    process.exit(1);
}
executeCommandLine().then(() => {
    cleanup();
    console.log('script success.');
    process.exit();
}, (error) => {
    handleError(error);
});
process.on('unhandledRejection', (error) => {
    handleError(error);
});
function collectPids(pid, ps, result) {
    const children = ps.filter(p => p.ppid === pid);
    for (const child of children) {
        result.push(child.pid);
        collectPids(child.pid, ps, result);
    }
}
