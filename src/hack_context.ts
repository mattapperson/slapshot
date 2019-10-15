expect.extend({
  __slapshot__hack__context(_received, fn) {
    fn({
      // @ts-ignore
      assertionCalls: this.assertionCalls,
      // @ts-ignore
      currentTestName: this.currentTestName,
      // @ts-ignore
      testPath: this.testPath,

      snapshotData: (this as any).snapshotState._snapshotData,
      shouldUpdateSnapshot:
        (this as any).snapshotState._updateSnapshot === "all" ||
        (this as any).snapshotState._updateSnapshot === "new",
      addSnapshot: (testName: string, value: string) => {
        // @ts-ignore
        this.snapshotState._addSnapshot(testName, value, { isInline: false });
      }
    });
    return { pass: true, message: () => "expected the slapshot hack to work" };
  }
});
