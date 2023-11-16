import fs from 'fs';
import path from 'path';

// eslint-disable-next-line no-multi-assign
const offlinePath = (wx as any).env = ((wx as any).env || {}).USER_DATA_PATH = path.resolve(__dirname, '..', '.offlineLog');
if (!fs.existsSync(offlinePath)) {
  fs.mkdirSync(offlinePath);
}

if ((global as any).wx) {
  (global as any).wx.getFileSystemManager = function () {
    return {
      readFile(data: any) {
        fs.readFile(data.filePath, { encoding: data.encoding || 'utf8' }, (err: Error, data: any) => {
          if (err) {
            data.fail?.(err.toString());
            return;
          }
          data.success?.({ data });
          data.complete?.(err || { data });
        });
      },
      writeFile(data: any) {
        fs.writeFile(data.path, data.data, { encoding: data.encoding || 'utf8' }, (err: Error) => {
          if (err) {
            data.fail?.(err.toString());
            return;
          }
          data.success?.({ data });
          data.complete?.(err || { data });
        });
      },
      appendFile(data: any) {
        fs.appendFile(data.path, data.data, { encoding: data.encoding || 'utf8' }, (err: Error) => {
          if (err) {
            data.fail?.(err.toString());
            return;
          }
          data.success?.({ data });
          data.complete?.(err || { data });
        });
      },
      access(data: any) {
        fs.access(data.path, (err: Error) => {
          if (err) {
            data.fail?.(err.toString());
            return;
          }
          data.success?.();
          data.complete?.(err);
        });
      },
      unlinkSync(path: string) {
        fs.unlinkSync(path);
      },
    };
  };
}
