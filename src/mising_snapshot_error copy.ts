import { getFromJestContext } from "./get_from_jest_context";

export class MismatchSnapshotError extends Error {
    constructor(
        jestData: ReturnType<typeof getFromJestContext>,
        results?: string
    ) {
        const message = `[Warning] Integration test result does not match the memorized snap file:
        - Snapshot name: ${jestData.fullSnapshotName}
        - Test file: ${jestData.testFilePath
            .split(".")
            .slice(0, -1)
            .join(".")}
        - Live result: ${results || "No Results"}
        - Existing Snap: ${jestData.snapshot}
  
        ${process.env.SLAPSHOT_RERUN_MESSAGE ||
            "Please re-run Jest with the env var SLAPSHOT_ONLINE=true"}.`.replace(
            new RegExp("        ", "g"),
            ""
        );
        super(message);
        this.name = "MismatchSnapshotError";
        this.message = message;
    }
}
