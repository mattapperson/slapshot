import { Json, JsonObject } from "./types";
export const runInOnlineMode = () => {
    return (
        process.env.SLAPSHOT_ONLINE !== undefined &&
        process.env.SLAPSHOT_ONLINE !== "false"
    );
};

export const diff = (left: JsonObject, right: JsonObject) => {
    return (function internalDiff(
        left: JsonObject,
        right: JsonObject,
        recursionDetails: {
            depth: number;
            path: string;
            diffs: Set<string>;
        }
    ) {
        let i, key, keyPath, leftKeys, rightKeys, length, arrayMode;

        let leftTypeof = typeof left;
        let rightTypeof = typeof right;

        // Left part
        if (Array.isArray(left)) {
            arrayMode = true;
            length = left.length;
        } else {
            arrayMode = false;
            leftKeys = Object.keys(left);
            length = leftKeys.length;
        }

        for (i = 0; i < length; i++) {
            key = arrayMode || !leftKeys ? i : leftKeys[i];
            keyPath = `${recursionDetails.path}${
                recursionDetails.depth === 0 ? "" : "."
            }${key}`;

            if (!Object.prototype.hasOwnProperty.call(right, key)) {
                recursionDetails.diffs.add(keyPath);
                continue;
            }

            leftTypeof = typeof left[key];
            rightTypeof = typeof right[key];

            if (leftTypeof !== rightTypeof) {
                recursionDetails.diffs.add(keyPath);

                continue;
            }

            if (leftTypeof === "object" || leftTypeof === "function") {
                // Cleanup the 'null is an object' mess
                if (!left[key]) {
                    if (right[key]) {
                        recursionDetails.diffs.add(keyPath);
                    }
                    continue;
                }

                if (!right[key]) {
                    recursionDetails.diffs.add(keyPath);

                    continue;
                }

                if (Array.isArray(left[key]) && !Array.isArray(right[key])) {
                    recursionDetails.diffs.add(keyPath);

                    continue;
                }

                if (!Array.isArray(left[key]) && Array.isArray(right[key])) {
                    recursionDetails.diffs.add(keyPath);

                    continue;
                }

                internalDiff(
                    left[key] as JsonObject,
                    right[key] as JsonObject,
                    {
                        path: keyPath,
                        depth: recursionDetails.depth + 1,
                        diffs: recursionDetails.diffs,
                    }
                );
                continue;
            }

            if (left[key] !== right[key]) {
                recursionDetails.diffs.add(keyPath);

                continue;
            }
        }

        // Right part
        if (Array.isArray(right)) {
            arrayMode = true;
            length = right.length;
        } else {
            arrayMode = false;
            rightKeys = Object.keys(right);
            length = rightKeys.length;
        }

        for (i = 0; i < length; i++) {
            key = arrayMode || !rightKeys ? i : rightKeys[i];
            keyPath = `${recursionDetails.path}${
                recursionDetails.depth === 0 ? "" : "."
            }${key}`;

            if (!Object.prototype.hasOwnProperty.call(left, key)) {
                recursionDetails.diffs.add(keyPath);

                continue;
            }
        }

        return [...recursionDetails.diffs];
    })(left, right, {
        depth: 0,
        path: "",
        diffs: new Set(),
    });
};

export const get = (
    obj: { [path: string]: any },
    path: string,
    defaultValue?: Json
) => {
    const travel = (regexp: RegExp) =>
        String.prototype.split
            .call(path, regexp)
            .filter(Boolean)
            .reduce(
                (res, key) =>
                    res !== null && res !== undefined ? res[key] : res,
                obj
            );
    const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
    return result === undefined || result === obj ? defaultValue : result;
};
