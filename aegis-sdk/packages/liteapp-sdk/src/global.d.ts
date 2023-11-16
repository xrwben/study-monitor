interface LiteModule {
  kv: {
    getItem: (key: string) => Promise<string>
    setItem: (key: string, value: any, options?: { expireTime?: number }) => Promise<void>
  },
  system: {
    getSystemInfo: () => any
  }
  router: {
    currentRoute: string;
    currentQuery: { [key: string]: string };
    currentPages: {
      path: string,
      query?: { [key: string]: string }
    }[]
  }
  addEventListener: any

  store: {
    dispatch: Function
  }
  // [key: string]: any
}

declare const setStore: Function;

declare const lite: LiteModule;
