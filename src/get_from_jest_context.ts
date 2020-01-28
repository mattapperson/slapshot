import path from "path";
const testMap: any = {};

export const getFromJestContext = (snapshotName: string, pure: boolean) => {
    let jestContext: any;
    // Hack to get access to jest current test context
    // @ts-ignore
    expect().__slapshot__hack__context(context => (jestContext = context));

    let fullSnapshotName = `Test: ${jestContext.currentTestName} | Memorized Name: ${snapshotName}`;

    if (!pure) {
        if (!testMap[jestContext.currentTestName]) {
            testMap[jestContext.currentTestName] = 0;
        }
        testMap[jestContext.currentTestName] += 1;

        fullSnapshotName = `${fullSnapshotName} | Call iteration: ${
            testMap[jestContext.currentTestName]
        }`;
    } else {
        fullSnapshotName = `${fullSnapshotName} | Call iteration: 0`;
    }
    const testFilePath = jestContext.testPath
        .split(".")
        .slice(0, -1)
        .join(".");
    const testFileName = `${path.basename(testFilePath)}.snap`;
    const slapFilePath = path.resolve(
        testFilePath,
        "..",
        "__snapshots__",
        testFileName
    );

    return {
        slapFilePath,
        testFileName,
        testFilePath,
        fullSnapshotName,
        shouldUpdateSnapshot:
            (process.env
                .SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS ===
                undefined &&
                jestContext.shouldUpdateSnapshot) ||
            process.env
                .SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS ===
                "true",
        snapshotData: jestContext.snapshotData,
        addSnapshot: jestContext.addSnapshot as (
            testName: string,
            value: string
        ) => void,
        markSnapAsUsed: jestContext.markSnapAsUsed
    };
};
