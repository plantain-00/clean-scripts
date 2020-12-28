import { Service, checkGitStatus, Script } from './dist/core'

const tsFiles = `"src/**/*.ts"`

const config: { [name: string]: Script } = {
  build: [
    `rimraf dist/`,
    `tsc -p src/`
  ],
  lint: {
    ts: `eslint --ext .js,.ts ${tsFiles}`,
    export: `no-unused-export ${tsFiles}`,
    markdown: `markdownlint README.md`,
    typeCoverage: 'type-coverage -p src --strict'
  },
  test: [
    new Service('ts-node demo/index.ts'),
    'clean-release --config clean-run.config.ts',
    () => checkGitStatus()
  ],
  fix: `eslint --ext .js,.ts ${tsFiles} --fix`
}

export default config
