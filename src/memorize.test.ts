/* eslint-env jest */
import rimraf from "rimraf";
import { memorize } from "./memorize";
import fs from "fs";
import { performance } from "perf_hooks";

const snapshotDir = `${__dirname}/__memorize_snapshots__`;

const fetchData = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ foo: "bar" });
    }, 200);
  });
};

const complexReturn = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ foo: "bar", method: () => ({ here: "now" }) });
    }, 200);
  });
};

let mockPromise: any;
let mockThunk: any;

beforeEach(() => {
  mockPromise = jest.fn(fetchData);
  mockThunk = jest.fn(mockPromise);
  rimraf.sync(snapshotDir);
});

test("calls thunk on first run", async () => {
  const data = await memorize("a", mockThunk);
  expect(mockPromise.mock.calls.length).toBe(1);
  expect(mockThunk.mock.calls.length).toBe(1);
  expect(data.foo).toBe("bar");
});

test("writes a __data_snapshot__ file to disk", async () => {
  expect(fs.existsSync(snapshotDir)).toBe(false);
  await memorize("b", mockThunk);
  expect(fs.existsSync(snapshotDir)).toBe(true);
});

test("resolves from disk on 2nd hit", async () => {
  const liveStart = performance.now();
  await memorize("c", mockThunk);
  const liveEnd = performance.now();
  const recordedStart = performance.now();
  const data = await memorize("c", mockThunk);
  const recordedEnd = performance.now();

  expect(liveEnd - liveStart).toBeGreaterThan(190);
  expect(recordedEnd - recordedStart).toBeLessThan(10);
  expect(mockPromise.mock.calls.length).toBe(1);
  expect(mockThunk.mock.calls.length).toBe(1);
  expect(data.foo).toBe("bar");
});

test("calls update", async () => {
  await memorize("d", mockThunk);
  process.argv.push("--updateSnapshot");
  const data = await memorize("d", mockThunk);
  process.argv.pop();
  expect(mockPromise.mock.calls.length).toBe(2);
  expect(mockThunk.mock.calls.length).toBe(2);
  expect(data.foo).toBe("bar");
});

test("works with strings and numbers", async () => {
  await memorize("c", () => {
    return 22;
  });

  const data = await memorize("c", () => {});
  expect(data).toBe(22);
});

test("nested APIs with functions throw an error when called unless mocked manualy", async () => {
  await memorize("complex", complexReturn);

  const data: any = await memorize("complex", complexReturn);
  expect(data.foo).toBe("bar");
  expect(typeof data.foo).toBe("string");
  expect(typeof data.method).toBe("function");

  expect(() => {
    data.method();
  }).toThrow();
});
