import { Service, checkGitStatus, Script } from './dist/core'

const tsFiles = `"src/**/*.ts"`
const jsFiles = `"*.config.js"`

export default {
  build: [
    `rimraf dist/`,
    `tsc -p src/`
  ],
  lint: {
    ts: `eslint --ext .js,.ts ${tsFiles} ${jsFiles}`,
    export: `no-unused-export ${tsFiles}`,
    commit: `commitlint --from=HEAD~1`,
    markdown: `markdownlint README.md`,
    typeCoverage: 'type-coverage -p src --strict'
  },
  test: [
    new Service('ts-node demo/index.ts'),
    'clean-release --config clean-run.config.ts',
    () => checkGitStatus()
  ],
  fix: `eslint --ext .js,.ts ${tsFiles} ${jsFiles} --fix`
} as { [name: string]: Script }
