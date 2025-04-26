import js from "@eslint/js";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint-define-config";

export default defineConfig({
  ignores: [
    "**/.next/",
    "node_modules/",
    "public/",
    "prisma/",
    ".env",
    "auth.config.ts",
    "auth.ts",
    "next-auth.d.ts",
    "next-env.d.ts",
    "next.config.mjs",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "tsconfig.json",
    "error_log.txt",
    "TODO.md",
    ".vscode/",
    ".idea/",
    "*.md",
  ],
  files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    globals: {
      ...globals.browser,
      ...globals.node,
      React: "readonly",
      process: "readonly",
    },
    parser: tsParser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  plugins: {
    "@typescript-eslint": tseslint,
    react: reactPlugin,
  },
  rules: {
    ...js.configs.recommended.rules,
    ...tseslint.configs.recommended.rules,
    ...reactPlugin.configs.recommended.rules,
    "react/react-in-jsx-scope": "off",
    "no-undef": "error",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
});
