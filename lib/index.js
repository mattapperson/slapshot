define("utils", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.shouldUpdateSnapshot = () => {
        return ["--updateSnapshot", "-u"].some(d => process.argv.slice(2).includes(d));
    };
    exports.runInOnlineMode = () => {
        return process.env.ONLINE !== undefined && process.env.ONLINE !== "false";
    };
});
define("is_live_block", ["require", "exports", "tslib", "utils"], function (require, exports, tslib_1, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.callWhenOnline = (block) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (utils_1.shouldUpdateSnapshot() || utils_1.runInOnlineMode()) {
            yield block();
        }
    });
});
define("safeSnapshot", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function safeSnapshot(obj, toSnapshot = true) {
        if (typeof obj !== "object") {
            return obj;
        }
        return Object.keys(obj).reduce((safeObject, key) => {
            if (!toSnapshot &&
                safeObject[key] === "[UNMOCKED-UNSNAPSHOTTED-FUNCTION]") {
                safeObject[key] = () => {
                    throw new Error(`${key} can not be called directly. It must first be mocked with or without using memorize.`);
                };
            }
            if (toSnapshot && typeof safeObject[key] === "function") {
                safeObject[key] = "[UNMOCKED-UNSNAPSHOTTED-FUNCTION]";
            }
            if (typeof safeObject[key] === "object") {
                safeObject[key] = safeSnapshot(safeObject[key], toSnapshot);
            }
            return safeObject;
        }, Object.assign({}, obj));
    }
    exports.safeSnapshot = safeSnapshot;
});
define("loadSnaps", ["require", "exports", "tslib", "fs", "vm"], function (require, exports, tslib_2, fs_1, vm_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    fs_1 = tslib_2.__importDefault(fs_1);
    vm_1 = tslib_2.__importDefault(vm_1);
    function loadSnaps(snapshotPath) {
        if (!fs_1.default.existsSync(snapshotPath)) {
            return {};
        }
        const sandbox = {
            exports: {}
        };
        const source = fs_1.default.readFileSync(snapshotPath, "utf8");
        try {
            vm_1.default.runInNewContext(source, sandbox);
            return sandbox.exports;
        }
        catch (e) {
            console.error("Could not load file", snapshotPath);
            console.error(source);
            console.error(e);
            return {};
        }
    }
    exports.loadSnaps = loadSnaps;
});
define("mkdir", ["require", "exports", "tslib", "path", "fs"], function (require, exports, tslib_3, path_1, fs_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    path_1 = tslib_3.__importDefault(path_1);
    fs_2 = tslib_3.__importDefault(fs_2);
    exports.mkdir = (filePath) => {
        var dir = path_1.default.dirname(filePath);
        if (fs_2.default.existsSync(dir))
            return true;
        exports.mkdir(dir);
        fs_2.default.mkdirSync(dir);
    };
});
define("memorize", ["require", "exports", "tslib", "path", "fs", "utils", "safeSnapshot", "loadSnaps", "mkdir"], function (require, exports, tslib_4, path_2, fs_3, utils_2, safeSnapshot_1, loadSnaps_1, mkdir_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    path_2 = tslib_4.__importDefault(path_2);
    fs_3 = tslib_4.__importDefault(fs_3);
    exports.memorize = (snapshotName, method) => tslib_4.__awaiter(this, void 0, void 0, function* () {
        const callStack = (new Error().stack || "").split("\n")[1].split(/\s/);
        const stackLine = callStack[callStack.length - 1].replace(/[()]/, "");
        const callingFile = stackLine.substring(stackLine.indexOf(":"), -1);
        const basename = `${path_2.default.basename(callingFile)}.snap`;
        const snapFile = path_2.default.resolve(callingFile, "..", "__memorize_snapshots__", basename);
        let snapshots = {};
        if (fs_3.default.existsSync(snapFile)) {
            snapshots = loadSnaps_1.loadSnaps(snapFile);
        }
        const { results: snap } = snapshots[snapshotName] || {};
        if (snap && !utils_2.shouldUpdateSnapshot() && !utils_2.runInOnlineMode()) {
            return Promise.resolve(safeSnapshot_1.safeSnapshot(snap, false));
        }
        let methodResults = method();
        if (methodResults instanceof Promise) {
            methodResults = (yield methodResults);
        }
        if (!utils_2.shouldUpdateSnapshot() && utils_2.runInOnlineMode()) {
            let snapDataToCompare = snap;
            if (typeof snapDataToCompare === "object") {
                snapDataToCompare = JSON.stringify(snapDataToCompare);
            }
            let methodResultsToCompare = methodResults;
            if (typeof methodResultsToCompare === "object") {
                methodResultsToCompare = JSON.stringify(methodResultsToCompare);
            }
            if (methodResultsToCompare !== snapDataToCompare) {
                console.log(`[Warning] Intigration test result does not match the memorized snap file:
        - Method snapshot name: ${snapshotName}
        - Test file: ${callingFile}

        Please re-run Jest with the --updateSnapshot flag.`.replace(new RegExp("        ", "g"), ""));
            }
            return Promise.resolve(methodResults);
        }
        snapshots[snapshotName] = {
            results: safeSnapshot_1.safeSnapshot(methodResults)
        };
        const newSnap = Object.keys(snapshots)
            .sort()
            .reduce((acc, key) => {
            return (acc +
                `\nexports['${key}'] = ${JSON.stringify(snapshots[key], null, 2)}\n`);
        }, "");
        mkdir_1.mkdir(snapFile);
        fs_3.default.writeFileSync(snapFile, newSnap);
        return methodResults;
    });
});
define("index", ["require", "exports", "is_live_block", "memorize"], function (require, exports, is_live_block_1, memorize_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = {
        callWhenOnline: is_live_block_1.callWhenOnline,
        memorize: memorize_1.memorize
    };
});
