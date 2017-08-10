import * as minimist from "minimist";
import * as childProcess from "child_process";
import * as path from "path";
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
        await executeScript(scriptValues);
    }
}

async function execAsync(script: string) {
    return new Promise<void>((resolve, reject) => {
        const subProcess = childProcess.exec(script, { encoding: "utf8" }, (error, stdout, stderr) => {
            if (error) {
                (error as any).stdout = stdout;
                reject(error);
            } else {
                resolve();
            }
        });
        subProcess.stdout.on("data", chunk => {
            printInConsole(chunk);
        });
    });
}

type Script = string | Promise<string> | any[] | Set<any> | { [name: string]: any };

async function executeScript(script: Script) {
    if (typeof script === "string") {
        printInConsole(script);
        await execAsync(script);
    } else if (Array.isArray(script)) {
        for (const child of script) {
            await executeScript(child);
        }
    } else if (script instanceof Set) {
        const promises: Promise<void>[] = [];
        for (const child of script) {
            promises.push(executeScript(child));
        }
        await Promise.all(promises);
    } else if (script instanceof Promise) {
        const stdout = await script;
        printInConsole(stdout);
    } else {
        const promises: Promise<void>[] = [];
        // tslint:disable-next-line:forin
        for (const key in script) {
            promises.push(executeScript(script[key]));
        }
        await Promise.all(promises);
    }
}

try {
    executeCommandLine().then(() => {
        printInConsole("success.");
    }, error => {
        if (error.stdout) {
            printInConsole(error.stdout);
            process.exit(error.status);
        } else {
            printInConsole(error);
            process.exit(1);
        }
    });
} catch (error) {
    if (error.stdout) {
        printInConsole(error.stdout);
        process.exit(error.status);
    } else {
        printInConsole(error);
        process.exit(1);
    }
}
