// Architecture rules are enforced here so every tool (Claude Code, Copilot, Cursor, CI) gets the same gate.
import { defineConfig } from 'eslint/config';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

const SPEC_FILES = ['tests/**/*.ts'];
const ACTION_LAYERS = ['pages/**/*.ts', 'api/**/*.ts'];

export default defineConfig([
  {
    ignores: ['node_modules/**', 'test-results/**', 'playwright-report/**', 'blob-report/**', '.playwright-cli/**', '.auth/**', '.claude/**'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { '@typescript-eslint/no-floating-promises': 'error' },
  },
  { files: ['**/*.mjs'], ...tseslint.configs.disableTypeChecked },

  // ---- Specs: Playwright rules + import/goto/credential gates ----
  { files: SPEC_FILES, ...playwright.configs['flat/recommended'] },
  {
    files: SPEC_FILES,
    rules: {
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-networkidle': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/expect-expect': ['error', { assertFunctionNames: ['expect'] }],
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [{
          name: '@playwright/test',
          message: 'Spec files import { test, expect } from the fixtures index, never from @playwright/test.',
          allowTypeImports: true,
        }],
      }],
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.property.name='goto']",
          message: 'Do not call page.goto() in specs. Use <pageName>.load().',
        },
        {
          selector: "CallExpression[callee.property.name=/^(login|submitLoginForm)$/] > Literal[value=/.+/]",
          message: 'Never hard-code credentials. Read them from utils/env or a data file.',
        },
      ],
    },
  },
  { files: ['tests/setup/**/*.ts'], rules: { 'playwright/expect-expect': 'off' } },

  // ---- Action layers: no assertions ----
  {
    files: ACTION_LAYERS,
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [{
          name: '@playwright/test',
          importNames: ['expect'],
          message: 'Assertions live in specs. Page objects and API clients only interact.',
        }],
      }],
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.name='expect'], CallExpression[callee.object.name='expect']",
        message: 'No assertions in page objects or API clients. Use waitFor() guards inside waitLoad() only.',
      }],
    },
  },
]);
