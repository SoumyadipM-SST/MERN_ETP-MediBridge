import js from "@eslint/js";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import importSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
export default 
  { ignores: ["**/node_modules/**", "**/dist/**", ".data/**", ".cache/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    plugins: { "simple-import-sort": importSort },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "simple-import-sort/imports": "error",
      "no-duplicate-imports": "error",
      "no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["frontend/src/**/*.{js,jsx}"],
    plugins: { "react-hooks": hooks, react },
    rules: {
      ...hooks.configs.recommended.rules,
      "react/jsx-uses-vars": "error",
    },
  },
];
