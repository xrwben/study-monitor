/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-restricted-syntax */
const moment = require('moment')
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
// const execa = require('execa');
// const { exec } = require('child_process');
const { gzipSync } = require('zlib');
const { compress } = require('brotli');
const { allTargets, buildAll, buildPossible, allPluginPossibleConfig, getArgs } = require('./utils');
const packagesDir = path.resolve(__dirname, '../packages');
const TRAVERSE = getArgs().traverse; // 是否需要遍历所有插件可能的组合
const package = getArgs().package;

const build = async function () {
  // 清空lib
  allTargets.forEach((target) => {
    fs.remove(path.resolve(packagesDir, `${target}/lib`));
  });
  if (TRAVERSE) {
    return buildPossible(allPluginPossibleConfig, true, package);
  } else {
    const packages = fs.readdirSync(packagesDir).filter(dir => fs.statSync(path.resolve(packagesDir, dir)).isDirectory() && dir !== 'core');
    if (package && packages.indexOf(package) !== -1) {
      return buildAll([package])
    }
    return buildAll(packages);
  }
};

const checkSize = function (target) {
  const pkgDir = path.resolve(`packages/${target}`);
  const pkg = require(path.resolve(pkgDir, 'package.json'));
  const main = pkg.main.indexOf('.js') === -1 ? pkg.main + '.js' :  pkg.main;
  const esmProdBuild = path.resolve(pkgDir, main);
  if (fs.existsSync(esmProdBuild)) {
    const file = fs.readFileSync(esmProdBuild);
    const minSize = `${(file.length / 1024).toFixed(2)}kb`;
    const gzipped = gzipSync(file);
    const gzippedSize = `${(gzipped.length / 1024).toFixed(2)}kb`;
    const compressed = compress(file);
    const compressedSize = `${(compressed.length / 1024).toFixed(2)}kb`;
    console.log(`${chalk.gray(chalk.bold(target))} min:${minSize} / gzip:${gzippedSize} / brotli:${compressedSize}`);
  }
};

const checkAllSizes = function () {
  for (const target of allTargets) {
    checkSize(target);
  }
};

const run = async function () {
  console.log('构建开始时间: ', moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'));
  await build();
  console.log('构建结束时间: ', moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'));
  // 压缩离线包
  // exec('cd ./packages/web-sdk/lib && zip -r -m -o offline.zip ./cdn-go.cn');
  checkAllSizes();
};

run();
