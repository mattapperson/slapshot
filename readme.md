# Slapshot

[![Codeship Status for mattapperson/slapshot](https://app.codeship.com/projects/a74efe30-84d8-0137-7d90-12effd3c42b7/status?branch=master)](https://app.codeship.com/projects/353402)
[![NPM version](https://img.shields.io/npm/v/@mattapperson/slapshot.svg)](https://www.npmjs.com/package/@mattapperson/slapshot)
[![dependencies Status](https://david-dm.org/mattapperson/slapshot/status.svg)](https://david-dm.org/mattapperson/slapshot)

A simple, easy utility to write a single set of tests that can be run:

- "online" (full integration test)

OR

- "offline" (auto-mocked unit tests with result snapshotted from when last run "online")

## Install

```
yarn install --dev @mattapperson/slapshot
```

## Why would someone want this?

Developers love to debate unit tests vs integration tests. But the honest truth is they bith are extreamly useful, and both have serious down sides.

**Integration tests** give you a ton of confidence about your code... but are often slow, and in many cases require an internet connection.

**Unit tests** Run quickly, giving rapid feedback on the code your developing, thus allowing you to move faster... but many times you begin to assemble the many pices of your codebase that are all well unit tested, but together they fail, or are buggy.
Not to mention often times maintaining Mocks for intigration points is like maintaining comments in code... too often things dont match up, or are insuffecient.

You could write 2 test suites... but that's 2x the tests to maintain.

**But with Slapshot:**

- one test/mock file, and one step... No need to write a test that generates the mocks first, allowing it to feel like Jest snapshots.
- Tests to be run as unit tests... but if the ENV var `SLAPSHOT_ONLINE=true` is set the tests are run as intigration tests. All with a single test being written!
- No setup to ensure is working localy or a CI... enviorment starting or not can be programaticly controlled in the test itself using `callWhenOnline`
- To update the snapshotted results, simply run your tests with the ENV var `SLAPSHOT_ONLINE=true` AND the cli arg of `--updateSnapshot`

## Requirements

- Node 8 or higher
- Jest 20.0 or higher

## Example usage / API

```js
/**
 * Method 1: callWhenOnline
 *
 * This block only runs if recording or running as intigration, and starts mongodb to be used in the tests
 **/
await callWhenOnline(async () => {
  await new Promise(resolve => {
    const pipe = spawn("mongod", ["--dbpath=<LOCATION>", "--port", "1223"]);
    pipe.stdout.on("data", function(data) {
      if (data.indexOf("started") !== -1) {
        resolve();
      }
    });
  });
});

/**
 * Method 2: memorize
 *
 * if CLI flag `--updateSnapshot` or the env var `SLAPSHOT_ONLINE=true` is set to record, this returns the live server results
 * if not, it returns a snapshotted version. When live, the above callWhenOnline would have
 * started the server it would connect to making the process seamless
 **/
test("get user by ID", async () => {
  const results = await memorize("get foo user", async () => getUser("foo"));
  expect(results.fullName).toBe("Matt Apperson");
});

async function getUser(userId) {
  const client = await mongodb.connect({ port: 1223 });
  return client.query({ id: userId });
}
```
