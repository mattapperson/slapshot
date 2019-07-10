import path from "path";
import fs from "fs";
import { Snapshot } from "./types";
import { runInOnlineMode, shouldUpdateSnapshot } from "./utils";
import { safeSnapshot } from "./safeSnapshot";
import { loadSnaps } from "./loadSnaps";
import { mkdir } from "./mkdir";

export const memorize = async <ReturnedData = any>(
  snapshotName: string,
  method: () => Promise<ReturnedData> | ReturnedData
): Promise<ReturnedData> => {
  const callStack = (new Error().stack || "").split("\n")[1].split(/\s/);
  const stackLine = callStack[callStack.length - 1].replace(/[()]/, "");
  const callingFile = stackLine.substring(stackLine.indexOf(":"), -1);

  const basename = `${path.basename(callingFile)}.snap`;
  const snapFile = path.resolve(
    callingFile,
    "..",
    "__memorize_snapshots__",
    basename
  );

  let snapshots: Snapshot = {};

  if (fs.existsSync(snapFile)) {
    snapshots = loadSnaps(snapFile);
  }

  const { results: snap } = snapshots[snapshotName] || ({} as Snapshot);

  if (snap && !shouldUpdateSnapshot() && !runInOnlineMode()) {
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

    if (methodResultsToCompare !== snapDataToCompare) {
      console.log(
        `[Warning] Intigration test result does not match the memorized snap file:
        - Method snapshot name: ${snapshotName}
        - Test file: ${callingFile}

        Please re-run Jest with the --updateSnapshot flag.`.replace(
          new RegExp("        ", "g"),
          ""
        )
      );
    }

    return Promise.resolve(methodResults);
  }

  snapshots[snapshotName] = {
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
};
