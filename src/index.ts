import minimist from 'minimist'
import * as childProcess from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { Script, executeScriptAsync, logTimes } from './core'
import * as packageJson from '../package.json'

function showToolVersion() {
  console.log(`Version: ${packageJson.version}`)
}

function statAsync(file: string) {
  return new Promise<fs.Stats | undefined>((resolve) => {
    fs.stat(file, (error, stats) => {
      if (error) {
        resolve(undefined)
      } else {
        resolve(stats)
      }
    })
  })
}

const subProcesses: childProcess.ChildProcess[] = []
const context: { [key: string]: any } = {}

async function executeCommandLine() {
  const argv = minimist(process.argv.slice(2), { '--': true })

  const showVersion = argv.v || argv.version
  if (showVersion) {
    showToolVersion()
    return
  }

  let configFilePath: string
  if (argv.config) {
    configFilePath = path.resolve(process.cwd(), argv.config)
  } else {
    configFilePath = path.resolve(process.cwd(), 'clean-scripts.config.ts')
    const stats = await statAsync(configFilePath)
    if (!stats || !stats.isFile()) {
      configFilePath = path.resolve(process.cwd(), 'clean-scripts.config.js')
    }
  }
  if (configFilePath.endsWith('.ts')) {
    require('ts-node/register/transpile-only')
  }
  let scripts: { [name: string]: Script } = require(configFilePath)
  if (scripts.default) {
    scripts = scripts.default as { [name: string]: Script }
  }

  const scriptNames = argv._
  if (!scriptNames || scriptNames.length === 0) {
    throw new Error(`Need a script`)
  }
  const scriptName = scriptNames[0]
  const parameters = scriptNames.slice(1)
  const scriptValues = scripts[scriptName] || eval('scripts.' + scriptName)
  if (!scriptValues) {
    throw new Error(`Unknown script name: ${scriptName}`)
  }
  const times = await executeScriptAsync(scriptValues, parameters, context, subProcesses)
  logTimes(times)
}

function cleanup() {
  if (process.platform === 'darwin' || process.platform === 'linux') {
    const stdout = childProcess.execSync('ps -l').toString()
    const ps = stdout.split('\n')
      .map(s => s.split(' ').filter(s => s))
      .filter((s, i) => i > 0 && s.length >= 2)
      .map(s => ({ pid: +s[1], ppid: +s[2] }))
    const result: number[] = []
    collectPids(process.pid, ps, result)
    for (const pid of result) {
      childProcess.execSync(`kill -9 ${pid}`)
    }
  }
  for (const subProcess of subProcesses) {
    if (!subProcess.killed) {
      subProcess.kill('SIGINT')
    }
  }
}

function handleError(error: unknown) {
  if (error instanceof Error) {
    console.log(error.message)
  } else {
    console.log(error)
  }
  cleanup()
  process.exit(1)
}

executeCommandLine().then(() => {
  cleanup()
  console.log('script success.')
  process.exit()
}, error => {
  handleError(error)
})

process.on('unhandledRejection', (error) => {
  handleError(error)
})

interface Ps {
  pid: number
  ppid: number
}

function collectPids(pid: number, ps: Ps[], result: number[]) {
  const children = ps.filter(p => p.ppid === pid)
  for (const child of children) {
    result.push(child.pid)
    collectPids(child.pid, ps, result)
  }
}
