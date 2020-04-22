# Slapshot

![](https://github.com/mattapperson/slapshot/workflows/Node%20CI/badge.svg)
[![NPM version](https://img.shields.io/npm/v/@mattapperson/slapshot.svg)](https://www.npmjs.com/package/@mattapperson/slapshot)
[![dependencies Status](https://david-dm.org/mattapperson/slapshot/status.svg)](https://david-dm.org/mattapperson/slapshot)

A simple, easy utility to write a single set of tests that can be run:

-   "online" (full integration-test)

OR

-   "offline" (auto-mocked unit tests with result snapshotted from when last run "online")

## Install

```
yarn install --dev @mattapperson/slapshot
```

## Why would someone want this?

Developers love to debate unit tests versus integration tests. However, the truth is they both are extremely useful, and both have serious downsides.

**Integration tests** give you a ton of confidence about your code... but are often slow, and in many cases require an internet connection.

**Unit tests** Run quickly, giving rapid feedback on the code your developing, thus allowing you to move faster. Still, many times you begin to assemble the many pieces of your codebase that are all well unit tested, but together they fail or are buggy.
Not to mention often, maintaining Mocks for integration points is like maintaining comments in code too often; things don't match up or are insufficient.

You could write 2 test suites... but that's 2x the tests to maintain.

**But with Slapshot:**

-   one test/mock file, and one step... No need to write a test that generates the mocks first, allowing it to feel like Jest snapshots.
-   Tests to be run as unit tests... but if the ENV var `SLAPSHOT_ONLINE=true` is set the tests are run as integration tests. All with a single test being written!
-   No setup to ensure is working locally or a CI... environment starting or not can be programmatically controlled in the test itself using `callWhenOnline`
-   To update the snapshotted results, simply run your tests with the ENV var `SLAPSHOT_ONLINE=true` AND the CLI arg of `--updateSnapshot`

## Requirements

-   Node 8 or higher
-   Jest 20.0 or higher

## Example usage / API

```js
/**
 * Method 1: callWhenOnline
 *
 * This block only runs if recording or running as intigration, and starts mongodb to be used in the tests
 **/
await callWhenOnline(async () => {
    await new Promise((resolve) => {
        const pipe = spawn("mongod", ["--dbpath=<LOCATION>", "--port", "1223"]);
        pipe.stdout.on("data", function (data) {
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
    const userEmail = "me@mattapperson.com";
    const results = await memorize(
        `get user by email: ${userEmail}`,
        async () => getUser({ email: userEmail }),
        {
            // validateSnapshot can be a function, a bool, or an object
            // AS A FUNCTION:
            // It receves the live and snapshot values as params and throwing an error fails the compare

            // AS AN OBJECT:
            // You can use dot annotation to deeply compare or ignore the diff
            validateSnapshot: {
                // The ID might not always be the same in our tests,
                // so don't fail the snapshot validation because of it
                // when running in "online" mode
                ignore: ["id"],

                // Optionally, "whitelist" keys
                // only: ['name.first']
            },
        }
    );
    expect(results.fullName).toBe("Matt Apperson");
});

async function getUser({ email }) {
    const client = await mongodb.connect({ port: 1223 });
    return client.query({ email });
}
```
