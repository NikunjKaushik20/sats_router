import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["scripts/**/*.ts", "paper/**/*.ts"],
    rules: {
      /** Reproducibility / analysis scripts parse loose JSON and CSV; strict `any` bans add noise without helping the app. */
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Bundled / generated — not maintained as first-party TS
    "mcp-server.cjs",
    "mcp-launcher.js",
    // Historical runs / copies
    "archive/**",
    "results/**",
  ]),
]);

export default eslintConfig;
