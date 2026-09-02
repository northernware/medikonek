import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Emitted by `prisma contract emit` and `prisma migration plan` — artefacts,
    // not sources, and the contract types are regenerated on every emit.
    "src/prisma/contract.d.ts",
    "migrations/snapshots/**",
  ]),
  {
    rules: {
      // A leading underscore marks a binding destructured only to discard it —
      // the pattern the server actions use to strip fields before a write.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);

export default eslintConfig;
