/* eslint-env jest */
import rimraf from "rimraf";
import { memorize } from "./memorize";
import fs from "fs";
import { performance } from "perf_hooks";
import "./hack_context";

const snapshotDir = `${__dirname}/__memorize_snapshots__`;

const fetchData = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ foo: "bar" });
    }, 200);
  });
};

const complexReturn = (someValue: any = null) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(someValue || { foo: "bar", method: () => ({ here: "now" }) });
    }, 200);
  });
};

let mockPromise: any;
let mockThunk: any;

beforeEach(() => {
  process.argv = process.argv.filter(e => e !== "--updateSnapshot");
  process.argv = process.argv.filter(e => e !== "-u");
  process.env.SLAPSHOT_ONLINE = undefined;

  mockPromise = jest.fn(fetchData);
  mockThunk = jest.fn(mockPromise);
  rimraf.sync(snapshotDir);
});

test("calls thunk on first run", async () => {
  process.argv.push("--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "true";
  const data = await memorize("a", mockThunk);
  expect(mockPromise.mock.calls.length).toBe(1);
  expect(mockThunk.mock.calls.length).toBe(1);
  expect(data.foo).toBe("bar");
});

test("writes a __data_snapshot__ file to disk", async () => {
  expect(fs.existsSync(snapshotDir)).toBe(false);
  process.argv.push("--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "true";

  await memorize("b", mockThunk);
  expect(fs.existsSync(snapshotDir)).toBe(true);
});

test("resolves from disk on 2nd hit", async () => {
  process.argv.push("--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "true";

  const liveStart = performance.now();
  await memorize("c", mockThunk);
  const liveEnd = performance.now();

  process.argv.push("--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "false";
  const recordedStart = performance.now();
  const data = await memorize("c", jest.fn());
  const recordedEnd = performance.now();

  expect(liveEnd - liveStart).toBeGreaterThan(190);
  expect(recordedEnd - recordedStart).toBeLessThan(10);
  expect(mockPromise.mock.calls.length).toBe(1);
  expect(mockThunk.mock.calls.length).toBe(1);
  expect(data.foo).toBe("bar");
});

test("calls run but dont update with SLAPSHOT_ONLINE", async () => {
  const mockWithValue = jest.fn(complexReturn);

  process.argv.push("--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "true";
  await memorize("d", mockWithValue);

  process.argv = process.argv.filter(e => e !== "--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "true";
  expect(() => {
    const data: any = memorize("d", () => mockWithValue({ foo: "foo" }));
    expect(mockWithValue.mock.calls.length).toBe(2);
    expect(mockWithValue.mock.calls.length).toBe(2);
    expect(data.foo).toBe("foo");
  }).toThrow();

  process.argv = process.argv.filter(e => e !== "--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "false";
  const data2: any = await memorize("d", () => mockWithValue({ foo: "foo" }));
  expect(mockWithValue.mock.calls.length).toBe(2);
  expect(mockWithValue.mock.calls.length).toBe(2);
  expect(data2.foo).toBe("bar");
});

test("calls run still in unit tests with just updateSnapshot", async () => {
  process.argv.push("--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "true";
  await memorize("d", mockThunk);

  process.argv = process.argv.filter(e => e !== "--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "false";
  const data: any = await memorize("d", mockThunk);
  expect(mockThunk.mock.calls.length).toBe(1);
  expect(mockThunk.mock.calls.length).toBe(1);
  expect(data.foo).toBe("bar");
});

test("calls run and update with updateSnapshot and SLAPSHOT_ONLINE", async () => {
  const mockWithValue = jest.fn(complexReturn);

  process.argv.push("--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "true";
  await memorize("d", mockWithValue);

  process.argv.push("--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "true";
  const data: any = await memorize("d", () => mockWithValue({ foo: "foo" }));
  expect(mockWithValue.mock.calls.length).toBe(2);
  expect(mockWithValue.mock.calls.length).toBe(2);
  expect(data.foo).toBe("foo");

  process.argv = process.argv.filter(e => e !== "--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "false";
  const data2: any = await memorize("d", () => mockWithValue({ foo: "foo" }));
  expect(mockWithValue.mock.calls.length).toBe(2);
  expect(mockWithValue.mock.calls.length).toBe(2);
  expect(data2.foo).toBe("foo");
});

test("works with strings and numbers", async () => {
  process.argv.push("--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "true";

  memorize("c", () => 22);

  process.argv = process.argv.filter(e => e !== "--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "false";
  const data = memorize("c", () => {});
  expect(data).toBe(22);
});

test("nested APIs with functions throw an error when called unless mocked manualy", async () => {
  process.argv.push("--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "true";
  await memorize("complex", complexReturn);

  process.argv = process.argv.filter(e => e !== "--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "false";
  const data: any = await memorize("complex", complexReturn);
  expect(data.foo).toBe("bar");
  expect(typeof data.foo).toBe("string");
  expect(typeof data.method).toBe("function");

  expect(() => {
    data.method();
  }).toThrow();
});

test("Impure memorized methods also add call count to name", async () => {
  const result1 = await memorize(
    "complex",
    () => {
      return 22;
    },
    { pure: false }
  );

  const result2 = await memorize(
    "complex",
    () => {
      return 21;
    },
    { pure: false }
  );

  expect(result1).toBe(22);
  expect(result2).toBe(21);
});

test("thrown errors are replayed", async () => {
  process.argv.push("--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "true";

  const mockedCB = jest.fn();
  expect(() => {
    memorize("error", () => {
      throw new Error("foo");
    });
  }).toThrowError("foo");

  process.argv = process.argv.filter(e => e !== "--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "false";
  expect(() => {
    memorize("error", mockedCB);
  }).toThrowError("foo");

  expect(mockedCB).not.toBeCalled();
});

test("thrown errors of a custom type are replayed as the correct instance", async () => {
  class CustomError extends Error {
    constructor(message: any) {
      super(message);
      this.name = "CustomError";
    }
  }

  process.argv.push("--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "true";

  const mockedCB = jest.fn();
  expect(() => {
    memorize("error", () => {
      throw new CustomError("foo");
    });
  }).toThrowError("foo");

  process.argv = process.argv.filter(e => e !== "--updateSnapshot");
  process.env.SLAPSHOT_ONLINE = "false";

  try {
    memorize("error", mockedCB);
  } catch (e) {
    expect(e).toBeInstanceOf(CustomError);
  }
});
