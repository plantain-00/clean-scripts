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
  constructor(public script: string, public processKey?: string) { }
}

/**
 * @public
 */
export class Program {
  constructor(public script: string, public timeout: number, public processKey?: string) { }
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
export type Time = { time: number, script: string }

async function executeStringScriptAsync(script: string, context: { [key: string]: any }, subProcesses: childProcess.ChildProcess[], processKey?: string, timeout?: number) {
  return new Promise<number>((resolve, reject) => {
    const now = Date.now()
    const subProcess = childProcess.exec(script, { encoding: 'utf8' }, (error, stdout, stderr) => {
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
    if (processKey) {
      context[processKey] = subProcess
    }
    subProcesses.push(subProcess)

    if (timeout) {
      setTimeout(() => {
        resolve(Date.now() - now)
      }, timeout)
    }
  })
}

/**
 * @public
 */
// tslint:disable-next-line:cognitive-complexity
export async function executeScriptAsync(script: Script, parameters: string[] = [], context: { [key: string]: any } = {}, subProcesses: childProcess.ChildProcess[] = []): Promise<Time[]> {
  if (script === undefined || script === null) {
    return []
  } else if (typeof script === 'string') {
    console.log(script)
    const time = await executeStringScriptAsync(script, context, subProcesses)
    return [{ time, script }]
  } else if (Array.isArray(script)) {
    const times: Time[] = []
    for (const child of script) {
      const time = await executeScriptAsync(child, parameters, context, subProcesses)
      times.push(...time)
    }
    return times
  } else if (script instanceof Set) {
    const promises: Promise<Time[]>[] = []
    for (const child of script) {
      promises.push(executeScriptAsync(child, parameters, context, subProcesses))
    }
    const times = await Promise.all(promises)
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
    executeStringScriptAsync(script.script, context, subProcesses, script.processKey)
    return [{ time: Date.now() - now, script: script.script }]
  } else if (script instanceof Program) {
    console.log(script.script)
    const time = await executeStringScriptAsync(script.script, context, subProcesses, script.processKey, script.timeout)
    return [{ time, script: script.script }]
  } else if (script instanceof Function) {
    const now = Date.now()
    await script(context, parameters)
    return [{ time: Date.now() - now, script: script.name || 'custom function script' }]
  } else if (script instanceof Tasks) {
    let remainTasks = script.tasks
    let currentTasks: Task[] = []
    const execuateTasks = async(): Promise<Time[]> => {
      let tasks = getTasks(remainTasks, currentTasks, script.maxWorkerCount)
      currentTasks.push(...tasks.current)
      if (tasks.current.length > 0) {
        remainTasks = tasks.remain
        const times = await Promise.all(tasks.current.map(async(c) => {
          const time = await executeScriptAsync(c.script, parameters, context, subProcesses)
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
    const promises: Promise<Time[]>[] = []
    for (const key in script) {
      if (script.hasOwnProperty(key)) {
        promises.push(executeScriptAsync(script[key], parameters, context, subProcesses))
      }
    }
    const times = await Promise.all(promises)
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
