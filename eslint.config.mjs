import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    files:['**/*.d.ts'],
    plugins:{
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions:{
      parser: tseslint.parser,
    },
    rules: {
      '@typescript-eslint/no-empty-interface': 'off',
    },
  },
];

export default eslintConfig;
