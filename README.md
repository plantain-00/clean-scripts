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

run `clean-scripts script-name`

or run `clean-scripts script-name --config clean-scripts.config.js`

#### features

+ `script array`: executed with order
+ `script Set or Object`: executed without order
+ `script array` and `script Set or Object` can be nested
