/// <reference types="node" />
/**
 * @public
 */
export declare function sleep(ms: number): Promise<{}>;
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
    processKey?: string | undefined;
    constructor(script: string, processKey?: string | undefined);
}
/**
 * @public
 */
export declare class Program {
    script: string;
    timeout: number;
    processKey?: string | undefined;
    constructor(script: string, timeout: number, processKey?: string | undefined);
}
/**
 * @public
 */
export declare class Tasks {
    tasks: Task[];
    constructor(tasks: Task[]);
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
export declare type Script = string | ((context: {
    [key: string]: any;
}, parameters: string[]) => Promise<void>) | any[] | Set<any> | Service | Program | Tasks | {
    [name: string]: any;
} | null | undefined;
/**
 * @public
 */
export declare type Time = {
    time: number;
    script: string;
};
/**
 * @public
 */
export declare function executeScriptAsync(script: Script, parameters?: string[], context?: {
    [key: string]: any;
}, subProcesses?: childProcess.ChildProcess[]): Promise<Time[]>;
/**
 * @public
 */
export declare function checkGitStatus(): Promise<void>;
