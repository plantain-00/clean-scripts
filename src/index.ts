import minimist from 'minimist'
import * as childProcess from 'child_process'
import * as path from 'path'
import prettyMs from 'pretty-ms'
import { Script, executeScriptAsync } from './core'
import * as packageJson from '../package.json'

const defaultConfigName = 'clean-scripts.config.js'

function showToolVersion() {
  console.log(`Version: ${packageJson.version}`)
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

  const configFilePath = path.resolve(process.cwd(), argv.config || defaultConfigName)
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
  const totalTime = times.reduce((p, c) => p + c.time, 0)
  console.log(`----------------total: ${prettyMs(totalTime)}----------------`)
  for (const { time, script } of times) {
    const pecent = Math.round(100.0 * time / totalTime)
    console.log(`${prettyMs(time)} ${pecent}% ${script}`)
  }
  console.log(`----------------total: ${prettyMs(totalTime)}----------------`)
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
