import fs from "fs";
import vm from "vm";
export function loadSnaps(snapshotPath: string) {
  if (!fs.existsSync(snapshotPath)) {
    return {};
  }
  const sandbox = {
    exports: {}
  };
  const source = fs.readFileSync(snapshotPath, "utf8");
  try {
    vm.runInNewContext(source, sandbox);
    return sandbox.exports;
  } catch (e) {
    console.error("Could not load file", snapshotPath);
    console.error(source);
    console.error(e);
    return {};
  }
}
