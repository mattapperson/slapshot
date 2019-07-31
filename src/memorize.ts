import path from "path";
import fs from "fs";
import { Snapshot } from "./types";
import { runInOnlineMode, shouldUpdateSnapshot } from "./utils";
import { safeSnapshot } from "./safeSnapshot";
import { loadSnaps } from "./loadSnaps";
import { mkdir } from "./mkdir";

const testMap: any = {};

export async function memorize<ReturnedData = any>(
  snapshotName: string,
  method: () => Promise<ReturnedData> | ReturnedData,
  { notPure = false }: { notPure?: boolean } = {}
): Promise<ReturnedData> {
  let jestContext: any;
  // Hack to get access to jest current test context
  // @ts-ignore
  expect().__slapshot__hack__context(context => (jestContext = context));

  let fullSnapshotName = `${jestContext.currentTestName} - ${snapshotName}`;

  if (notPure) {
    if (!testMap[fullSnapshotName]) testMap[fullSnapshotName] = 0;
    testMap[fullSnapshotName] += 1;

    fullSnapshotName = `${fullSnapshotName} (${testMap[fullSnapshotName]})`;
  }

  const basename = `${path.basename(jestContext.testPath)}.snap`;
  const snapFile = path.resolve(
    jestContext.testPath,
    "..",
    "__memorize_snapshots__",
    basename
  );

  let snapshots: Snapshot = {};

  if (fs.existsSync(snapFile)) {
    snapshots = loadSnaps(snapFile);
  }

  const { results: snap } = snapshots[fullSnapshotName] || ({} as Snapshot);

  if (!shouldUpdateSnapshot() && !runInOnlineMode() && !snap) {
    throw new Error(
      `Missing snaport
    - Method snapshot name: ${fullSnapshotName}
    - Test file: ${jestContext.testPath}

    Please re-run Jest with the --updateSnapshot flag AND the env var SLAPSHOT_ONLINE=true.`.replace(
        new RegExp("        ", "g"),
        ""
      )
    );
  }

  if (!runInOnlineMode()) {
    return Promise.resolve(safeSnapshot(snap, false));
  }

  let methodResults = method();

  if (methodResults instanceof Promise) {
    methodResults = (await methodResults) as ReturnedData;
  }

  if (!shouldUpdateSnapshot() && runInOnlineMode()) {
    let snapDataToCompare = snap;
    if (typeof snapDataToCompare === "object") {
      snapDataToCompare = JSON.stringify(snapDataToCompare);
    }

    let methodResultsToCompare: any = methodResults;
    if (typeof methodResultsToCompare === "object") {
      methodResultsToCompare = JSON.stringify(methodResultsToCompare);
    }

    if (snap && methodResultsToCompare !== snapDataToCompare) {
      throw new Error(
        `[Warning] Intigration test result does not match the memorized snap file:
        - Method snapshot name: ${fullSnapshotName}
        - Test file: ${jestContext.testPath}

        Please re-run Jest with the --updateSnapshot flag AND the env var SLAPSHOT_ONLINE=true.`.replace(
          new RegExp("        ", "g"),
          ""
        )
      );
    }

    return Promise.resolve(methodResults);
  }

  snapshots[fullSnapshotName] = {
    results: safeSnapshot(methodResults)
  };

  const newSnap = Object.keys(snapshots)
    .sort()
    .reduce((acc, key) => {
      return (
        acc +
        `\nexports['${key}'] = ${JSON.stringify(snapshots[key], null, 2)}\n`
      );
    }, "");

  mkdir(snapFile);
  fs.writeFileSync(snapFile, newSnap);
  return methodResults;
}
