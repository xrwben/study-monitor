/* eslint-disable @typescript-eslint/no-require-imports */
const execa = require('execa');
// 获取环境变量
const { getArgs } = require('./utils');
const { package, traverse } = getArgs();

execa(
  'rollup',
  [
    '-wc',
    '--environment',
    ['NODE_ENV:development',  `TRAVERSE:${traverse || ''}`, `PACKAGE:${package || ''}`]
    .join(','),
  ],
  {
    stdio: 'inherit',
  },
);
