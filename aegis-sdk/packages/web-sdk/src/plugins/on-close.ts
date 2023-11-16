import Core, { Plugin } from 'aegis-core';
import { onHidden } from '../util';
import { device } from '../util/device-type';

import Aegis from '../aegis';

let plugin = new Plugin({ name: 'onClose' });

if (ON_CLOSE) {
  plugin = new Plugin({
    name: 'onClose',
    onNewAegis(aegis: Core) {
      if (device.desktop()) {
        const orgUnload = window.onunload;
        window.onunload = (...args: any) => {
          this.publishNotReportedLog(aegis);
          orgUnload?.call(window, ...args);
        };
      } else {
        onHidden(this.publishNotReportedLog.bind(this, aegis), true);
      }
    },
    publishNotReportedLog(instance: Core) {
      this.$walk((aegis: Aegis) => {
        if (aegis !== instance) return;
        aegis.sendNow = true;
        aegis.publishPluginsLogs();
        this.publishThrottlePipeLogs(aegis);
      });
    },
    publishThrottlePipeLogs(aegis: Aegis) {
      aegis?.speedLogPipeline([]);
      aegis?.eventPipeline([]);
      aegis?.customTimePipeline([]);
      aegis?.normalLogPipeline([]);
    },
  });
}

export default plugin;
