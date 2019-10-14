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
import { getFromJestContext } from "./get_from_jest_context";

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
  const testData = getFromJestContext(snapshotName, pure);
  let snapshots: Snapshot = {};

  if (fs.existsSync(testData.slapFilePath)) {
    snapshots = loadSnaps(testData.slapFilePath);
  }
  const snapshot = snapshots[testData.fullSnapshotName];
  const snap = snapshot || ({} as Snapshot);

  if (!shouldUpdateSnapshot() && !runInOnlineMode() && !snapshot) {
    throw new Error(
      `Missing snapshot
    - Method snapshot name: ${testData.fullSnapshotName}
    - In snapshot file: ${testData.testFileName}
    - Test file: ${testData.testFilePath}

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
          testData.slapFilePath,
          snap,
          testData.fullSnapshotName,
          {
            thrownError: JSON.stringify(errorToJSON(error)),
            results: null
          },
          testData.testFilePath,
          validateSnapshot
        );
      })
      .then(methodResults => {
        return resolveData(
          testData.slapFilePath,
          snap,
          testData.fullSnapshotName,
          {
            results: methodResults
          },
          testData.testFilePath,
          validateSnapshot
        );
      });
  }

  return resolveData(
    testData.slapFilePath,
    snap,
    testData.fullSnapshotName,
    methodResults,
    testData.testFilePath,
    validateSnapshot
  );
}

function resolveData(
  snapFile: string,
  snap: any,
  fullSnapshotName: string,
  methodResults: SlapshotDataFormat,
  testFilePath: string,
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
        - Test file: ${testFilePath
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

  const newSnapData = `\nexports['${fullSnapshotName}'] = ${JSON.stringify(
    safeSnapshot(methodResults),
    null,
    2
  )}\n`;

  mkdir(snapFile);
  fs.writeFileSync(snapFile, newSnapData, {
    flag: "a"
  });
  return returnValues(methodResults);
}
