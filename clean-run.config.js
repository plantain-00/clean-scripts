module.exports = {
  include: [
    'bin/*',
    'dist/*.js',
    'package.json',
    'yarn.lock'
  ],
  exclude: [
  ],
  postScript: [
    'cd "[dir]" && yarn --production && yarn add ts-node -D',
    'node [dir]/dist/index.js build --config clean-scripts.config.ts'
  ]
}
