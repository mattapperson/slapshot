import { runInOnlineMode } from "./utils";

export const callWhenOnline = async (block: () => any) => {
  let jestContext: any;
  // @ts-ignore
  expect().__slapshot__hack__context(context => (jestContext = context));

  if (
    (process.env.SHOULD_UPDATE_SNAPSHOTS === undefined &&
      jestContext.shouldUpdateSnapshot) ||
    (process.env.SHOULD_UPDATE_SNAPSHOTS === "true" && runInOnlineMode()) ||
    runInOnlineMode()
  ) {
    await block();
  }
};
