import js from '@eslint/js';
import tsParser from "@typescript-eslint/parser";
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from "eslint-plugin-import-x";
import turbo from 'eslint-plugin-turbo';
import ts from 'typescript-eslint';

export default ts.config(
  {
    ignores: ['public', 'assets', 'node_modules', 'build', 'dist']
  },
  turbo.configs['flat/recommended'],
  prettier,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  js.configs.recommended,
  ts.configs.recommended,
  ts.configs.stylistic,
  {
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      "import-x/extensions": ["error", "ignorePackages", {
        ts: "never",
        tsx: "never",
      }],
      "import-x/no-extraneous-dependencies": "error",
      "import-x/order": ["error", {
        "newlines-between": "never",
        alphabetize: {
          order: "asc",
        },
        groups: ["builtin", "external", "internal", "parent", "sibling"],
      }],
      "import-x/prefer-default-export": "off",
      "operator-linebreak": ["error", "before"],
      "no-multiple-empty-lines": "error",
      "no-plusplus": "off",
      "no-shadow": "off",
      "no-use-before-define": "off",
      "no-void": ["error", {
        "allowAsStatement": true,
      }],
      "@typescript-eslint/consistent-type-definitions": "off", // let developer decide whether to use 'type' or 'interface'
      "@typescript-eslint/no-floating-promises": ["error"],
      "@typescript-eslint/no-namespace": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        args: "all",
        argsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-use-before-define": "error",
      "@typescript-eslint/no-shadow": "error",
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver(),
        importX.createNodeResolver(),
      ],
    },
  }
);
