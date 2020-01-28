// @ts-ignore
import hydrateError from "utils-error-reviver";
// @ts-ignore
import errorToJSON from "utils-error-to-json";
import { getFromJestContext } from "./get_from_jest_context";
import { MissingSnapshotError } from "./mising_snapshot_error";
import { MismatchSnapshotError } from "./mising_snapshot_error copy";
import { safeSnapshot } from "./safeSnapshot";
import {
    MemorizeOptions,
    SlapshotDataFormat,
    ValidationOptions
} from "./types";
import { runInOnlineMode } from "./utils";

export function memorize<ReturnedData = any>(
    snapshotName: string,
    fnToSnapshot: () => Promise<ReturnedData> | ReturnedData,
    { pure = true, validateSnapshot = false }: MemorizeOptions = {}
): Promise<ReturnedData> | ReturnedData {
    const jestData = getFromJestContext(snapshotName, pure);

    if (
        !jestData.shouldForceUpdateSnapshot &&
        !runInOnlineMode() &&
        !jestData.snapshot
    ) {
        throw new MissingSnapshotError(jestData);
    }

    if (!runInOnlineMode()) {
        jestData.markSnapAsUsed(jestData.fullSnapshotName);
        return returnValues(safeSnapshot(jestData.snapshot, false));
    }

    let methodResults: SlapshotDataFormat = {
        results: null,
        thrownError: null
    };
    try {
        methodResults.results = fnToSnapshot();
    } catch (e) {
        methodResults.thrownError = JSON.stringify(errorToJSON(e));
    }

    if (methodResults.results instanceof Promise) {
        return Promise.resolve(methodResults.results)
            .catch(error => {
                return resolveData(
                    {
                        thrownError: JSON.stringify(errorToJSON(error)),
                        results: null
                    },
                    jestData,
                    validateSnapshot
                );
            })
            .then(methodResults => {
                return resolveData(
                    {
                        results: methodResults
                    },
                    jestData,
                    validateSnapshot
                );
            });
    }

    return resolveData(methodResults, jestData, validateSnapshot);
}

function resolveData(
    methodResults: SlapshotDataFormat,
    jestData: ReturnType<typeof getFromJestContext>,
    validateSnapshot: ValidationOptions
) {
    let methodResultsStringified;
    if (!jestData.shouldForceUpdateSnapshot && runInOnlineMode()) {
        if (validateSnapshot && typeof validateSnapshot === "function") {
            validateSnapshot(methodResults, jestData.snapshot);
        } else {
            let snapAsString = jestData.snapshot;
            if (typeof jestData.snapshot === "object") {
                snapAsString = JSON.stringify(jestData.snapshot);
            }

            if (typeof methodResults === "object") {
                methodResultsStringified = JSON.stringify(
                    safeSnapshot(methodResults)
                );
            }

            if (
                jestData.snapshot &&
                (jestData.snapshot.results || jestData.snapshot.thrownError) &&
                methodResultsStringified !== snapAsString
            ) {
                const warning = new MismatchSnapshotError(
                    jestData,
                    methodResultsStringified
                );

                if (!validateSnapshot) {
                    console.warn(warning.message);
                } else if (typeof validateSnapshot === "boolean") {
                    throw warning;
                }
            }
        }
        jestData.markSnapAsUsed(jestData.fullSnapshotName);
        return returnValues(methodResults);
    }

    jestData.addSnapshot(
        jestData.fullSnapshotName,
        methodResultsStringified || JSON.stringify(safeSnapshot(methodResults))
    );
    jestData.markSnapAsUsed(jestData.fullSnapshotName);
    return returnValues(methodResults);
}

function returnValues(value: SlapshotDataFormat) {
    if (value.thrownError) {
        throw JSON.parse(value.thrownError, hydrateError);
    } else {
        return value.results;
    }
}
