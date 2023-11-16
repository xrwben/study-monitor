// Lowercase, so we can use the more efficient indexOf(), instead of Regex
const userAgent = window.navigator.userAgent.toLowerCase();
export const device: {
  [key: string]: Function;
} = {};
// Check if element exists
const includes = (haystack: any, needle: any) => haystack.indexOf(needle) !== -1;
// Simple UA string search
const find = (needle: any) => includes(userAgent, needle);
device.macos = function () {
  return find('mac');
};

device.ios = function () {
  return device.iphone() || device.ipod() || device.ipad();
};

device.iphone = function () {
  return !device.windows() && find('iphone');
};

device.ipod = function () {
  return find('ipod');
};

device.ipad = function () {
  const iPadOS13Up = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return find('ipad') || iPadOS13Up;
};

device.android = function () {
  return !device.windows() && find('android');
};

device.androidPhone = function () {
  return device.android() && find('mobile');
};

device.androidTablet = function () {
  return device.android() && !find('mobile');
};

device.blackberry = function () {
  return find('blackberry') || find('bb10');
};

device.blackberryPhone = function () {
  return device.blackberry() && !find('tablet');
};

device.blackberryTablet = function () {
  return device.blackberry() && find('tablet');
};

device.windows = function () {
  return find('windows');
};

device.windowsPhone = function () {
  return device.windows() && find('phone');
};

device.windowsTablet = function () {
  return device.windows() && (find('touch') && !device.windowsPhone());
};

device.fxos = function () {
  return (find('(mobile') || find('(tablet')) && find(' rv:');
};

device.fxosPhone = function () {
  return device.fxos() && find('mobile');
};

device.fxosTablet = function () {
  return device.fxos() && find('tablet');
};

device.meego = function () {
  return find('meego');
};

device.cordova = function () {
  return (window as any).cordova && location.protocol === 'file:';
};

device.nodeWebkit = function () {
  return typeof window.process === 'object';
};

device.mobile = function () {
  return (
    device.androidPhone()
    || device.iphone()
    || device.ipod()
    || device.windowsPhone()
    || device.blackberryPhone()
    || device.fxosPhone()
    || device.meego()
  );
};

device.tablet = function () {
  return (
    device.ipad()
    || device.androidTablet()
    || device.blackberryTablet()
    || device.windowsTablet()
    || device.fxosTablet()
  );
};

device.desktop = function () {
  return !device.tablet() && !device.mobile();
};

device.isIE = function () {
  return 'ActiveXObject' in window;
};

