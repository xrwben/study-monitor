/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable no-mixed-operators */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable prefer-destructuring */

import { hashTo32 } from './crypto';

const getBasicFingerprint = function () {
  // screenSize
  const getScreenSize = function () {
    const { width, height } = window.screen;
    return `${width}*${height}`;
  };

  //  colorDepth
  const getColorDepth = function () {
    const { colorDepth } = window.screen;
    return `${colorDepth}`;
  };

  // userAgent
  const getUserAgent = function () {
    const { navigator: { userAgent, platform } } = window; // // const plugin =  ??
    return `${userAgent}*${platform}`;
  };

  // timeZone
  const getTimezone = function () {
    const DateTimeFormat = window.Intl?.DateTimeFormat;
    const timeZone = DateTimeFormat ? new DateTimeFormat()?.resolvedOptions()?.timeZone : '';
    const timeZoneOffset = new Date().getTimezoneOffset();
    return `${timeZone} + ${timeZoneOffset}`;
  };

  // math
  const getMath = function (): string {
    const M = Math;
    const fallbackFn = () => 0;

    try {
      const acos = M.acos || fallbackFn;
      const acosh = M.acosh || fallbackFn;
      const asin = M.asin || fallbackFn;
      const asinh = M.asinh || fallbackFn;
      const atanh = M.atanh || fallbackFn;
      const atan = M.atan || fallbackFn;
      const sin = M.sin || fallbackFn;
      const sinh = M.sinh || fallbackFn;
      const cos = M.cos || fallbackFn;
      const cosh = M.cosh || fallbackFn;
      const tan = M.tan || fallbackFn;
      const tanh = M.tanh || fallbackFn;
      const exp = M.exp || fallbackFn;
      const expm1 = M.expm1 || fallbackFn;
      const log1p = M.log1p || fallbackFn;

      const powPI = (value: number) => M.pow(M.PI, value);
      const acoshPf = (value: number) => M.log(value + M.sqrt(value * value - 1));
      const asinhPf = (value: number) => M.log(value + M.sqrt(value * value + 1));
      const atanhPf = (value: number) => M.log((1 + value) / (1 - value)) / 2;
      const sinhPf = (value: number) => M.exp(value) - 1 / M.exp(value) / 2;
      const coshPf = (value: number) => (M.exp(value) + 1 / M.exp(value)) / 2;
      const expm1Pf = (value: number) => M.exp(value) - 1;
      const tanhPf = (value: number) => (M.exp(2 * value) - 1) / (M.exp(2 * value) + 1);
      const log1pPf = (value: number) => M.log(1 + value);

      const resultObj = {
        acos: acos(0.123124234234234242),
        acosh: acosh(1e308),
        acoshPf: acoshPf(1e154),
        asin: asin(0.123124234234234242),
        asinh: asinh(1),
        asinhPf: asinhPf(1),
        atanh: atanh(0.5),
        atanhPf: atanhPf(0.5),
        atan: atan(0.5),
        sin: sin(-1e300),
        sinh: sinh(1),
        sinhPf: sinhPf(1),
        cos: cos(10.000000000123),
        cosh: cosh(1),
        coshPf: coshPf(1),
        tan: tan(-1e300),
        tanh: tanh(1),
        tanhPf: tanhPf(1),
        exp: exp(1),
        expm1: expm1(1),
        expm1Pf: expm1Pf(1),
        log1p: log1p(10),
        log1pPf: log1pPf(10),
        powPI: powPI(-100),
      };

      return Object.values(resultObj).join('*');
    } catch {
      return '';
    }
  };


  // 特征整合
  const uaFingerStr = getUserAgent();
  const screenSizeFingerStr = getScreenSize();
  const colorDepthStr = getColorDepth();
  const timezoneFingerStr = getTimezone();
  const mathFingerStr = getMath();


  const sofawareHashStr = uaFingerStr
    + screenSizeFingerStr
    + colorDepthStr
    + timezoneFingerStr
    + mathFingerStr;

  return sofawareHashStr;
};

const getComplicateFingerprint = function () {
  /**
   * canvas指纹
   * @description 基于canvas生成特定图像，转base64字符串输出
   * @perf 兼容性：好 运行耗时：10ms 代码量：低  信息熵预测：高
   * @ref EEF
   * @returns base64格式字符串（"data:iamge/jpeg;base64..."）
   */
  const getCanvasHash = function () {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }
    ctx.font = '14px \'Arial\'';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('aegis,sdk <canvas> 1.0', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('aegis,sdk <canvas> 1.0', 4, 17);

    const rawAid = canvas.toDataURL('image/jpeg');
    return rawAid;
  };

  /**
   * font指纹
   * @description 对比检测本地字体库覆盖率，字体库共532种
   * @perf 兼容性：好 运行耗时：200ms 代码量：大(字体列表体积8k)  信息熵预测：中
   * @ref https://gist.github.com/szepeviktor/d28dfcfc889fe61763f3
   * @returns 0/1组成的字符串（0/1表示无/有当前字体）
   */
  const getFontHash = function () {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const fontList = ['default', 'sans-serif', 'serif', 'monospace', 'Apple LiSung', 'Apple SD Gothic Neo', 'Apple Symbols', 'Baoli SC, Baoli TC', 'Baskerville', 'Beirut', 'GungSeo', 'Gurmukhi MN', 'Gurmukhi MT', 'Hannotate SC, Hannotate TC', 'HanziPen SC, HanziPen TC', 'HeadlineA', 'Hei', 'LiSong Pro', 'Libian SC, Libian TC', 'LingWai SC, LingWai TC', 'Lucida Grande', 'Luminari', 'Nanum Brush Script', 'Nanum Gothic, NanumGothic', 'Nanum Myeongjo, NanumMyeongjo', 'Nanum Pen Script', 'NanumGothic ExtraBold, NanumGothicExtraBold', 'New Peninim MT', 'Noto Serif Kannada', 'Noto Serif Myanmar', 'Optima', 'PilGi', 'Plantagenet Cherokee', 'Raanana', 'STFangSong, STFangsong', 'STHeiti', 'STIXGeneral, STIXGeneral-Regular', 'Tsukushi B Round Gothic, Tsukushi B Round Gothic Regular', 'Tsukushi B Round Gothic Bold', 'Verdana', 'Waseem', 'Xingkai SC, Xingkai TC', 'YuGothic, YuGothic Medium', 'YuGothic Bold', 'Yuanti SC, Yuanti TC', 'Yuppy SC, Yuppy TC', 'Zapf Dingbats', 'Andale Mono', 'Arial', 'Arial Black', 'Arial Hebrew', 'Arial MT', 'Arial Narrow', 'Arial Rounded MT Bold', 'Arial Unicode MS', 'Bitstream Vera Sans Mono', 'Book Antiqua', 'Bookman Old Style', 'Calibri', 'Cambria', 'Cambria Math', 'Century', 'Century Gothic', 'Century Schoolbook', 'Comic Sans', 'Comic Sans MS', 'Consolas', 'Courier', 'Courier New', 'Geneva', 'Georgia', 'Helvetica', 'Helvetica Neue', 'Impact', 'Lucida Bright', 'Lucida Calligraphy', 'Lucida Console', 'Lucida Fax', 'LUCIDA GRANDE', 'Lucida Handwriting', 'Lucida Sans', 'Lucida Sans Typewriter', 'Lucida Sans Unicode', 'Microsoft Sans Serif', 'Monaco', 'Monotype Corsiva', 'MS Gothic', 'MS Outlook', 'MS PGothic', 'MS Reference Sans Serif', 'MS Sans Serif', 'MS Serif', 'MYRIAD', 'MYRIAD PRO', 'Palatino', 'Palatino Linotype', 'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Light', 'Segoe UI Semibold', 'Segoe UI Symbol', 'Tahoma', 'Times', 'Times New Roman', 'Times New Roman PS', 'Trebuchet MS', 'Verdana', 'Wingdings', 'Wingdings 2', 'Wingdings 3', 'Abadi MT Condensed Light', 'Academy Engraved LET', 'ADOBE CASLON PRO', 'Adobe Garamond', 'ADOBE GARAMOND PRO', 'Agency FB', 'Aharoni', 'Albertus Extra Bold', 'Albertus Medium', 'Algerian', 'Amazone BT', 'American Typewriter', 'American Typewriter Condensed', 'AmerType Md BT', 'Andalus', 'Angsana New', 'AngsanaUPC', 'Antique Olive', 'Aparajita', 'Apple Chancery', 'Apple Color Emoji', 'Apple SD Gothic Neo', 'Arabic Typesetting', 'ARCHER', 'ARNO PRO', 'Arrus BT', 'Aurora Cn BT', 'AvantGarde Bk BT', 'AvantGarde Md BT', 'AVENIR', 'Ayuthaya', 'Bandy', 'Bangla Sangam MN', 'Bank Gothic', 'BankGothic Md BT', 'Baskerville', 'Baskerville Old Face', 'Batang', 'BatangChe', 'Bauer Bodoni', 'Bauhaus 93', 'Bazooka', 'Bell MT', 'Bembo', 'Benguiat Bk BT', 'Berlin Sans FB', 'Berlin Sans FB Demi', 'Bernard MT Condensed', 'BernhardFashion BT', 'BernhardMod BT', 'Big Caslon', 'BinnerD', 'Blackadder ITC', 'BlairMdITC TT', 'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni 72 Smallcaps', 'Bodoni MT', 'Bodoni MT Black', 'Bodoni MT Condensed', 'Bodoni MT Poster Compressed', 'Bookshelf Symbol 7', 'Boulder', 'Bradley Hand', 'Bradley Hand ITC', 'Bremen Bd BT', 'Britannic Bold', 'Broadway', 'Browallia New', 'BrowalliaUPC', 'Brush Script MT', 'Californian FB', 'Calisto MT', 'Calligrapher', 'Candara', 'CaslonOpnface BT', 'Castellar', 'Centaur', 'Cezanne', 'CG Omega', 'CG Times', 'Chalkboard', 'Chalkboard SE', 'Chalkduster', 'Charlesworth', 'Charter Bd BT', 'Charter BT', 'Chaucer', 'ChelthmITC Bk BT', 'Chiller', 'Clarendon', 'Clarendon Condensed', 'CloisterBlack BT', 'Cochin', 'Colonna MT', 'Constantia', 'Cooper Black', 'Copperplate', 'Copperplate Gothic', 'Copperplate Gothic Bold', 'Copperplate Gothic Light', 'CopperplGoth Bd BT', 'Corbel', 'Cordia New', 'CordiaUPC', 'Cornerstone', 'Coronet', 'Cuckoo', 'Curlz MT', 'DaunPenh', 'Dauphin', 'David', 'DB LCD Temp', 'DELICIOUS', 'Denmark', 'DFKai-SB', 'Didot', 'DilleniaUPC', 'DIN', 'DokChampa', 'Dotum', 'DotumChe', 'Ebrima', 'Edwardian Script ITC', 'Elephant', 'English 111 Vivace BT', 'Engravers MT', 'EngraversGothic BT', 'Eras Bold ITC', 'Eras Demi ITC', 'Eras Light ITC', 'Eras Medium ITC', 'EucrosiaUPC', 'Euphemia', 'Euphemia UCAS', 'EUROSTILE', 'Exotc350 Bd BT', 'FangSong', 'Felix Titling', 'Fixedsys', 'FONTIN', 'Footlight MT Light', 'Forte', 'FrankRuehl', 'Fransiscan', 'Freefrm721 Blk BT', 'FreesiaUPC', 'Freestyle Script', 'French Script MT', 'FrnkGothITC Bk BT', 'Fruitger', 'FRUTIGER', 'Futura', 'Futura Bk BT', 'Futura Lt BT', 'Futura Md BT', 'Futura ZBlk BT', 'FuturaBlack BT', 'Gabriola', 'Galliard BT', 'Gautami', 'Geeza Pro', 'Geometr231 BT', 'Geometr231 Hv BT', 'Geometr231 Lt BT', 'GeoSlab 703 Lt BT', 'GeoSlab 703 XBd BT', 'Gigi', 'Gill Sans', 'Gill Sans MT', 'Gill Sans MT Condensed', 'Gill Sans MT Ext Condensed Bold', 'Gill Sans Ultra Bold', 'Gill Sans Ultra Bold Condensed', 'Gisha', 'Gloucester MT Extra Condensed', 'GOTHAM', 'GOTHAM BOLD', 'Goudy Old Style', 'Goudy Stout', 'GoudyHandtooled BT', 'GoudyOLSt BT', 'Gujarati Sangam MN', 'Gulim', 'GulimChe', 'Gungsuh', 'GungsuhChe', 'Gurmukhi MN', 'Haettenschweiler', 'Harlow Solid Italic', 'Harrington', 'Heather', 'Heiti SC', 'Heiti TC', 'HELV', 'Herald', 'High Tower Text', 'Hiragino Kaku Gothic ProN', 'Hiragino Mincho ProN', 'Hoefler Text', 'Humanst 521 Cn BT', 'Humanst521 BT', 'Humanst521 Lt BT', 'Imprint MT Shadow', 'Incised901 Bd BT', 'Incised901 BT', 'Incised901 Lt BT', 'INCONSOLATA', 'Informal Roman', 'Informal011 BT', 'INTERSTATE', 'IrisUPC', 'Iskoola Pota', 'JasmineUPC', 'Jazz LET', 'Jenson', 'Jester', 'Jokerman', 'Juice ITC', 'Kabel Bk BT', 'Kabel Ult BT', 'Kailasa', 'KaiTi', 'Kalinga', 'Kannada Sangam MN', 'Kartika', 'Kaufmann Bd BT', 'Kaufmann BT', 'Khmer UI', 'KodchiangUPC', 'Kokila', 'Korinna BT', 'Kristen ITC', 'Krungthep', 'Kunstler Script', 'Lao UI', 'Latha', 'Leelawadee', 'Letter Gothic', 'Levenim MT', 'LilyUPC', 'Lithograph', 'Lithograph Light', 'Long Island', 'Lydian BT', 'Magneto', 'Maiandra GD', 'Malayalam Sangam MN', 'Malgun Gothic', 'Mangal', 'Marigold', 'Marion', 'Marker Felt', 'Market', 'Marlett', 'Matisse ITC', 'Matura MT Script Capitals', 'Meiryo', 'Meiryo UI', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Tai Le', 'Microsoft Uighur', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU', 'MingLiU_HKSCS', 'MingLiU_HKSCS-ExtB', 'MingLiU-ExtB', 'Minion', 'Minion Pro', 'Miriam', 'Miriam Fixed', 'Mistral', 'Modern', 'Modern No. 20', 'Mona Lisa Solid ITC TT', 'Mongolian Baiti', 'MONO', 'MoolBoran', 'Mrs Eaves', 'MS LineDraw', 'MS Mincho', 'MS PMincho', 'MS Reference Specialty', 'MS UI Gothic', 'MT Extra', 'MUSEO', 'MV Boli', 'Nadeem', 'Narkisim', 'NEVIS', 'News Gothic', 'News GothicMT', 'NewsGoth BT', 'Niagara Engraved', 'Niagara Solid', 'Noteworthy', 'NSimSun', 'Nyala', 'OCR A Extended', 'Old Century', 'Old English Text MT', 'Onyx', 'Onyx BT', 'OPTIMA', 'Oriya Sangam MN', 'OSAKA', 'OzHandicraft BT', 'Palace Script MT', 'Papyrus', 'Parchment', 'Party LET', 'Pegasus', 'Perpetua', 'Perpetua Titling MT', 'PetitaBold', 'Pickwick', 'Plantagenet Cherokee', 'Playbill', 'PMingLiU', 'PMingLiU-ExtB', 'Poor Richard', 'Poster', 'PosterBodoni BT', 'PRINCETOWN LET', 'Pristina', 'PTBarnum BT', 'Pythagoras', 'Raavi', 'Rage Italic', 'Ravie', 'Ribbon131 Bd BT', 'Rockwell', 'Rockwell Condensed', 'Rockwell Extra Bold', 'Rod', 'Roman', 'Sakkal Majalla', 'Santa Fe LET', 'Savoye LET', 'Sceptre', 'Script', 'Script MT Bold', 'SCRIPTINA', 'Serifa', 'Serifa BT', 'Serifa Th BT', 'ShelleyVolante BT', 'Sherwood', 'Shonar Bangla', 'Showcard Gothic', 'Shruti', 'Signboard', 'SILKSCREEN', 'SimHei', 'Simplified Arabic', 'Simplified Arabic Fixed', 'SimSun', 'SimSun-ExtB', 'Sinhala Sangam MN', 'Sketch Rockwell', 'Skia', 'Small Fonts', 'Snap ITC', 'Snell Roundhand', 'Socket', 'Souvenir Lt BT', 'Staccato222 BT', 'Steamer', 'Stencil', 'Storybook', 'Styllo', 'Subway', 'Swis721 BlkEx BT', 'Swiss911 XCm BT', 'Sylfaen', 'Synchro LET', 'System', 'Tamil Sangam MN', 'Technical', 'Teletype', 'Telugu Sangam MN', 'Tempus Sans ITC', 'Terminal', 'Thonburi', 'Traditional Arabic', 'Trajan', 'TRAJAN PRO', 'Tristan', 'Tubular', 'Tunga', 'Tw Cen MT', 'Tw Cen MT Condensed', 'Tw Cen MT Condensed Extra Bold', 'TypoUpright BT', 'Unicorn', 'Univers', 'Univers CE 55 Medium', 'Univers Condensed', 'Utsaah', 'Vagabond', 'Vani', 'Vijaya', 'Viner Hand ITC', 'VisualUI', 'Vivaldi', 'Vladimir Script', 'Vrinda', 'Westminster', 'WHITNEY', 'Wide Latin', 'ZapfEllipt BT', 'ZapfHumnst BT', 'ZapfHumnst Dm BT', 'Zapfino', 'Zurich BlkEx BT', 'Zurich Ex BT', 'ZWAdobeF'];
    const getDetector = function () {
      const testString = 'mmmmmmmmmmlli';
      const testSize = '72px';
      const h = document.getElementsByTagName('body')[0];
      const s = document.createElement('span');
      s.style.fontSize = testSize;
      s.innerHTML = testString;
      const defaultWidth: any = {};
      const defaultHeight: any = {};
      for (const index in baseFonts) {
        s.style.fontFamily = baseFonts[index];
        h.appendChild(s);
        defaultWidth[baseFonts[index]] = s.offsetWidth;
        defaultHeight[baseFonts[index]] = s.offsetHeight;
        h.removeChild(s);
      }

      const detect = function (font: string) {
        let detected = false;
        for (const index in baseFonts) {
          s.style.fontFamily = `${font},${baseFonts[index]}`;
          h.appendChild(s);
          const matched = (
            s.offsetWidth !== defaultWidth[baseFonts[index]]
          || s.offsetHeight !== defaultHeight[baseFonts[index]]
          );
          h.removeChild(s);
          detected = detected || matched;
        }
        return detected;
      };

      return {
        detect,
      };
    };

    // 生成font fingerId
    const getFontsFinger = function () {
      const fontDetective = getDetector();
      const fontArray = fontList || [];
      let fontString = '';

      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < fontArray.length; i++) {
        const hasFont = fontDetective.detect(fontArray[i]) || false;
        fontString += hasFont ? '1' : '0';
      }
      return fontString;
    };

    return getFontsFinger();
  };

  /**
   * webgl指纹
   * @description 基于webgl渲染特定图像，转化定长字符串输出
   * @perf 兼容性：好 运行耗时：35ms 代码量：低 信息熵预测：高
   * @ref https://codepen.io/jon/pen/LLPKbz | https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@2/dist/fingerprint2.min.js
   * @returns 32位字符串
   */
  const getwebGlHash = function () {
    const width = 256;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx: any = canvas.getContext('webgl2')
    || canvas.getContext('experimental-webgl2')
    || canvas.getContext('webgl')
    || canvas.getContext('experimental-webgl')
    || canvas.getContext('moz-webgl');

    // WebGL Image Hash
    const getWebglImageHash = function () {
      let rawWebglImageHash = '';
      try {
        const f = 'attribute vec2 attrVertex;varying vec2 varyinTexCoordinate;uniform vec2 uniformOffset;void main(){varyinTexCoordinate=attrVertex+uniformOffset;gl_Position=vec4(attrVertex,0,1);}';
        const g = 'precision mediump float;varying vec2 varyinTexCoordinate;void main() {gl_FragColor=vec4(varyinTexCoordinate,0,1);}';
        const h = ctx.createBuffer();

        ctx.bindBuffer(ctx.ARRAY_BUFFER, h);

        const i = new Float32Array([-.2, -.9, 0, .4, -.26, 0, 0, .7321, 0]);

        ctx.bufferData(ctx.ARRAY_BUFFER, i, ctx.STATIC_DRAW), h.itemSize = 3, h.numItems = 3;

        const j = ctx.createProgram();
        const k = ctx.createShader(ctx.VERTEX_SHADER);

        ctx.shaderSource(k, f);
        ctx.compileShader(k);

        const l = ctx.createShader(ctx.FRAGMENT_SHADER);

        ctx.shaderSource(l, g);
        ctx.compileShader(l);
        ctx.attachShader(j, k);
        ctx.attachShader(j, l);
        ctx.linkProgram(j);
        ctx.useProgram(j);

        j.vertexPosAttrib = ctx.getAttribLocation(j, 'attrVertex');
        j.offsetUniform = ctx.getUniformLocation(j, 'uniformOffset');

        ctx.enableVertexAttribArray(j.vertexPosArray);
        ctx.vertexAttribPointer(j.vertexPosAttrib, h.itemSize, ctx.FLOAT, !1, 0, 0);
        ctx.uniform2f(j.offsetUniform, 1, 1);
        ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, h.numItems);

        const n = new Uint8Array(width * height * 4);
        ctx.readPixels(0, 0, width, height, ctx.RGBA, ctx.UNSIGNED_BYTE, n);
        rawWebglImageHash = JSON.stringify(n).replace(/,?"[0-9]+":/g, '');
      } catch (e) {
        console.warn('fAid error: getwebGlHash-getWebglImageHash', e);
      }

      return rawWebglImageHash;
    };
    const rawWebglImageHash = getWebglImageHash();

    // WebGL Report Hash
    const getWebglReportHash = function () {
      // vendor & renderer info
      let vendorRenderStr = '';
      try {
        const debugInfo: any = ctx?.getExtension('WEBGL_debug_renderer_info');
        const vendor = ctx?.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = ctx?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        vendorRenderStr = vendor + renderer;
      } catch (e) {
        console.warn('fAid error: getwebGlHash-getWebglReportHash-vendor&renderer info', e);
      }

      // report info
      let reportStr = '';
      try {
        // utils function
        const fa2s = function (fa: Array<string>) {
          ctx.clearColor(0.0, 0.0, 0.0, 1.0);
          ctx.enable(ctx.DEPTH_TEST);
          ctx.depthFunc(ctx.LEQUAL);
          ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
          return `[${fa[0]}, ${fa[1]}]`;
        };
        const maxAnisotropy = function (ctx: any) {
          const ext = ctx.getExtension('EXT_texture_filter_anisotropic') || ctx.getExtension('WEBKIT_EXT_texture_filter_anisotropic') || ctx.getExtension('MOZ_EXT_texture_filter_anisotropic');
          if (ext) {
            let anisotropy = ctx.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            if (anisotropy === 0) {
              anisotropy = 2;
            }
            return anisotropy;
          }
          return null;
        };

        const result = [];
        result.push(`extensions:${(ctx.getSupportedExtensions() || []).join(';')}`);
        result.push(`webgl aliased line width range:${fa2s(ctx.getParameter(ctx.ALIASED_LINE_WIDTH_RANGE))}`);
        result.push(`webgl aliased point size range:${fa2s(ctx.getParameter(ctx.ALIASED_POINT_SIZE_RANGE))}`);
        result.push(`webgl alpha bits:${ctx.getParameter(ctx.ALPHA_BITS)}`);
        result.push(`webgl antialiasing:${ctx.getContextAttributes().antialias ? 'yes' : 'no'}`);
        result.push(`webgl blue bits:${ctx.getParameter(ctx.BLUE_BITS)}`);
        result.push(`webgl depth bits:${ctx.getParameter(ctx.DEPTH_BITS)}`);
        result.push(`webgl green bits:${ctx.getParameter(ctx.GREEN_BITS)}`);
        result.push(`webgl max anisotropy:${maxAnisotropy(ctx)}`);
        result.push(`webgl max combined texture image units:${ctx.getParameter(ctx.MAX_COMBINED_TEXTURE_IMAGE_UNITS)}`);
        result.push(`webgl max cube map texture size:${ctx.getParameter(ctx.MAX_CUBE_MAP_TEXTURE_SIZE)}`);
        result.push(`webgl max fragment uniform vectors:${ctx.getParameter(ctx.MAX_FRAGMENT_UNIFORM_VECTORS)}`);
        result.push(`webgl max render buffer size:${ctx.getParameter(ctx.MAX_RENDERBUFFER_SIZE)}`);
        result.push(`webgl max texture image units:${ctx.getParameter(ctx.MAX_TEXTURE_IMAGE_UNITS)}`);
        result.push(`webgl max texture size:${ctx.getParameter(ctx.MAX_TEXTURE_SIZE)}`);
        result.push(`webgl max varying vectors:${ctx.getParameter(ctx.MAX_VARYING_VECTORS)}`);
        result.push(`webgl max vertex attribs:${ctx.getParameter(ctx.MAX_VERTEX_ATTRIBS)}`);
        result.push(`webgl max vertex texture image units:${ctx.getParameter(ctx.MAX_VERTEX_TEXTURE_IMAGE_UNITS)}`);
        result.push(`webgl max vertex uniform vectors:${ctx.getParameter(ctx.MAX_VERTEX_UNIFORM_VECTORS)}`);
        result.push(`webgl max viewport dims:${fa2s(ctx.getParameter(ctx.MAX_VIEWPORT_DIMS))}`);
        result.push(`webgl red bits:${ctx.getParameter(ctx.RED_BITS)}`);
        result.push(`webgl renderer:${ctx.getParameter(ctx.RENDERER)}`);
        result.push(`webgl shading language version:${ctx.getParameter(ctx.SHADING_LANGUAGE_VERSION)}`);
        result.push(`webgl stencil bits:${ctx.getParameter(ctx.STENCIL_BITS)}`);
        result.push(`webgl vendor:${ctx.getParameter(ctx.VENDOR)}`);
        // result.push(`webgl version:${ctx.getParameter(ctx.VERSION)}`);
        reportStr = result.join('*') || '';
      } catch (e) {
        console.warn('fAid error: getwebGlHash-getWebglReportHash-vendor&renderer info', e);
      }

      return vendorRenderStr + reportStr;
    };
    const rawWebglReportHash = getWebglReportHash();

    // 映射为32位定长字符串
    let webglHash = '';
    try {
      const rawWebglHash = rawWebglImageHash + rawWebglReportHash;
      webglHash = hashTo32(rawWebglHash);
    } catch (e) {
      console.warn('fAid error: getwebGlHash-hashTo32', e);
    }

    return webglHash;
  };

  /**
   * audio指纹
   * @description 基于audio生成特定频率音频，转化定长字符串输出
   * @perf 兼容性：好 运行耗时：30ms 代码量：中 信息熵预测：中
   * @ref https://github.com/rickmacgillis/audio-fingerprint/blob/master/audio-fingerprinting.js
   * @returns 32位字符串
   */
  // const getAudioHash = function () {
  //   let context: OfflineAudioContext;
  //   let currentTime: number;
  //   let oscillator: {
  //     connect: (arg0: any) => void;
  //     start: (arg0: number) => void;
  //     type: string;
  //     frequency: {
  //       setValueAtTime: (arg0: number, arg1: any) => void;
  //     };
  //   };
  //   let compressor: {
  //     [x: string]: {
  //       setValueAtTime: (arg0: any, arg1: any) => void;
  //     };
  //     connect: any;
  //     disconnect: any;
  //   } | any;
  //   let fingerprint;
  //   let callback: ((arg0: any) => any);

  //   const run = function (cb: (fingerprint: any) => void, debug = false) {
  //     callback = cb;

  //     try {
  //       setup();

  //     oscillator?.connect(compressor);
  //     compressor?.connect(context.destination);

  //     oscillator?.start(0);
  //     context?.startRendering();

  //     context.oncomplete = onComplete;
  //     } catch (e) {
  //       if (debug) {
  //         throw e;
  //       }
  //     }
  //   };

  //   const setup = function () {
  //     setContext();
  //     currentTime = context.currentTime;
  //     setOscillator();
  //     setCompressor();
  //   };

  //   const setContext = function () {
  //     const AudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  //     context = new AudioContext(1, 44100, 44100);
  //   };

  //   const setOscillator = function () {
  //     oscillator = context.createOscillator();
  //     oscillator.type = 'triangle';
  //     oscillator.frequency.setValueAtTime(10000, currentTime);
  //   };

  //   const setCompressor = function () {
  //     compressor = context.createDynamicsCompressor();

  //     setCompressorValueIfDefined('threshold', -50);
  //     setCompressorValueIfDefined('knee', 40);
  //     setCompressorValueIfDefined('ratio', 12);
  //     setCompressorValueIfDefined('reduction', -20);
  //     setCompressorValueIfDefined('attack', 0);
  //     setCompressorValueIfDefined('release', .25);
  //   };

  //   const setCompressorValueIfDefined = function (item: string, value: number) {
  //     if (compressor[item] !== undefined && typeof compressor[item].setValueAtTime === 'function') {
  //       compressor[item].setValueAtTime(value, context.currentTime);
  //     }
  //   };

  //   const onComplete = function (event: any) {
  //     generateFingerprints(event);
  //     compressor.disconnect();
  //   };

  //   const generateFingerprints = function (event: { renderedBuffer: { getChannelData: (arg0: number) => any[]; }; }) {
  //     let output = '';
  //     for (let i = 4500; 5e3 > i; i++) {
  //       const channelData = event.renderedBuffer.getChannelData(0)[i];
  //       output += Math.abs(channelData);
  //     }

  //     fingerprint = output.toString();

  //     if (typeof callback === 'function') {
  //       return callback(fingerprint);
  //     }
  //   };


  //   return new Promise((res, rej) => {
  //     try {
  //       run((rawAudioHash: any) => {
  //         const audioHash = hashTo32(rawAudioHash);
  //         res(audioHash);
  //       });
  //     } catch (e) {
  //       console.warn('fAid error: getAudioHash', e);
  //       rej(e);
  //     }
  //   });
  // };

  // 特征整合
  const canvasFingerStr = getCanvasHash();
  const fontFingerStr = getFontHash();
  // const audioFingerStr = await getAudioHash();
  const webGlFingerStr = getwebGlHash();

  const complicateFinger = canvasFingerStr
    + fontFingerStr
    + webGlFingerStr;
    // + audioFingerStr

  return complicateFinger;
};

// nettype 不可用
// http_Accept Headers(需要后端)

export {
  getBasicFingerprint,
  getComplicateFingerprint,
};
