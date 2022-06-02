/// <reference types="node" />
/// <reference types="node" />
/**
 * @public
 */
export declare function sleep(ms: number): Promise<unknown>;
import * as stream from 'stream';
/**
 * @public
 */
export declare function readableStreamEnd(readable: stream.Readable): Promise<void>;
/**
 * @public
 */
export declare class Service {
    script: string;
    options?: string | Options | undefined;
    constructor(script: string, options?: string | Options | undefined);
}
/**
 * @public
 */
export interface Options {
    processKey?: string;
    /**
     * percent
     */
    maximumCpu?: number;
    /**
     * bytes
     */
    maximumMemory?: number;
}
/**
 * @public
 */
export declare class Program {
    script: string;
    timeout: number;
    options?: string | Options | undefined;
    constructor(script: string, timeout: number, options?: string | Options | undefined);
}
/**
 * @public
 */
export declare class Tasks {
    tasks: Task[];
    maxWorkerCount: number;
    constructor(tasks: Task[], maxWorkerCount?: number);
}
/**
 * @public
 */
export interface Task {
    name: string;
    script: Script;
    dependencies?: string[];
}
import * as childProcess from 'child_process';
/**
 * @public
 */
export declare const execAsync: typeof childProcess.exec.__promisify__;
/**
 * @public
 */
export declare type FunctionScriptReturnType = void | {
    name?: string;
    times?: Time[];
    script?: Script;
};
/**
 * @public
 */
export declare type Script = string | ((context: {
    [key: string]: any;
}, parameters: string[]) => Promise<FunctionScriptReturnType>) | any[] | Set<any> | Service | Program | Tasks | {
    [name: string]: any;
} | null | undefined | void;
/**
 * @public
 */
export interface Time {
    time: number;
    script: string;
}
/**
 * @public
 */
export declare function executeScriptAsync(script: Script, parameters?: string[], context?: {
    [key: string]: any;
}, subProcesses?: childProcess.ChildProcess[], options?: childProcess.ExecOptions): Promise<Time[]>;
/**
 * @public
 */
export declare function checkGitStatus(): Promise<void>;
export declare function logTimes(times: Time[]): void;
/**
 * @public
 */
export declare function readWorkspaceDependencies(): import("package-dependency-collect").Workspace<import("package-dependency-collect").PackageJson>[];
