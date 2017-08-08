[![Dependency Status](https://david-dm.org/plantain-00/clean-scripts.svg)](https://david-dm.org/plantain-00/clean-scripts)
[![devDependency Status](https://david-dm.org/plantain-00/clean-scripts/dev-status.svg)](https://david-dm.org/plantain-00/clean-scripts#info=devDependencies)
[![Build Status: Linux](https://travis-ci.org/plantain-00/clean-scripts.svg?branch=master)](https://travis-ci.org/plantain-00/clean-scripts)
[![Build Status: Windows](https://ci.appveyor.com/api/projects/status/github/plantain-00/clean-scripts?branch=master&svg=true)](https://ci.appveyor.com/project/plantain-00/clean-scripts/branch/master)
[![npm version](https://badge.fury.io/js/clean-scripts.svg)](https://badge.fury.io/js/clean-scripts)
[![Downloads](https://img.shields.io/npm/dm/clean-scripts.svg)](https://www.npmjs.com/package/clean-scripts)

# clean-scripts
A CLI tool to make scripts in package.json clean.

#### install

`npm i clean-scripts -g`

#### usage

create config file(named `clean-scripts.config.js` or something else) like:

```js
module.exports = {
    build: "tsc",
    lint: "tslint index.ts"
}
```

run `clean-scripts build`, or `clean-scripts lint`

or `clean-scripts build --config clean-scripts.config.js`

#### features

##### string script

```js
module.exports = {
    build: "tsc"
}
```

##### array script

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

##### `Set` or `Object` script

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

##### nested script

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

##### `Promise` script

```js
module.exports = {
    build: new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('abc')
      }, 1000)
    })
}
```

##### child script

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
