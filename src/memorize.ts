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
  const callStackLines = (new Error().stack || "").split("\n");
  const mappedLines: string[] = callStackLines
    .map(function(line) {
      if (line.match(/^\s*[-]{4,}$/)) {
        return line;
      }

      var lineMatch = line.match(
        /at (?:(.+)\s+\()?(?:(.+?):(\d+)(?::(\d+))?|([^)]+))\)?/
      );
      if (!lineMatch) {
        return;
      }
      return lineMatch[2] || null;
    })
    .filter(function(line) {
      return (
        !!line &&
        !line.includes("node_modules") &&
        !line.includes("/lib/memorize.js")
      );
    }) as string[];

  const callingFile = mappedLines[0];

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

  if (!shouldUpdateSnapshot() && !runInOnlineMode() && !snap) {
    throw new Error(
      `Missing snaport
    - Method snapshot name: ${snapshotName}
    - Test file: ${callingFile}

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
      console.log(
        `[Warning] Intigration test result does not match the memorized snap file:
        - Method snapshot name: ${snapshotName}
        - Test file: ${callingFile}

        Please re-run Jest with the --updateSnapshot flag AND the env var SLAPSHOT_ONLINE=true.`.replace(
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
