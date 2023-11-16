/* eslint-disable no-undef */
const aegis = new Aegis({
  id: 666,
  method: 'get',
  reportApiSpeed: true,
  speedIgnore: ['ignore.aegis.com'],
});
// eslint-disable-next-line
Component({
  methods: {
    tapCgi(event) {
      const { url = '' } = event.detail || {};
      wx.request({ url });
    },
    tapEvent(event) {
      const { method = '', args = [] } = event.detail || {};
      method && aegis[method](...args);
    },
  },
});
