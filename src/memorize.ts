import path from "path";
import fs from "fs";
import { Snapshot } from "./types";
import { runInOnlineMode, shouldUpdateSnapshot } from "./utils";
import { safeSnapshot } from "./safeSnapshot";
import { loadSnaps } from "./loadSnaps";
import { mkdir } from "./mkdir";

type SlapshotDataFormat = { thrownError?: any; results: any };

const testMap: any = {};

function returnValues(value: SlapshotDataFormat) {
  if (value.thrownError) {
    throw value.thrownError;
  } else {
    return value.results;
  }
}

export function memorize<ReturnedData = any>(
  snapshotName: string,
  method: () => Promise<ReturnedData> | ReturnedData,
  { pure = true }: { pure?: boolean } = {}
): Promise<ReturnedData> | ReturnedData {
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

    fullSnapshotName = `${fullSnapshotName} (${
      testMap[jestContext.currentTestName]
    })`;
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
      `Missing snapshot
    - Method snapshot name: ${fullSnapshotName}
    - Test file: ${jestContext.testPath}

    ${process.env.SLAPSHOT_RERUN_MESSAGE ||
      "Please re-run Jest with the --updateSnapshot flag AND the env var SLAPSHOT_ONLINE=true"}.`.replace(
        new RegExp("        ", "g"),
        ""
      )
    );
  }

  if (!runInOnlineMode()) {
    return safeSnapshot(snap, false);
  }

  let methodResults: SlapshotDataFormat = { results: null, thrownError: null };
  try {
    methodResults.results = method();
  } catch (e) {
    methodResults.thrownError = e;
  }

  if (methodResults.results instanceof Promise) {
    return Promise.resolve(methodResults.results)
      .catch(error => {
        return resolveData(
          snapFile,
          snap,
          fullSnapshotName,
          {
            thrownError: error,
            results: null
          },
          jestContext,
          snapshots
        );
      })
      .then(methodResults => {
        return resolveData(
          snapFile,
          snap,
          fullSnapshotName,
          {
            results: methodResults
          },
          jestContext,
          snapshots
        );
      });
  }

  return resolveData(
    snapFile,
    snap,
    fullSnapshotName,
    methodResults,
    jestContext,
    snapshots
  );
}

function resolveData(
  snapFile: string,
  snap: any,
  fullSnapshotName: string,
  methodResults: SlapshotDataFormat,
  jestContext: any,
  snapshots: Snapshot
) {
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

        ${process.env.SLAPSHOT_RERUN_MESSAGE ||
          "Please re-run Jest with the --updateSnapshot flag AND the env var SLAPSHOT_ONLINE=true"}.`.replace(
          new RegExp("        ", "g"),
          ""
        )
      );
    }

    return returnValues(methodResults);
  }

  snapshots[fullSnapshotName] = safeSnapshot(methodResults);

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
  return returnValues(methodResults);
}
