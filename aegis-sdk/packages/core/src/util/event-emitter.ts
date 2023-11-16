interface Handler {
  name: string;
  type: number;
  callback: Function;
}

export interface InterfaceEventEmitter {
  indexOf: Function;
  on: Function;
  one: Function;
  emit: Function;
  remove: Function;
  clear: Function;
}

export class EventEmitter {
  private eventsList!: {
    [propName: string]: Handler[];
  };
  public constructor() {
    this.eventsList = {};
  }

  public indexOf(array: any[], value: any) {
    for (let i = 0; i < array.length; i++) {
      if (array[i].callback === value) {
        return i;
      }
    }
    return -1;
  }

  public on(name: string, callback: Function, type = 0) {
    if (!this) return;

    let events = this.eventsList[name];

    if (!events) {
      this.eventsList[name] = [];
      events = this.eventsList[name];
    }

    if (this.indexOf(events, callback) === -1) {
      const handler = {
        name,
        type: type || 0,
        callback,
      };

      events.push(handler);

      return this;
    }

    return this;
  }

  public one(name: string, callback: Function) {
    this.on(name, callback, 1);
  }

  public emit = (name: string, data: any) => {
    if (!this) return;

    let events = this.eventsList[name];
    let handler!: Handler;
    if (events?.length) {
      events = events.slice();
      // const self = this;

      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < events.length; i++) {
        // console.log({ i });
        handler = events[i];
        try {
          const result = handler.callback.apply(this, [data]);
          if (1 === handler.type) {
            this.remove(name, handler.callback);
          }
          if (false === result) {
            break;
          }
        } catch (e) {
          throw e;
        }
      }
    }
    return this;
  };

  public remove(name: string, callback: Function) {
    if (!this) return;

    const events = this.eventsList[name];

    if (!events) {
      return null;
    }

    if (!callback) {
      try {
        delete this.eventsList[name];
      } catch (e) { }
      return null;
    }

    if (events.length) {
      const index = this.indexOf(events, callback);
      events.splice(index, 1);
    }

    return this;
  }

  public clear() {
    this.eventsList = {};
  }
}
