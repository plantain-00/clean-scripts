# clean-scripts

[![Dependency Status](https://david-dm.org/plantain-00/clean-scripts.svg)](https://david-dm.org/plantain-00/clean-scripts)
[![devDependency Status](https://david-dm.org/plantain-00/clean-scripts/dev-status.svg)](https://david-dm.org/plantain-00/clean-scripts#info=devDependencies)
[![Build Status: Linux](https://travis-ci.org/plantain-00/clean-scripts.svg?branch=master)](https://travis-ci.org/plantain-00/clean-scripts)
[![Build Status: Windows](https://ci.appveyor.com/api/projects/status/github/plantain-00/clean-scripts?branch=master&svg=true)](https://ci.appveyor.com/project/plantain-00/clean-scripts/branch/master)
[![npm version](https://badge.fury.io/js/clean-scripts.svg)](https://badge.fury.io/js/clean-scripts)
[![Downloads](https://img.shields.io/npm/dm/clean-scripts.svg)](https://www.npmjs.com/package/clean-scripts)
[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Fplantain-00%2Fclean-scripts%2Fmaster%2Fpackage.json)](https://github.com/plantain-00/clean-scripts)

A CLI tool to make scripts in package.json clean.

## install

`yarn global add clean-scripts`

## usage

create config file(named `clean-scripts.config.js` or something else) like:

```js
module.exports = {
    build: "tsc",
    lint: "tslint index.ts"
}
```

run `clean-scripts build`, or `clean-scripts lint`

or `clean-scripts build --config clean-scripts.config.js`

## features

### string script

```js
module.exports = {
    build: "tsc"
}
```

### array script

+ executed one by one with order
+ used when later script depends on previous script's success

```js
module.exports = {
    build: [
        "rimraf dist",
        "tsc"
    ]
}
```

### `Set` or `Object` script

+ executed collaterally without order
+ used when the scripts are irrelated
+ they are all started at first time, when they are all done, it's a success, otherwise exit current process

```js
module.exports = {
    build: {
        js: `tsc`,
        css: `cleancss -o index.bundle.css index.css`
    }
}
```

### nested script

```js
module.exports = {
    build: [
        "rimraf dist",
        {
            js: `tsc`,
            css: [
                `lessc index.less > index.css`,
                `cleancss -o index.bundle.css index.css`
            ]
        }
    ]
}
```

### custom function script

the type of the function should be `(context: { [key: string]: any }, parameters: string[]) => Promise<void>`

```js
module.exports = {
    build: () => new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, 1000)
    }),
    test: async () => {
        // todo
    }
}
```

The `context` can be used to transfer data between different scripts.

```js
module.exports = {
    build: [
        context => {
            context.foo = 'abc'
            return Promise.resolve()
        },
        context => {
            console.log(context.foo) // 'abc'
            return Promise.resolve()
        }
    ]
}
```

The `parameters` can be passed from CLI parameters

```js
module.exports = {
    build: (context, parameters) => {
        console.log(parameters) // run `clean-scripts build foo bar`, got `["foo", "bar"]`
        return Promise.resolve()
    }
}
```

### child script

```js
module.exports = {
    build: [
        `rimraf dist/`,
        `tsc -p src/`
    ],
    lint: {
        ts: `tslint "src/**/*.ts"`,
        js: `standard "**/*.config.js"`
    }
}
```

+ run `clean-scripts build[0]` to run `rimraf dist/`
+ run `clean-scripts lint.ts` to run `tslint "src/**/*.ts"`

### start service

```js
const { Service } = require('clean-scripts')

module.exports = {
  build: [
    new Service('http-server -p 8000'),
    new Service('http-server', 'server2') // the child process can be accessed by `context.server2` later
  ]
}
```

All services will be killed(send `SIGINT` actually) after all scripts end, or any script errors.

### start program

```js
const { Program } = require('clean-scripts')

module.exports = {
  build: [
    new Program('http-server -p 8000', 10000) // the program will last at most 10 seconds, can be used to test the start process of a program
  ]
}
```

All programs will be killed(send `SIGINT` actually) after all scripts end, or any script errors.

### short-hand methods

```js
const { sleep, readableStreamEnd, execAsync, executeScriptAsync, checkGitStatus } = require('clean-scripts')

module.exports = {
  build: [
    () => sleep(5000), // sleep milliseconds
    async () => {
        const readable = getReadableStreamSomehow()
        readable.on('data', chunk => {
            console.log(`Received ${chunk.length} bytes of data.`)
        })
        await readableStreamEnd(readable) // wait readable stream ends
    },
    async () => {
        const { stdout } = await execAsync('git status -s') // promisified `childProcess.exec`
        if (stdout) {
            console.log(stdout)
            throw new Error(`generated files doesn't match.`)
        }
    },
    async () => {
        await executeScriptAsync([ // support string script, array script, child script, nested script and so on
            `rimraf dist/`,
            `tsc -p src/`
        ])
    },
    () => checkGitStatus() // check git status
  ]
}
```
