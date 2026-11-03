const globals = require("globals");
const gts = require("gts");

module.exports = [
  {
    ignores: [
      "**/bazel-*",
      "**/coverage/",
      "**/dist/",
      "**/docs/",
      "**/lib/",
      "**/node_modules/",
      "**/public/",
    ],
  },
  ...gts.map((config) => ({
    ...config,
    rules: {
      ...config.rules,

      quotes: ["warn", "double"],
      eqeqeq: ["error", "always"],
    },
  })),
  {
    files: ["e2e/**/*"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: "./e2e/tsconfig.json",
      },
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
