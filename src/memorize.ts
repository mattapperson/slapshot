import path from "path";
import fs from "fs";
import { Snapshot, SlapshotDataFormat } from "./types";
import { runInOnlineMode, shouldUpdateSnapshot } from "./utils";
import { safeSnapshot } from "./safeSnapshot";
import { loadSnaps } from "./loadSnaps";
import { mkdir } from "./mkdir";
// @ts-ignore
import errorToJSON from "utils-error-to-json";
// @ts-ignore
import hydrateError from "utils-error-reviver";

const testMap: any = {};

function returnValues(value: SlapshotDataFormat) {
  if (value.thrownError) {
    throw JSON.parse(value.thrownError, hydrateError);
  } else {
    return value.results;
  }
}

type ValidationCallback = (liveData: any, snapshottedData: any) => void;
type ValidationOptions = boolean | ValidationCallback;

export function memorize<ReturnedData = any>(
  snapshotName: string,
  method: () => Promise<ReturnedData> | ReturnedData,
  {
    pure = true,
    validateSnapshot = false
  }: { pure?: boolean; validateSnapshot?: ValidationOptions } = {}
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
  const testPath = jestContext.testPath
    .split(".")
    .slice(0, -1)
    .join(".");
  const basename = `${path.basename(testPath)}.slap_snap`;
  const snapFile = path.resolve(
    testPath,
    "..",
    "__memorize_snapshots__",
    basename
  );

  let snapshots: Snapshot = {};

  if (fs.existsSync(snapFile)) {
    snapshots = loadSnaps(snapFile);
  }
  const snapshot = snapshots[fullSnapshotName];
  const snap = snapshot || ({} as Snapshot);

  if (!shouldUpdateSnapshot() && !runInOnlineMode() && !snapshot) {
    throw new Error(
      `Missing snapshot
    - Method snapshot name: ${fullSnapshotName}
    - In snapshot file: ${basename}
    - Test file: ${testPath}

    ${process.env.SLAPSHOT_RERUN_MESSAGE ||
      "Please re-run Jest with the --updateSnapshot flag AND the env var SLAPSHOT_ONLINE=true"}.`.replace(
        new RegExp("        ", "g"),
        ""
      )
    );
  }

  if (!runInOnlineMode()) {
    return returnValues(safeSnapshot(snap, false));
  }

  let methodResults: SlapshotDataFormat = { results: null, thrownError: null };
  try {
    methodResults.results = method();
  } catch (e) {
    methodResults.thrownError = JSON.stringify(errorToJSON(e));
  }

  if (methodResults.results instanceof Promise) {
    return Promise.resolve(methodResults.results)
      .catch(error => {
        return resolveData(
          snapFile,
          snap,
          fullSnapshotName,
          {
            thrownError: JSON.stringify(errorToJSON(error)),
            results: null
          },
          jestContext,
          validateSnapshot
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
          validateSnapshot
        );
      });
  }

  return resolveData(
    snapFile,
    snap,
    fullSnapshotName,
    methodResults,
    jestContext,
    validateSnapshot
  );
}

function resolveData(
  snapFile: string,
  snap: any,
  fullSnapshotName: string,
  methodResults: SlapshotDataFormat,
  jestContext: any,
  validateSnapshot: ValidationOptions
) {
  if (!shouldUpdateSnapshot() && runInOnlineMode()) {
    let snapDataToCompare = snap;

    if (validateSnapshot && typeof validateSnapshot === "function") {
      validateSnapshot(methodResults, snapDataToCompare);
    } else {
      if (typeof snapDataToCompare === "object") {
        snapDataToCompare = JSON.stringify(snapDataToCompare);
      }

      let methodResultsToCompare: any = methodResults;
      if (typeof methodResultsToCompare === "object") {
        methodResultsToCompare = JSON.stringify(methodResultsToCompare);
      }

      if (
        (snap.results || snap.thrownError) &&
        methodResultsToCompare !== snapDataToCompare
      ) {
        const defaultWarning = `[Warning] Integration test result does not match the memorized snap file:
        - Method snapshot name: ${fullSnapshotName}
        - Test file: ${jestContext.testPath
          .split(".")
          .slice(0, -1)
          .join(".")}
        - Live result: ${methodResultsToCompare}
        - Existing Snap: ${snapDataToCompare}
  
        ${process.env.SLAPSHOT_RERUN_MESSAGE ||
          "Please re-run Jest with the --updateSnapshot flag AND the env var SLAPSHOT_ONLINE=true"}.`.replace(
          new RegExp("          ", "g"),
          ""
        );

        if (!validateSnapshot) {
          console.warn(defaultWarning);
        } else if (typeof validateSnapshot === "boolean") {
          throw new Error(defaultWarning);
        }
      }
    }

    return returnValues(methodResults);
  }

  const newSnap = `\nexports['${fullSnapshotName}'] = ${JSON.stringify(
    safeSnapshot(methodResults),
    null,
    2
  )}\n`;

  mkdir(snapFile);
  fs.writeFileSync(snapFile, newSnap, {
    flag: "a"
  });
  return returnValues(methodResults);
}
