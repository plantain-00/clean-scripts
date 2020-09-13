/**
 * @public
 */
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

import * as stream from 'stream'

/**
 * @public
 */
export function readableStreamEnd(readable: stream.Readable) {
  return new Promise<void>((resolve, reject) => {
    readable.on('end', () => {
      resolve()
    })
    readable.on('error', error => {
      reject(error)
    })
  })
}

/**
 * @public
 */
export class Service {
  constructor(public script: string, public options?: string | Options) { }
}

/**
 * @public
 */
export interface Options {
  processKey?: string
  /**
   * percent
   */
  maximumCpu?: number
  /**
   * bytes
   */
  maximumMemory?: number
}

/**
 * @public
 */
export class Program {
  constructor(public script: string, public timeout: number, public options?: string | Options) { }
}

/**
 * @public
 */
export class Tasks {
  constructor(public tasks: Task[], public maxWorkerCount = Infinity) { }
}

/**
 * @public
 */
export interface Task {
  name: string
  script: Script
  dependencies?: string[]
}

import * as childProcess from 'child_process'
import * as util from 'util'

/**
 * @public
 */
export const execAsync = util.promisify(childProcess.exec)

/**
 * @public
 */
export type Script = string | ((context: { [key: string]: any }, parameters: string[]) => Promise<void>) | any[] | Set<any> | Service | Program | Tasks | { [name: string]: any } | null | undefined

/**
 * @public
 */
export interface Time { time: number, script: string }

import pidusage from 'pidusage'

async function executeStringScriptAsync(
  script: string,
  context: { [key: string]: any },
  subProcesses: childProcess.ChildProcess[],
  options?: { timeout?: number } & Options & childProcess.ExecOptions
) {
  return new Promise<number>((resolve, reject) => {
    const now = Date.now()
    let timer: NodeJS.Timeout | undefined
    const cleanTimer = () => {
      if (timer) {
        clearInterval(timer)
      }
    }
    const subProcess = childProcess.exec(script, { encoding: 'utf8', ...options }, (error) => {
      cleanTimer()
      if (error) {
        reject(error)
      } else {
        resolve(Date.now() - now)
      }
    })
    if (subProcess.stdout) {
      subProcess.stdout.pipe(process.stdout)
    }
    if (subProcess.stderr) {
      subProcess.stderr.pipe(process.stderr)
    }
    subProcesses.push(subProcess)
    if (options) {
      if (options.processKey) {
        context[options.processKey] = subProcess
      }
      if (options.maximumCpu || options.maximumMemory) {
        timer = setInterval(() => {
          pidusage(subProcess.pid, (error, stats) => {
            if (error) {
              cleanTimer()
              reject(error)
            } else {
              if (options.maximumCpu) {
                if (stats.cpu > options.maximumCpu) {
                  cleanTimer()
                  reject(new Error(`cpu ${stats.cpu} should <= ${options.maximumCpu}`))
                }
              } else if (options.maximumMemory) {
                if (stats.memory > options.maximumMemory) {
                  cleanTimer()
                  reject(new Error(`memory ${stats.memory} should <= ${options.maximumMemory}`))
                }
              }
            }
          })
        }, 1000)
      }
      if (options.timeout) {
        setTimeout(() => {
          cleanTimer()
          subProcess.kill('SIGINT')
          resolve(Date.now() - now)
        }, options.timeout)
      }
    }
  })
}

function getOptions(options?: Options | string): Options | undefined {
  if (typeof options === 'string') {
    return {
      processKey: options
    }
  }
  if (options) {
    return options
  }
  return undefined
}

/**
 * @public
 */
export async function executeScriptAsync(
  script: Script,
  parameters: string[] = [],
  context: { [key: string]: any } = {},
  subProcesses: childProcess.ChildProcess[] = [],
  options?: childProcess.ExecOptions
): Promise<Time[]> {
  if (script === undefined || script === null) {
    return []
  } else if (typeof script === 'string') {
    console.log(script)
    const time = await executeStringScriptAsync(script, context, subProcesses, options)
    return [{ time, script }]
  } else if (Array.isArray(script)) {
    const times: Time[] = []
    for (const child of script) {
      const time = await executeScriptAsync(child, parameters, context, subProcesses, options)
      times.push(...time)
    }
    return times
  } else if (script instanceof Set) {
    const times = await Promise.all(Array.from(script).map((c) => executeScriptAsync(c, parameters, context, subProcesses, options)))
    let result: Time[] = []
    let maxTotalTime = 0
    for (const time of times) {
      const totalTime = time.reduce((p, c) => p + c.time, 0)
      if (totalTime > maxTotalTime) {
        result = time
        maxTotalTime = totalTime
      }
    }
    return result
  } else if (script instanceof Service) {
    console.log(script.script)
    const now = Date.now()
    // eslint-disable-next-line plantain/promise-not-await
    executeStringScriptAsync(script.script, context, subProcesses, {
      ...options,
      ...getOptions(script.options)
    })
    return [{ time: Date.now() - now, script: script.script }]
  } else if (script instanceof Program) {
    console.log(script.script)
    const time = await executeStringScriptAsync(script.script, context, subProcesses, {
      timeout: script.timeout,
      ...options,
      ...getOptions(script.options)
    })
    return [{ time, script: script.script }]
  } else if (script instanceof Function) {
    const now = Date.now()
    await script(context, parameters)
    return [{ time: Date.now() - now, script: script.name || 'custom function script' }]
  } else if (script instanceof Tasks) {
    let remainTasks = script.tasks
    let currentTasks: Task[] = []
    const execuateTasks = async (): Promise<Time[]> => {
      const tasks = getTasks(remainTasks, currentTasks, script.maxWorkerCount)
      currentTasks.push(...tasks.current)
      if (tasks.current.length > 0) {
        remainTasks = tasks.remain
        const times = await Promise.all(tasks.current.map(async (c) => {
          const time = await executeScriptAsync(c.script, parameters, context, subProcesses, options)
          currentTasks = currentTasks.filter((r) => r !== c)
          const newTimes = await execuateTasks()
          return [...time, ...newTimes]
        }))
        return getLongestTime(times)
      }
      return []
    }
    const times = await execuateTasks()
    if (remainTasks.length > 0) {
      throw new Error(`remain ${remainTasks.length} tasks: ${remainTasks.map((r) => r.name).join(', ')}`)
    }
    return times
  } else {
    const times = await Promise.all(Object.keys((script)).map((key) => executeScriptAsync(script[key], parameters, context, subProcesses, options)))
    return getLongestTime(times)
  }
}

function getLongestTime(times: Time[][]) {
  let result: Time[] = []
  let maxTotalTime = 0
  for (const time of times) {
    const totalTime = time.reduce((p, c) => p + c.time, 0)
    if (totalTime > maxTotalTime) {
      result = time
      maxTotalTime = totalTime
    }
  }
  return result
}

function getTasks(remainTasks: Task[], currentTasks: Task[], maxWorkerCount: number) {
  const current: Task[] = []
  const remain: Task[] = []
  for (const task of remainTasks) {
    if (current.length >= maxWorkerCount
      || (task.dependencies
        && task.dependencies.length > 0
        && task.dependencies.some(
          (d) => remainTasks.some((t) => t.name === d)
            || currentTasks.some((t) => t.name === d)))) {
      remain.push(task)
    } else {
      current.push(task)
    }
  }
  return { current, remain }
}

import * as fs from 'fs'

/**
 * @public
 */
export async function checkGitStatus() {
  const { stdout } = await execAsync('git status -s')
  if (stdout) {
    console.log(stdout)
    const files = stdout.split('\n').filter(s => s.length > 0).map(s => s.substring(3))
    for (const file of files) {
      if (fs.existsSync(file)) {
        console.log(`${file}:`)
        console.log(fs.readFileSync(file).toString())
      }
    }
    throw new Error(`generated files doesn't match.`)
  }
}

import prettyMs from 'pretty-ms'
import { table } from 'table'

export function logTimes(times: Time[]) {
  const totalTime = times.reduce((p, c) => p + c.time, 0)
  console.info(table(
    [
      ['script', 'time', ''],
      ...[{ time: totalTime, script: '' }, ...times].map(({ time, script }) => [
        script,
        prettyMs(time),
        Math.round(100.0 * time / totalTime) + '%',
      ])
    ],
    {
      columns: {
        0: {
          alignment: 'center',
          width: Math.max((process.stdout.columns || 0) - 19, 50),
          wrapWord: true
        },
        1: {
          alignment: 'center',
        },
        2: {
          alignment: 'center',
        }
      }
    },
  ))
}

import * as path from 'path'
import glob from 'glob'

interface PackageJson {
  name: string
  dependencies?: { [name: string]: string }
  workspaces: string[]
}

/**
 * @public
 */
export function readWorkspaceDependencies() {
  const rootPackageJson: PackageJson = JSON.parse((fs.readFileSync(path.resolve(process.cwd(), 'package.json'))).toString())
  const workspacesArray = rootPackageJson.workspaces.map((w) => glob.sync(w))
  const flattenedWorkspaces = new Set<string>()
  workspacesArray.forEach((workspace) => {
    workspace.forEach((w) => {
      flattenedWorkspaces.add(w)
    })
  })
  const flattenedWorkspacesArray = Array.from(flattenedWorkspaces)
  const packageJsons: PackageJson[] = []
  const packageNames = new Set<string>()
  for (const workspace of flattenedWorkspacesArray) {
    const packageJson: PackageJson = JSON.parse((fs.readFileSync(path.resolve(workspace, 'package.json'))).toString())
    packageJsons.push(packageJson)
    packageNames.add(packageJson.name)
  }

  return packageJsons.map((p, i) => {
    let dependencies: string[] | undefined
    if (p.dependencies) {
      const workpaceDependencies = Object.keys(p.dependencies).filter((d) => packageNames.has(d))
      if (workpaceDependencies.length > 0) {
        dependencies = workpaceDependencies
      }
    }
    return {
      name: p.name,
      path: flattenedWorkspacesArray[i],
      dependencies
    }
  })
}
