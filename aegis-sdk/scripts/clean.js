/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs-extra');
const path = require('path');

const { allTargets } = require('./utils');

const packagesDir = path.resolve(__dirname, '../packages');

const run = async function () {
  allTargets.forEach((target) => {
    fs.remove(path.resolve(packagesDir, `${target}/lib`));
  });
};

run();
