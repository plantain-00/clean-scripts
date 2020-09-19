"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readWorkspaceDependencies = exports.logTimes = exports.checkGitStatus = exports.executeScriptAsync = exports.execAsync = exports.Tasks = exports.Program = exports.Service = exports.readableStreamEnd = exports.sleep = void 0;
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
    constructor(script, options) {
        this.script = script;
        this.options = options;
    }
}
exports.Service = Service;
/**
 * @public
 */
class Program {
    constructor(script, timeout, options) {
        this.script = script;
        this.timeout = timeout;
        this.options = options;
    }
}
exports.Program = Program;
/**
 * @public
 */
class Tasks {
    constructor(tasks, maxWorkerCount = Infinity) {
        this.tasks = tasks;
        this.maxWorkerCount = maxWorkerCount;
    }
}
exports.Tasks = Tasks;
const childProcess = tslib_1.__importStar(require("child_process"));
const util = tslib_1.__importStar(require("util"));
/**
 * @public
 */
exports.execAsync = util.promisify(childProcess.exec);
const pidusage_1 = tslib_1.__importDefault(require("pidusage"));
async function executeStringScriptAsync(script, context, subProcesses, options) {
    return new Promise((resolve, reject) => {
        const now = Date.now();
        let timer;
        const cleanTimer = () => {
            if (timer) {
                clearInterval(timer);
            }
        };
        const subProcess = childProcess.exec(script, { encoding: 'utf8', ...options }, (error) => {
            cleanTimer();
            if (error) {
                reject(error);
            }
            else {
                resolve(Date.now() - now);
            }
        });
        if (subProcess.stdout) {
            subProcess.stdout.pipe(process.stdout);
        }
        if (subProcess.stderr) {
            subProcess.stderr.pipe(process.stderr);
        }
        subProcesses.push(subProcess);
        if (options) {
            if (options.processKey) {
                context[options.processKey] = subProcess;
            }
            if (options.maximumCpu || options.maximumMemory) {
                timer = setInterval(() => {
                    pidusage_1.default(subProcess.pid, (error, stats) => {
                        if (error) {
                            cleanTimer();
                            reject(error);
                        }
                        else {
                            if (options.maximumCpu) {
                                if (stats.cpu > options.maximumCpu) {
                                    cleanTimer();
                                    reject(new Error(`cpu ${stats.cpu} should <= ${options.maximumCpu}`));
                                }
                            }
                            else if (options.maximumMemory) {
                                if (stats.memory > options.maximumMemory) {
                                    cleanTimer();
                                    reject(new Error(`memory ${stats.memory} should <= ${options.maximumMemory}`));
                                }
                            }
                        }
                    });
                }, 1000);
            }
            if (options.timeout) {
                setTimeout(() => {
                    cleanTimer();
                    subProcess.kill('SIGINT');
                    resolve(Date.now() - now);
                }, options.timeout);
            }
        }
    });
}
function getOptions(options) {
    if (typeof options === 'string') {
        return {
            processKey: options
        };
    }
    if (options) {
        return options;
    }
    return undefined;
}
/**
 * @public
 */
async function executeScriptAsync(script, parameters = [], context = {}, subProcesses = [], options) {
    if (script === undefined || script === null) {
        return [];
    }
    else if (typeof script === 'string') {
        console.log(script);
        const time = await executeStringScriptAsync(script, context, subProcesses, options);
        return [{ time, script }];
    }
    else if (Array.isArray(script)) {
        const times = [];
        for (const child of script) {
            const time = await executeScriptAsync(child, parameters, context, subProcesses, options);
            times.push(...time);
        }
        return times;
    }
    else if (script instanceof Set) {
        const times = await Promise.all(Array.from(script).map((c) => executeScriptAsync(c, parameters, context, subProcesses, options)));
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
        // eslint-disable-next-line plantain/promise-not-await
        executeStringScriptAsync(script.script, context, subProcesses, {
            ...options,
            ...getOptions(script.options)
        });
        return [{ time: Date.now() - now, script: script.script }];
    }
    else if (script instanceof Program) {
        console.log(script.script);
        const time = await executeStringScriptAsync(script.script, context, subProcesses, {
            timeout: script.timeout,
            ...options,
            ...getOptions(script.options)
        });
        return [{ time, script: script.script }];
    }
    else if (script instanceof Function) {
        const now = Date.now();
        await script(context, parameters);
        return [{ time: Date.now() - now, script: script.name || 'custom function script' }];
    }
    else if (script instanceof Tasks) {
        let remainTasks = script.tasks;
        let currentTasks = [];
        const execuateTasks = async () => {
            const tasks = getTasks(remainTasks, currentTasks, script.maxWorkerCount);
            currentTasks.push(...tasks.current);
            if (tasks.current.length > 0) {
                remainTasks = tasks.remain;
                const times = await Promise.all(tasks.current.map(async (c) => {
                    const time = await executeScriptAsync(c.script, parameters, context, subProcesses, options);
                    currentTasks = currentTasks.filter((r) => r !== c);
                    const newTimes = await execuateTasks();
                    return [...time, ...newTimes];
                }));
                return getLongestTime(times);
            }
            return [];
        };
        const times = await execuateTasks();
        if (remainTasks.length > 0) {
            throw new Error(`remain ${remainTasks.length} tasks: ${remainTasks.map((r) => r.name).join(', ')}`);
        }
        return times;
    }
    else {
        const times = await Promise.all(Object.keys((script)).map((key) => executeScriptAsync(script[key], parameters, context, subProcesses, options)));
        return getLongestTime(times);
    }
}
exports.executeScriptAsync = executeScriptAsync;
function getLongestTime(times) {
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
function getTasks(remainTasks, currentTasks, maxWorkerCount) {
    const current = [];
    const remain = [];
    for (const task of remainTasks) {
        if (current.length >= maxWorkerCount
            || (task.dependencies
                && task.dependencies.length > 0
                && task.dependencies.some((d) => remainTasks.some((t) => t.name === d)
                    || currentTasks.some((t) => t.name === d)))) {
            remain.push(task);
        }
        else {
            current.push(task);
        }
    }
    return { current, remain };
}
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
const pretty_ms_1 = tslib_1.__importDefault(require("pretty-ms"));
const table_1 = require("table");
function logTimes(times) {
    const totalTime = times.reduce((p, c) => p + c.time, 0);
    const maxScriptLength = Math.max(...times.map((c) => c.script.length), 10);
    let width;
    if (process.stdout.columns) {
        width = Math.min(process.stdout.columns - 30, maxScriptLength);
    }
    else {
        width = Math.min(100, maxScriptLength);
    }
    width = Math.max(width, 20);
    console.info(table_1.table([
        ['script', 'time', ''],
        ...[{ time: totalTime, script: '' }, ...times].map(({ time, script }) => [
            script,
            pretty_ms_1.default(time),
            Math.round(100.0 * time / totalTime) + '%',
        ])
    ], {
        columns: {
            0: {
                alignment: 'center',
                width,
                wrapWord: true
            },
            1: {
                alignment: 'center',
            },
            2: {
                alignment: 'center',
            }
        }
    }));
}
exports.logTimes = logTimes;
const path = tslib_1.__importStar(require("path"));
const glob_1 = tslib_1.__importDefault(require("glob"));
/**
 * @public
 */
function readWorkspaceDependencies() {
    const rootPackageJson = JSON.parse((fs.readFileSync(path.resolve(process.cwd(), 'package.json'))).toString());
    const workspacesArray = rootPackageJson.workspaces.map((w) => glob_1.default.sync(w));
    const flattenedWorkspaces = new Set();
    workspacesArray.forEach((workspace) => {
        workspace.forEach((w) => {
            flattenedWorkspaces.add(w);
        });
    });
    const flattenedWorkspacesArray = Array.from(flattenedWorkspaces);
    const packageJsons = [];
    const packageNames = new Set();
    for (const workspace of flattenedWorkspacesArray) {
        const packageJson = JSON.parse((fs.readFileSync(path.resolve(workspace, 'package.json'))).toString());
        packageJsons.push(packageJson);
        packageNames.add(packageJson.name);
    }
    return packageJsons.map((p, i) => {
        let dependencies;
        if (p.dependencies) {
            const workpaceDependencies = Object.keys(p.dependencies).filter((d) => packageNames.has(d));
            if (workpaceDependencies.length > 0) {
                dependencies = workpaceDependencies;
            }
        }
        return {
            name: p.name,
            path: flattenedWorkspacesArray[i],
            dependencies
        };
    });
}
exports.readWorkspaceDependencies = readWorkspaceDependencies;
