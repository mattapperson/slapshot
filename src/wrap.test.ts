import { wrap } from "./wrap";

const objAPI = {
  func: () => ({
    otherfunc: () => 22
  }),
  prop: 11,
  obj: {
    func: () => ({
      otherfunc: () => 22
    }),
    prop: 11,
    asyncFunc: () => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(30);
        }, 10);
      });
    }
  },
  asyncFunc: () => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(30);
      }, 10);
    });
  }
};

test("proxy wrap nested API", async () => {
  const wrappedAPI = wrap<typeof objAPI>("test 1", objAPI);

  expect(JSON.stringify(wrappedAPI)).toBe(JSON.stringify(objAPI));
});

test("have full access to proxy wraped nested API", async () => {
  const wrappedAPI = wrap<typeof objAPI>("test 1", objAPI);

  expect(JSON.stringify(wrappedAPI.func())).toBe(JSON.stringify(objAPI.func()));
  expect(JSON.stringify(wrappedAPI.obj)).toBe(JSON.stringify(objAPI.obj));
  expect(JSON.stringify(wrappedAPI.obj.func())).toBe(
    JSON.stringify(objAPI.obj.func())
  );

  expect(JSON.stringify(wrappedAPI.func().otherfunc())).toBe(
    JSON.stringify(objAPI.func().otherfunc())
  );
  expect(wrappedAPI.prop).toBe(objAPI.prop);
  // @ts-ignore
  expect(wrappedAPI.obj.__slapshot__path).toBe("test 1.obj");
  expect(wrappedAPI.obj.prop).toBe(objAPI.obj.prop);
  expect(await wrappedAPI.asyncFunc()).toBe(30);
});

test("proxy wrap function", async () => {
  const wrappedAPI = wrap<() => { otherfunc: () => number }>(
    "test 1",
    objAPI.func
  );

  expect(wrappedAPI().otherfunc).not.toBe(undefined);
  expect(wrappedAPI().otherfunc()).toBe(22);
});
