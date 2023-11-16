/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable prefer-destructuring */
/* eslint-disable prefer-rest-params */
/* eslint-disable no-useless-escape */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/prefer-for-of */
/* eslint-disable @typescript-eslint/prefer-optional-chain */

import fs from 'fs';
import path from 'path';
import typescript from 'rollup-plugin-typescript2';
import replace from 'rollup-plugin-replace';
import json from 'rollup-plugin-json';
import { uglify } from 'rollup-plugin-uglify';
import { terser } from 'rollup-plugin-terser';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import ttypescript from 'ttypescript';

const { allPluginPossibleConfig, getPluginAllInConfig } = require('./scripts/utils');
const request = require('sync-request')

const PACKAGE = process.env.PACKAGE; // 打包哪一个pakcage
const TRAVERSE = process.env.TARGET; // 是否需要遍历所有插件可能的组合
const TARGET = process.env.TARGET;

const packagesDir = path.resolve(__dirname, 'packages');
const packageConfigs = [];

// 异步插件latest地址集合
const asyncPluginMap = {
  flog: 'https://cdn-go.cn/vasdev/web_webpersistance_v2/latest/flog.core.min.js',
};
// 异步插件版本集合
const asyncVersionMap = {
  flog: 'latest', // 默认为最新，如果第三方插件没有在第一行提供自己版本，就使用latest，不过此处需要要求第三方插件提供
};

// 获取异步插件版本
const getAsyncLastVersion = function (url, program) {
  const res = request('GET', url);
  const data = res.body.toString('utf-8');
  const reg = /(?<=__VERSION__:\s)(v[\d\.]+)/g;
  const matchVersion = data.match(reg);
  if (matchVersion && matchVersion.length) {
    asyncVersionMap[program] = matchVersion[0];
  }
};
getAsyncLastVersion(asyncPluginMap.flog, 'flog');

const createConfig = function (input, output, version, plugins = [], replaceObj = {}) {
  const tsPlugin = typescript({
    tsconfig: 'tsconfig.json',
    typescript: ttypescript,
  });
  output.sourcemap = process.env.NODE_ENV !== 'production';

  if (TRAVERSE) {
    // 需要遍历所有插件的组合
    const possible = allPluginPossibleConfig.find(e => e.name == TARGET)

    packageConfigs.push({
      input,
      external: ['axios', 'url', 'querystring'],
      plugins: [
        json({
          namedExports: false,
        }),
        tsPlugin,
        replace({
          values: {
            VERSION: JSON.stringify(version),
            // 特别注意： 此处需要双引号，像"v2.3.3"，不能是'v2.3.3'！！
            FLOG_VERSION: JSON.stringify(asyncVersionMap.flog),
            ...possible.config,
            IS_IE: false,
            FINGER_ID: false,
            ...replaceObj,
          },
          exclude: [/node_modules/]
        }),
        resolve(),
        ...plugins,
      ],
      output: {
        ...output,
        file: output.file.replace('.js', `.${possible.name}.js`),
      },
      onwarn: (msg, warn) => {
        // 循环引用很正常，不要出来烦人
        if ((/Circular dependency/).test(msg)) return;
        warn(msg);
      },
    });
  } else {
    packageConfigs.push({
      input,
      external: ['axios', 'url', 'querystring'],
      plugins: [
        json({
          namedExports: false,
        }),
        tsPlugin,
        replace({
          values: {
            IS_IE: false,
            FINGER_ID: false,
            VERSION: JSON.stringify(version),
            // 特别注意： 此处需要"v2.3.3"，不能是'v2.3.3'！！ 
            FLOG_VERSION: JSON.stringify(asyncVersionMap.flog),
            ...getPluginAllInConfig(),
            ...replaceObj,
          },
          exclude: [/node_modules/]
        }),
        resolve(),
        ...plugins,
      ],
      output,
      onwarn: (msg, warn) => {
        // 循环引用很正常，不要出来烦人
        if ((/Circular dependency/).test(msg)) return;
        warn(msg);
      },
    });
  }
};

const genComment = function (name, version) {
  return comment(
    `${name}@${version} (c) ${new Date().getFullYear()} TencentCloud Real User Monitoring.`,
    'Author pumpkincai.',
    `Last Release Time ${new Date()}.`,
    'Released under the MIT License.',
    'Thanks for supporting RUM & Aegis!',
  );
};

const comment = function () {
  if (arguments.length === 0) {
    return;
  }
  let maxLength = 0;
  for (let i = 0; i < arguments.length; i++) {
    const length = arguments[i].toString().length;
    maxLength = length > maxLength ? length : maxLength;
  }
  maxLength = maxLength === 0 ? maxLength : maxLength + 1;
  let separator = '';
  for (let i = 0; i < maxLength; i++) {
    separator += '=';
  }
  const c = [];
  c.push('/**\n');
  c.push(` *  ${separator}\n`);
  for (let i = 0; i < arguments.length; i++) {
    c.push(` * ${arguments[i]}\n`);
  }
  c.push(` * ${separator}\n`);
  c.push(' **/');
  return c.join('');
};

fs.readdirSync(packagesDir).forEach((dir) => {
  // 非文件夹
  if (!fs.statSync(path.resolve(packagesDir, dir)).isDirectory()) return;
  if (dir === 'core') return;

  // 根据环境变量PACKAGE单纯打包其中某几个包
  // npm run build --package=web-sdk
  if (
    PACKAGE
    && PACKAGE.indexOf(dir) === -1
  ) {
    return;
  }

  const packageDir = path.resolve(packagesDir, dir);
  const pkg = require(path.resolve(packageDir, './package.json'));
  // const format = pkg.buildOptions.format;
  const name = pkg.buildOptions.name;
  const version = pkg.version;
  const input = path.resolve(packageDir, './src/index.ts');

  // core 和 node 不使用 uglify
  const needUglify =
    process.env.NODE_ENV === 'production' && pkg.name !== '@tencent/aegis-node-sdk';
  // dev
  if (process.env.NODE_ENV !== 'production') {
    createConfig(
      input,
      {
        file: path.resolve(
          packageDir,
          `./lib/${name.toLowerCase()}.min.js`,
        ),
        ...pkg.buildOptions,
      },
      version,
      [],
      {SDK_NAME: JSON.stringify(dir)}
    );
  }

  // build
  if (process.env.NODE_ENV === 'production') {
      createConfig(
        input,
        {
          file: path.resolve(
            packageDir,
            `./lib/${name.toLowerCase()}.min.js`,
          ),
          ...pkg.buildOptions,
        },
        version,
        [
          terser(),
          needUglify
          && uglify({
            output: {
              preamble: genComment(pkg.name, pkg.version),
            },
          }),
          
        ],
        {SDK_NAME: JSON.stringify(dir)}
      );

    if (dir === 'web-sdk' && !TRAVERSE) {
      // 打多一个iife版本
      createConfig(
        input,
        {
          file: path.resolve(
            packageDir,
            `./lib/${name.toLowerCase()}.global.min.js`,
          ),
          ...pkg.buildOptions,
          format: 'iife',
        },
        version,
        [
          terser(),
          needUglify
          && uglify({
            output: {
              preamble: genComment(pkg.name, pkg.version),
            },
          }),
        ],
        {SDK_NAME: JSON.stringify(dir)}
      );
      if (TRAVERSE) return
      // 打多一个兼容ie的版本
      createConfig(
        input,
        {
          file: path.resolve(
            packageDir,
            `./lib/${name.toLowerCase()}.ie.min.js`,
          ),
          ...pkg.buildOptions,
        },
        version,
        [
          commonjs(),
          babel({
            exclude: [/node_modules/],
            babelHelpers: 'bundled',
            extensions: ['.ts'],
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: { ie: '8' },
                  useBuiltIns: 'usage',
                  corejs: '3.6.4',
                },
              ],
            ],
          }),
          terser({
            ie8: true,
          }),
          needUglify
          && uglify({
            output: {
              preamble: genComment(pkg.name, pkg.version),
            },
            ie8: true,
          }),
        ],
        {
          IS_IE: true,
          SDK_NAME: JSON.stringify(dir)
        },
      );
      // 打多一个指纹aid的版本
      createConfig(
        input,
        {
          file: path.resolve(
            packageDir,
            `./lib/${name.toLowerCase()}.f.min.js`,
          ),
          ...pkg.buildOptions,
        },
        version,
        [
          terser(),
          needUglify
          && uglify({
            output: {
              preamble: genComment(pkg.name, pkg.version),
            },
          }),
        ],
        {
          FINGER_ID: true,
          SDK_NAME: JSON.stringify(dir)
        },
      );
    }
  }
});

export default packageConfigs;
