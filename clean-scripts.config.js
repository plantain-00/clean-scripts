const childProcess = require('child_process')
const { sleep } = require('./dist/core.js')
const util = require('util')

const execAsync = util.promisify(childProcess.exec)

module.exports = {
  build: [
    () => sleep(1000),
    `rimraf dist/`,
    `tsc -p src/`
  ],
  lint: {
    ts: `tslint "src/**/*.ts"`,
    js: `standard "**/*.config.js"`,
    export: `no-unused-export "src/**/*.ts"`
  },
  test: [
    `tsc -p spec`,
    `jasmine`,
    async () => {
      const { stdout } = await execAsync('git status -s')
      if (stdout) {
        console.log(stdout)
        throw new Error(`generated files doesn't match.`)
      }
    }
  ],
  fix: {
    ts: `tslint --fix "src/**/*.ts"`,
    js: `standard --fix "**/*.config.js"`
  },
  release: `clean-release`
}
