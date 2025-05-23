import js from "@eslint/js";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import tsParser from "@typescript-eslint/parser";
import pluginNext from "@next/eslint-plugin-next";
import jestPlugin from "eslint-plugin-jest";

export default [
  {
    ignores: [
      "**/.next/",
      "node_modules/",
      "public/",
      "prisma/",
      "*.md",
      ".env",
      "*.d.ts",
      "*.config.{ts,mjs}",
      ".idea/",
      ".vscode/",
      "coverage/",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
        process: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: reactPlugin,
      "@next/next": pluginNext,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-undef": "error",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      "jest/no-disabled-tests": "warn",
      "jest/valid-expect": "error",
    },
  },
];
