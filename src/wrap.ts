type APIKey = string | number;
const internalKeys = ["__api", "__name", "__path"];
let objectProxyHandler: ProxyHandler<any> = {
  has(target, key) {
    console.log(key);
    if (typeof target.__api[key]) {
      return true;
    }
    return false;
  },
  ownKeys(target) {
    return Reflect.ownKeys(target.__api).filter(
      (key: string | number | symbol) =>
        typeof key === "string" && !internalKeys.includes(key)
    );
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
  getPrototypeOf(target) {
    return target.__api;
  },
  enumerate(target) {
    return Object.keys(target.__api);
  },
  get(target, key: string | number) {
    if (typeof key === "string" && key.indexOf("__slapshot") === 0) {
      return target[key.replace("__slapshot", "")];
    }

    if (typeof target.__api[key] === "object" && target.__api[key] !== null) {
      return new Proxy(
        {
          __api: target.__api[key],
          __name: target.__name,
          __path: `${target.__path}.${key}`
        } as any,
        objectProxyHandler
      );
    }

    if (typeof target.__api[key] === "function") {
      const origMethod = target.__api[key];

      return function(...args: any[]) {
        // @ts-ignore
        let result = origMethod.apply(this, args);

        return result;
      };
    }

    return target.__api[key];
  }
};

export function wrap<
  APIType = (...args: any[]) => void | { [key in APIKey]: any }
>(name: string, api: APIType): APIType {
  if (typeof api === "function") {
    return function(...args: any[]) {
      // @ts-ignore
      let result = api.apply(this, args);

      return result;
    } as any;
  }
  return new Proxy(
    { __api: api, __name: name, __path: name } as any,
    objectProxyHandler
  ) as APIType;
}
