import { runInOnlineMode } from "./utils";

export const callWhenOnline = async (block: () => any) => {
    let jestContext: any;
    // @ts-ignore
    expect().__slapshot__hack__context(context => (jestContext = context));

    if (
        (process.env
            .SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS ===
            undefined &&
            jestContext.shouldUpdateSnapshot) ||
        (process.env
            .SLAPSHOT_HACK_BYPASS_JEST_SHOULD_UPDATE_SNAPSHOTS_FOR_TESTS ===
            "true" &&
            runInOnlineMode()) ||
        runInOnlineMode()
    ) {
        await block();
    }
};
