const { Service, checkGitStatus } = require('./dist/core')

const tsFiles = `"src/**/*.ts" "spec/**/*.ts"`
const jsFiles = `"*.config.js"`

module.exports = {
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
    `tsc -p spec`,
    `jasmine`,
    `tsc -p demo`,
    new Service('node demo/index.js'),
    'clean-release --config clean-run.config.js',
    () => checkGitStatus()
  ],
  fix: `eslint --ext .js,.ts ${tsFiles} ${jsFiles} --fix`
}
