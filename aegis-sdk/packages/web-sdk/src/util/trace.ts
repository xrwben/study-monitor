import { generateAid } from 'aegis-core';
import { uuid4 } from './uuid';
import { RandomIdGenerator } from './ot-js';
/* eslint-disable @typescript-eslint/prefer-for-of */
interface TraceHeaderHandler {
  [key: string]: Function;
}

const traceHeaderHandler: TraceHeaderHandler = {
  sw8: (headerString: string): string => {
    const [, traceId] = headerString.split('-');
    if (traceId) {
      return atob(traceId);
    }
    return '';
  },
  traceparent: (headerString: string): string => {
    const [, traceId] = headerString.split('-');
    return traceId;
  },
  // b3: {TraceId}-{SpanId}-{SamplingState}-{ParentSpanId}
  b3: (headerString: string): string => {
    const [traceId] = headerString.split('-');
    return traceId;
  },
  'sentry-trace': (headerString: string): string => {
    const [traceId] = headerString.split('-');
    return traceId;
  },
};

// 获取特定的 header
const getSpecificHeader = function (
  headers: Headers | Record<string, any>,
  keys: Array<string>
): [string, string] {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const headerString = headers[key] || (typeof headers.get === 'function' && headers.get(key));
    if (headerString) return [key, headerString];
  }
  return ['', ''];
};

// 1. 解析 SkyWalking 的协议
// eslint-disable-next-line max-len
// 例子：1-YWI2ZjI3ZDktY2VhMC00NGJiLWFiN2ItZWY1YTJlMGM3ODk4-NjA3MjNlM2YtOTFlOC00NWU2LWE4MWMtOWM5ZDc3MjRiZDkx-0-dGljay10ZXN0PGJyb3dzZXI+-djEuMC4w-ZmlsZTovLy9Vc2Vycy9saXpoZW4vRGVza3RvcC9pbmRleC5odG1s-cmVwb3J0LnVybC5jbg==
// const values = `${1}-${traceIdStr}-${segmentId}-${index}-${service}-${instance}-${endpoint}-${peer}`;
// const traceIdStr = String(encode(traceId));
// 解析为 ab6f27d9-cea0-44bb-ab7b-ef5a2e0c7898

// 2. 解析 OpenTelemetry 协议
// traceParent类型
// 例子： 00-b0c91957efd90c451e5ba28237c3018c-32646cbd8b1b086a-01
// eslint-disable-next-line max-len
// const traceParent = `${VERSION}-${spanContext.traceId}-${spanContext.spanId}-0${Number(spanContext.traceFlags || TraceFlags.NONE).toString(16)}`
// 解析为 b0c91957efd90c451e5ba28237c3018c
// b3类型
// const b3 = `${spanContext.traceId}-${spanContext.spanId}-${samplingState}`
// 在ot中，traceParent和b3只能二选一

// 3. 解析 sentry trace 协议
// 例子：sentry-trace: e87447e5d859440687a1dcb1b633f4a0-b1ebb875567de767-1
// `${this.traceId}-${this.spanId}${sampledString}`;
// 解析为 e87447e5d859440687a1dcb1b633f4a0
export const parseNormalTraceRequestHeader = (headers: HeadersInit | undefined): string => {
  let header = '';
  if (typeof headers === 'object') {
    const [key, headerString] = getSpecificHeader(headers, Object.keys(traceHeaderHandler));
    if (key) {
      header = traceHeaderHandler[key](headerString);
    }
  }
  return header;
};


export class TraceRequestHeader {
  private traceType: string;
  private traceId: string;
  private ignoreUrls: Array<string | RegExp>;
  private urls: Array<string | RegExp> | null;
  private url: string;

  public constructor(
    traceType: TraceType,
    ignoreUrls: Array<string | RegExp>,
    urls: Array<string | RegExp> | null = null
  ) {
    this.traceType = traceType;
    this.ignoreUrls = ignoreUrls;
    this.urls = urls;
  }

  public generate(url: string, headers: any = {}) {
    this.url = url;

    if (this.isUrlIgnored() || !this.isUrlInTraceUrls() || !this.traceType) {
      return;
    }

    switch (this.traceType) {
      case 'traceparent':
        this.traceId = this.createTraceparent();
        break;
      case 'b3':
        this.traceId = this.createB3();
        break;
      case 'sw8':
        this.traceId = this.createSw8();
        break;
      case 'sentry-trace':
        this.traceId = this.createSentryTrace();
        break;
      default:
        console.warn(`this trace key ${this.traceType} is not supported`);
        this.traceId = '';
        return;
    }

    if (headers[this.traceType]) {
      this.traceId = headers[this.traceType];
    }

    return { name: this.traceType, value: this.traceId };
  }

  private createTraceparent(): string {
    const spanId = RandomIdGenerator.generateSpanId();
    const traceId = RandomIdGenerator.generateTraceId();
    const traceFlags = 0x1 << 0;

    return `00-${traceId}-${spanId}-0${Number(traceFlags).toString(16)}`;
  }

  private createB3(): string {
    const spanId = RandomIdGenerator.generateSpanId();
    const traceId = RandomIdGenerator.generateTraceId();
    const samplingState = (0x1 << 0) & 0x1;
    return `${traceId}-${spanId}-${samplingState}`;
  }

  // 参考代码trace的生成：
  // https://github.com/apache/skywalking-client-js/blob/master/src/trace/interceptors/fetch.ts
  private createSw8(): string {
    const dUrl = new URL(location.href);
    const traceSegmentId = generateAid();
    const traceId = generateAid();
    const traceIdStr = String(btoa(traceId));
    const segmentId = String(btoa(traceSegmentId));
    const service = String(btoa('aegis'));
    const instance = String(btoa(VERSION));
    const endpoint = String(btoa(encodeURI(location.pathname)));
    const peer = String(btoa(dUrl.host));

    return `${1}-${traceIdStr}-${segmentId}-${1}-${service}-${instance}-${endpoint}-${peer}`;
  }

  private createSentryTrace() {
    const spanId = uuid4().substring(16);
    const traceId = uuid4();
    const sampledString = '-1';
    return `${traceId}-${spanId}${sampledString}`;
  }

  // 判断当前 url 是否在 injectTraceIgnoreUrls 条件中
  private isUrlIgnored() {
    if (!Array.isArray(this.ignoreUrls) || this.ignoreUrls.length === 0) {
      return false;
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const ignoreUrl of this.ignoreUrls) {
      if (this.urlMatches(this.url, ignoreUrl)) {
        return true;
      }
    }

    return false;
  }

  // 判断当前 url 是否在 injectTraceUrls 条件中
  private isUrlInTraceUrls() {
    if (!this.urls) {
      return true;
    }

    if (Array.isArray(this.urls)) {
      if (this.urls.length === 0) {
        return false;
      }

      // eslint-disable-next-line no-restricted-syntax
      for (const hasUrl of this.urls) {
        if (this.urlMatches(this.url, hasUrl)) {
          return true;
        }
      }
    }

    return false;
  }

  private urlMatches(url: string, urlToMatch: string | RegExp): boolean {
    if (typeof urlToMatch === 'string') {
      return url === urlToMatch;
    }
    return !!url.match(urlToMatch);
  }
}

export type TraceType = 'traceparent' | 'b3' | 'sw8' | 'sentry-trace';
export const isTraceHeader = (key: string) => ['traceparent', 'b3', 'sw8', 'sentry-trace'].indexOf(key) > -1;

