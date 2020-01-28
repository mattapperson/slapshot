/* eslint-env jest */
import { callWhenOnline } from "./call_when_online";
import "./hack_context";

const fetchData = () => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ foo: "bar" });
        }, 200);
    });
};

let mockPromise: any;
let mockThunk: any;

beforeEach(() => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS = undefined;
    process.env.SLAPSHOT_ONLINE = undefined;

    mockPromise = jest.fn(fetchData);
    mockThunk = jest.fn(mockPromise);
});

test("calls thunk from callWhenOnline when online", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "true";
    process.env.SLAPSHOT_ONLINE = "true";
    await callWhenOnline(mockThunk);
    expect(mockPromise.mock.calls.length).toBe(1);
    expect(mockThunk.mock.calls.length).toBe(1);
});

test("does not thunk from callWhenOnline when online", async () => {
    process.env.SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS =
        "false";
    process.env.SLAPSHOT_ONLINE = "false";
    await callWhenOnline(mockThunk);
    expect(mockPromise.mock.calls.length).toBe(0);
    expect(mockThunk.mock.calls.length).toBe(0);
});
