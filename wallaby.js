module.exports = function() {
  return {
    debug: true,
    files: [
      "tsconfig.json", // <--
      "src/**/*.ts",
      "!/lib/**/*.*",
      "!src/**/*.test.ts"
    ],

    tests: ["src/**/*.test.ts"],

    env: {
      type: "node"
    },

    testFramework: "jest"
  };
};
