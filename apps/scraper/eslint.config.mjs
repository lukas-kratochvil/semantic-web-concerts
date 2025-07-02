import baseConfig from "@semantic-web-concerts/eslint-config/base";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig(
  ...baseConfig,
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
  }
);
