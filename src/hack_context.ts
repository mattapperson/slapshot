expect.extend({
  __slapshot__hack__context(_received, fn) {
    fn({
      // @ts-ignore
      assertionCalls: this.assertionCalls,
      // @ts-ignore
      currentTestName: this.currentTestName,
      // @ts-ignore
      testPath: this.testPath
    });
    return { pass: true, message: () => "expected the slapshot hack to work" };
  }
});
