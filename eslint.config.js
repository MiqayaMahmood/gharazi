const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettier = require('eslint-config-prettier');
const nextPlugin = require('@next/eslint-plugin-next');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'apps/web/.next/**', 'apps/web/next-env.d.ts'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettier.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error'
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-html-link-for-pages': 'off',
    },
    settings: {
      next: {
        rootDir: ['apps/web'],
      },
    },
  },
];
