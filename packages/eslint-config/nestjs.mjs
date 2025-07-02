import nestJs from "@darraghor/eslint-plugin-nestjs-typed";
import baseConfig from "./base.mjs";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig(
  ...baseConfig,
  nestJs.configs.flatRecommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      parserOptions: {
        project: "tsconfig.json",
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // "@typescript-eslint/consistent-indexed-object-style": "off", // TODO: errors when linting the 'backend' app (just delete this line after correction)
      // "@typescript-eslint/no-unused-vars": "off", // TODO: errors when linting the 'backend' app (just delete this line after correction)
      "@darraghor/nestjs-typed/injectable-should-be-provided": ["warn", {
        src: ["src/**/*.ts"],
        filterFromPaths: [".spec.", ".test."],
      }],

      "@darraghor/nestjs-typed/validated-non-primitive-property-needs-type-decorator": ["error", {
        additionalTypeDecorators: ["Field", "HideField"],
      }],
    },
  }
);
