import { Plugin } from 'aegis-core';

// import { Dimensions } from 'react-native';

// const screenWidth = Dimensions.get('screen').width;
// const screenHeight = Dimensions.get('screen').height;


const plugin = new Plugin({
  name: 'device',

  onNewAegis() {
    // 分辨率
    // aegis.extendBean('sr', `${screenWidth} * ${screenHeight}`);
  },
});

export default plugin;
