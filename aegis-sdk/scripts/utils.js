/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const execa = require('execa');
const moment = require('moment')
const cpus = require('os').cpus().length || 4;
const maxParallel = Math.min(cpus, 16);

exports.allTargets = fs.readdirSync('packages').filter((f) => {
  if (!fs.statSync(`packages/${f}`).isDirectory()) {
    return false;
  }
  if (f === 'core') return;
  const pkg = require(`../packages/${f}/package.json`);
  if (pkg.private && !pkg.buildOptions) {
    return false;
  }
  return true;
});

// name：插件名，index：读取的配置位数
const plugins = [
  { name: 'SPA', index: 0 },
  { name: 'SHADOW_LOG', index: 1 },
  { name: 'PAGE_PERFORMANCE', index: 2 },
  { name: 'ON_ERROR', index: 3 },
  { name: 'OFFLINE_LOG', index: 4 },
  { name: 'CGI_SPEED', index: 5 },
  { name: 'ASSET_SPEED', index: 6 },
  { name: 'WEB_VITALS', index: 7 },
  { name: 'ON_CLOSE', index: 8 },
  // { name: 'PERFORMANCE_MONITOR', index: 8 },
  // { name: 'TJG', index: 7 },
];
// 获取所有插件的组合
exports.getAllPluginPossibleConfig = () => {
  const configList = [];
  // 所有组合的总数
  const totalNum = parseInt(
    Array(plugins.length).fill(1)
      .join(''),
    2,
  );

  for (let i = 0; i <= totalNum; i++) {
    // 转二进制
    const binary = Number.parseInt(i, 10).toString(2)
    const len = binary.length - 1;
    const config = {};
    plugins.forEach((plugin) => {
      config[plugin.name] = binary[len - plugin.index] === '1';
    });
    configList.push({
      name: i,
      config,
    });
  }

  return configList;
};

exports.allPluginPossibleConfig = exports.getAllPluginPossibleConfig()
// 获取将所有插件打包进去的配置
exports.getPluginAllInConfig = () => {
  const config = {};
  plugins.forEach((item) => {
    config[item.name] = true;
  });
  return config;
}


exports.buildAll = (packages) => {
  return runParallel(binRun, packages);
}

exports.buildPossible = (targets, traverse, package) => {
  return runPossibleParallel(targets, binRun, traverse, package);
}

async function runParallel(iteratorFn, packages) {
  console.log('当前cpu核数：', cpus, '最大并行数：', maxParallel);
  if (packages.length > maxParallel) {
    await Promise.all(packages.splice(0, maxParallel).map(package => iteratorFn('', '', package)));
    return runParallel(iteratorFn, packages);
  }
  return Promise.all(packages.map(package => iteratorFn('', '', package)));
}

async function runPossibleParallel(sources, iteratorFn, traverse, package) {
  console.log('当前cpu核数：', cpus, '最大并行数：', maxParallel);
  if (sources.length > maxParallel) {
    await Promise.all(sources.splice(0, maxParallel).map(item => iteratorFn(item, traverse, package)));
    return runPossibleParallel(sources, iteratorFn, traverse, package);
  }
  return Promise.all(sources.map(item => iteratorFn(item, traverse, package)));
}

function binRun(target, traverse = '', package = '') {
  // console.log(`${package}.${target.name} build start time: `, moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'))
  var start = Date.now()
  try {
    return execa(
      'rollup',
      [
        '-c',
        '--environment',
        ['NODE_ENV:production', `TRAVERSE:${traverse}`, `PACKAGE:${package}`, `TARGET:${target && target.name}`]
          .filter(Boolean)
          .join(','),
      ],
      { stdio: 'inherit' },
    ).then(() => {
      // console.log(`${package}.${target.name} build end time: `, moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'), `总耗时： ${((Date.now() - start) / 1000).toFixed(2)}s`)
    });

  } catch (e) {
    process.exit(1);
  }
}

exports.getArgs = () => {
  // 获取环境变量
  let argv = [...process.argv];
  try {
    argv = [...argv, ...JSON.parse(process.env.npm_config_argv).original];
  } catch (ex) {
  }
  const args = require('minimist')(argv.slice(2));
  return args;
}
