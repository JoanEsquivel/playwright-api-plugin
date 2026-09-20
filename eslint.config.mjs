// Architecture rules are enforced here so every tool (Claude Code, Copilot, Cursor, CI) gets the same gate.
import { defineConfig } from 'eslint/config';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

const SPEC_FILES = ['tests/**/*.ts'];
const ACTION_LAYERS = ['api/**/*.ts'];

const NO_LEADING_SLASH_PATH = {
  selector: "CallExpression[callee.property.name=/^(get|post|put|patch|delete|head|fetch)$/] > :matches(Literal[value=/^\\u002F/], TemplateLiteral[quasis.0.value.raw=/^\\u002F/]):first-child",
  message: "Request paths must not start with '/': a leading slash drops the API_BASE_URL path prefix (/api). Use 'auth/login'.",
};

/** `@/` maps to the repo root (tsconfig `paths`). `./sibling` stays allowed; climbing with `../` does not. */
const NO_PARENT_IMPORTS = {
  regex: '^\\.\\./',
  message: "Do not climb directories with '../'. Import across folders through the alias: '@/api/schemas/auth.schema'.",
};

export default defineConfig([
  {
    ignores: ['node_modules/**', 'test-results/**', 'playwright-report/**', 'blob-report/**', '.claude/**'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { '@typescript-eslint/no-floating-promises': 'error' },
  },
  { files: ['**/*.mjs'], ...tseslint.configs.disableTypeChecked },
  {
    files: ['**/*.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': ['error', { patterns: [NO_PARENT_IMPORTS] }] },
  },

  // ---- Specs: Playwright rules + import/credential gates ----
  { files: SPEC_FILES, ...playwright.configs['flat/recommended'] },
  {
    files: SPEC_FILES,
    rules: {
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/expect-expect': ['error', { assertFunctionNames: ['expect'] }],
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [{
          name: '@playwright/test',
          message: 'Spec files import { test, expect } from the fixtures index, never from @playwright/test.',
          allowTypeImports: true,
        }],
        patterns: [NO_PARENT_IMPORTS],
      }],
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.property.name=/^(login|register)$/] > Literal[value=/.+/]",
          message: 'Never hard-code credentials. Read them from utils/env or generate them at runtime.',
        },
        {
          selector: "CallExpression[callee.property.name=/^(login|register)$/] > ObjectExpression > Property > Literal[value=/.+/]",
          message: 'Never hard-code credentials. Read them from utils/env or generate them at runtime.',
        },
      ],
    },
  },

  // ---- Action layer: no assertions, prefix-safe paths ----
  {
    files: ACTION_LAYERS,
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [{
          name: '@playwright/test',
          importNames: ['expect'],
          message: 'Assertions live in specs. API clients only send requests.',
        }],
        patterns: [NO_PARENT_IMPORTS],
      }],
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.name='expect'], CallExpression[callee.object.name='expect']",
          message: 'No assertions in API clients or schemas. Return the raw APIResponse and assert in the spec.',
        },
        NO_LEADING_SLASH_PATH,
      ],
    },
  },

  // ---- Fixtures also send requests: same prefix-safe paths ----
  { files: ['fixtures/**/*.ts'], rules: { 'no-restricted-syntax': ['error', NO_LEADING_SLASH_PATH] } },
]);
