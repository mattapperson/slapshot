import path from "path";
const testMap: any = {};

export const getFromJestContext = (snapshotName: string, pure: boolean) => {
  let jestContext: any;
  // Hack to get access to jest current test context
  // @ts-ignore
  expect().__slapshot__hack__context(context => (jestContext = context));

  let fullSnapshotName = `${jestContext.currentTestName} - ${snapshotName}`;

  if (!pure) {
    if (!testMap[jestContext.currentTestName]) {
      testMap[jestContext.currentTestName] = 0;
    }
    testMap[jestContext.currentTestName] += 1;

    fullSnapshotName = `${fullSnapshotName} -- ${
      testMap[jestContext.currentTestName]
    }`;
  } else {
    fullSnapshotName = `${fullSnapshotName} -- 0`;
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
      (process.env.SHOULD_UPDATE_SNAPSHOTS === undefined &&
        jestContext.shouldUpdateSnapshot) ||
      process.env.SHOULD_UPDATE_SNAPSHOTS === "true",
    snapshotData: jestContext.snapshotData,
    addSnapshot: jestContext.addSnapshot as (
      testName: string,
      value: string
    ) => void
  };
};
