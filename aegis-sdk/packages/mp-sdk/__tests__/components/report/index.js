// eslint-disable-next-line
const aegis = new Aegis({
  id: 'wVTkPDfJjHQuKTgkXQ',
  offlineLog: true,
});
// eslint-disable-next-line
Component({
  methods: {
    tapEvent(event) {
      const { method = '', params = [], config = {} } = event.detail || {};
      Object.keys(config).length && aegis.setConfig(config);
      Object.keys(config).forEach((key) => {
        aegis.extendBean(key, config[key]);
      });
      if (!method) return;
      aegis[method](params);
    },
  },
});
