/* eslint-disable @typescript-eslint/no-require-imports */
// 上传到cdn的时候，不允许存在空文件，ts打包时会自动生成类似下面的空文件
// /root/aegis/aegis-sdk/packages/web-sdk/lib/packages/web-sdk/src/util/polyfill.d.ts

const fs = require('fs')
const args = require('minimist')(process.argv.slice(2));
const glob = require('glob');

const readDirSync = function (filePath, fileType = '') {
  try {
    const pa = glob.sync(filePath);
    pa.forEach((cpath, index) => {
      if (fileType && typeof fileType === 'string' && cpath.indexOf(fileType) === -1) return;
      const info = fs.statSync(cpath);
      if (info.isFile() && info.size === 0) {
        fs.unlinkSync(cpath);
        console.log('移除空文件: ', cpath);
      } 
    });
  } catch (e) {
    console.log('清理文件失败', e);
  }
};

const rmEmptyFile = function (dir, fileType = '') {
  readDirSync(dir, fileType); // 以当前js文件所在目录进行遍历
};

if (args.dir) {
  rmEmptyFile(args.dir, args.fileType);
}

module.exports = rmEmptyFile;
