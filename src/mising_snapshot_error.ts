import { getFromJestContext } from "./get_from_jest_context";

export class MissingSnapshotError extends Error {
    constructor(jestData: ReturnType<typeof getFromJestContext>) {
        const message = `
        Missing snapshot
        - Snapshot name: ${jestData.fullSnapshotName}
        - In snapshot file: ${jestData.testFileName}
        - Test file: ${jestData.testFilePath}
    
        ${process.env.SLAPSHOT_RERUN_MESSAGE ||
            "Please re-run Jest with the env var SLAPSHOT_ONLINE=true"}.`.replace(
            new RegExp("      ", "g"),
            ""
        );
        super(message);
        this.message = message;
        this.name = "MissingSnapshotError";
    }
}
