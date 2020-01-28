/* eslint-env jest */
import { performance } from "perf_hooks";
import "./hack_context";
import { memorize } from "./memorize";

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
            resolve(
                someValue || { foo: "bar", method: () => ({ here: "now" }) }
            );
        }, 200);
    });
};

let mockPromise: any;
let mockThunk: any;
let mockedConsole: jest.SpyInstance;

beforeEach(() => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS = undefined;
    process.env.SLAPSHOT_ONLINE = undefined;

    mockPromise = jest.fn(fetchData);
    mockThunk = jest.fn(mockPromise);
    mockedConsole = jest.spyOn(console, "warn");
});

afterEach(() => {
    mockedConsole.mockRestore();
});

test("calls thunk on first run", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";
    const data = await memorize("a", mockThunk);
    expect(mockPromise.mock.calls.length).toBe(1);
    expect(mockThunk.mock.calls.length).toBe(1);
    expect(data.foo).toBe("bar");
    expect(mockedConsole).not.toBeCalled();
});

test("writes a __snapshot__ file to disk", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    await memorize("b", mockThunk);
    expect(mockedConsole).not.toBeCalled();
});

test("resolves from disk on 2nd hit", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    const liveStart = performance.now();
    await memorize("c", mockThunk);
    const liveEnd = performance.now();

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "false";
    const recordedStart = performance.now();
    const data = await memorize("c", jest.fn());
    const recordedEnd = performance.now();

    expect(liveEnd - liveStart).toBeGreaterThan(190);
    expect(recordedEnd - recordedStart).toBeLessThan(10);
    expect(mockPromise.mock.calls.length).toBe(1);
    expect(mockThunk.mock.calls.length).toBe(1);
    expect(data.foo).toBe("bar");
    expect(mockedConsole).not.toBeCalled();
});

test("calls run but dont update with SLAPSHOT_ONLINE", async () => {
    const mockWithValue = jest.fn(complexReturn);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";
    await memorize("d", mockWithValue);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "true";
    expect(() => {
        const data: any = memorize("d", () => mockWithValue({ foo: "foo" }));
        expect(mockWithValue.mock.calls.length).toBe(2);
        expect(mockWithValue.mock.calls.length).toBe(2);
        expect(data.foo).toBe("foo");
    }).toThrow();

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    const data2: any = await memorize("d", () => mockWithValue({ foo: "foo" }));
    expect(mockWithValue.mock.calls.length).toBe(2);
    expect(mockWithValue.mock.calls.length).toBe(2);
    expect(data2.foo).toBe("bar");
});

test("calls run still in unit tests with just updateSnapshot", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";
    await memorize("d", mockThunk);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    const data: any = await memorize("d", mockThunk);
    expect(mockThunk.mock.calls.length).toBe(1);
    expect(data.foo).toBe("bar");
    expect(mockedConsole).toBeCalled();
});

test("calls run and update with updateSnapshot and SLAPSHOT_ONLINE", async () => {
    const mockWithValue = jest.fn(complexReturn);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";
    await memorize("d", mockWithValue);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";
    const data: any = await memorize("d", () => mockWithValue({ foo: "foo" }));
    expect(mockWithValue.mock.calls.length).toBe(2);
    expect(mockWithValue.mock.calls.length).toBe(2);
    expect(data.foo).toBe("foo");

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    const data2: any = await memorize("d", () => mockWithValue({ foo: "foo" }));
    expect(mockWithValue.mock.calls.length).toBe(2);
    expect(mockWithValue.mock.calls.length).toBe(2);
    expect(data2.foo).toBe("foo");
    expect(mockedConsole).not.toBeCalled();
});

test("works with strings and numbers", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    memorize("c", () => 22);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    const data = memorize("c", () => {});
    expect(data).toBe(22);
});

test("works with null value", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    memorize("c", () => null);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    const data = memorize("c", () => {});
    expect(data).toBe(null);
    expect(mockedConsole).not.toBeCalled();
});

test("works with JSON string in memorize name", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    const liveStart = performance.now();
    await memorize(`JSON - ${JSON.stringify({ foo: "dog" })}`, mockThunk);
    const liveEnd = performance.now();

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "false";
    const recordedStart = performance.now();
    const data = await memorize(
        `JSON - ${JSON.stringify({ foo: "dog" })}`,
        jest.fn()
    );
    const recordedEnd = performance.now();

    expect(liveEnd - liveStart).toBeGreaterThan(190);
    expect(recordedEnd - recordedStart).toBeLessThan(10);
    expect(mockPromise.mock.calls.length).toBe(1);
    expect(mockThunk.mock.calls.length).toBe(1);
    expect(data.foo).toBe("bar");
    expect(mockedConsole).not.toBeCalled();
});

test("works with undefined value", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    memorize("c", () => undefined);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    const data = memorize("c", () => {});
    expect(data).toBeUndefined();
    expect(mockedConsole).not.toBeCalled();
});

test("works with array value", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    memorize("c", () => [1, 2, 3]);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    const data = memorize("c", () => {});
    expect(data).toEqual([1, 2, 3]);
    expect(mockedConsole).not.toBeCalled();
});

test("nested APIs with functions throw an error when called unless mocked manualy", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";
    await memorize("complex", complexReturn);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    const data: any = await memorize("complex", complexReturn);
    expect(data.foo).toBe("bar");
    expect(typeof data.foo).toBe("string");
    expect(typeof data.method).toBe("function");

    expect(() => {
        data.method();
    }).toThrow();
    expect(mockedConsole).not.toBeCalled();
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
    expect(mockedConsole).not.toBeCalled();
});

test("No race conditions - works many times out of sync", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    const asyncEvent = async () => {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(22);
            }, 5);
        });
    };

    let i = 0;
    let all = [];
    while (i < 10) {
        i = i + 1;
        all.push(memorize(`c - ${i}`, asyncEvent));
    }
    await Promise.all(all);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    i = 0;
    while (i < 10) {
        i = i + 1;
        await memorize(`c - ${i}`, asyncEvent);
    }
    expect(mockedConsole).not.toBeCalled();
});

test("thrown errors are replayed", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    const mockedCB = jest.fn();
    expect(() => {
        memorize("error", () => {
            throw new Error("foo");
        });
    }).toThrowError("foo");

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    expect(() => {
        memorize("error", mockedCB);
    }).toThrowError("foo");

    expect(mockedCB).not.toBeCalled();
    expect(mockedConsole).not.toBeCalled();
});

test("thrown errors are replayed with custom properties", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    class CustomError extends Error {
        public customProp: any;
        constructor(message: string) {
            super(message);
            this.customProp = "bar";
        }
    }

    const mockedCB = jest.fn();
    expect(() => {
        memorize("error", () => {
            throw new CustomError("foo");
        });
    }).toThrowError("foo");

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    expect(() => {
        memorize("error", mockedCB);
    }).toThrowError("foo");

    try {
        memorize("error", mockedCB);
    } catch (e) {
        expect(e.customProp).toEqual("bar");
    }

    expect(mockedCB).not.toBeCalled();
    expect(mockedConsole).not.toBeCalled();
});

test("consoles error of non-matching snap when validateSnapshot is not set", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    memorize("c", () => 22);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "true";

    memorize("c", () => {});

    expect(mockedConsole).toBeCalled();
});

test("throws error of non-matching snap when validateSnapshot is set to true", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    memorize("validateSnapshot", () => 22);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "true";
    expect(() => {
        memorize("validateSnapshot", () => {}, {
            validateSnapshot: true
        });
    }).toThrow();
    expect(mockedConsole).not.toBeCalled();
});

test("deffers to validateSnapshot to validate snapshot when validateSnapshot is a funtion", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    memorize("c", () => 22);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    const data = memorize("c", () => {}, {
        validateSnapshot: liveData => {
            expect(liveData).toMatchSnapshot("some dumb snapshot");
        }
    });
    expect(data).toBe(22);
    expect(mockedConsole).not.toBeCalled();
});

test("does not break toMatchSnapshot", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";

    memorize("c", () => 22);

    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    const data = memorize("c", () => {}, {
        validateSnapshot: liveData => {
            expect(liveData).toMatchSnapshot();
        }
    });
    expect(data).toMatchSnapshot("some dumb snapshot");
    expect(mockedConsole).not.toBeCalled();
});
