import * as minimist from "minimist";
import * as childProcess from "child_process";
import * as path from "path";
import * as prettyMs from "pretty-ms";
import * as packageJson from "../package.json";

const defaultConfigName = "clean-scripts.config.js";

function printInConsole(message: any) {
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

    const scripts: { [name: string]: Script | Script[] | Set<Script> | { [name: string]: Script } } = require(path.resolve(process.cwd(), argv.config || defaultConfigName));

    const scriptNames = argv._;
    for (const scriptName of scriptNames) {
        // tslint:disable-next-line:no-eval
        const scriptValues = scripts[scriptName] || eval("scripts." + scriptName);
        if (!scriptValues) {
            throw new Error(`Unknown script name: ${scriptName}`);
        }
        const times = await executeScript(scriptValues);
        const totalTime = times.reduce((p, c) => p + c.time, 0);
        printInConsole(`----------------total: ${prettyMs(totalTime)}----------------`);
        for (const { time, script } of times) {
            const pecent = Math.round(100.0 * time / totalTime);
            printInConsole(`${prettyMs(time)} ${pecent}% ${script}`);
        }
        printInConsole(`----------------total: ${prettyMs(totalTime)}----------------`);
    }
}

async function execAsync(script: string) {
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
    });
}

type Script = string | (() => Promise<void>) | any[] | Set<any> | { [name: string]: any };
type Time = { time: number, script: string };

async function executeScript(script: Script): Promise<Time[]> {
    if (typeof script === "string") {
        printInConsole(script);
        const time = await execAsync(script);
        return [{ time, script }];
    } else if (Array.isArray(script)) {
        const times: Time[] = [];
        for (const child of script) {
            const time = await executeScript(child);
            times.push(...time);
        }
        return times;
    } else if (script instanceof Set) {
        const promises: Promise<Time[]>[] = [];
        for (const child of script) {
            promises.push(executeScript(child));
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
    } else if (script instanceof Function) {
        const now = Date.now();
        await script();
        return [{ time: Date.now() - now, script: "Custom Promise" }];
    } else {
        const promises: Promise<Time[]>[] = [];
        for (const key in script) {
            if (script.hasOwnProperty(key)) {
                promises.push(executeScript(script[key]));
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

executeCommandLine().then(() => {
    printInConsole("script success.");
}, error => {
    printInConsole(error);
    process.exit(1);
});
