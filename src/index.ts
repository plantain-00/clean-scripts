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

    const scripts: { [name: string]: string[] } = require(path.resolve(process.cwd(), argv.config || defaultConfigName));

    const scriptNames = argv._;
    for (const scriptName of scriptNames) {
        const scriptValues = scripts[scriptName];
        if (!scriptValues) {
            throw new Error(`Unknown script name: ${scriptName}`);
        }
        for (const script of scriptValues) {
            printInConsole(script);
            const stdout = childProcess.execSync(script, { encoding: "utf8" });
            printInConsole(stdout);
        }
    }
}

try {
    executeCommandLine().then(() => {
        printInConsole("success.");
    }, error => {
        printInConsole(error.stdout);
        process.exit(error.status);
    });
} catch (error) {
    printInConsole(error.stdout);
    process.exit(error.status);
}
