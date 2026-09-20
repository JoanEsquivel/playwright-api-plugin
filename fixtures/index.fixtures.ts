import { expect as baseExpect, mergeTests } from '@playwright/test';
import { apiFixture } from './api.fixtures';

/** Single import point for every spec: `import { test, expect } from '@/fixtures/index.fixtures'`. */
export const test = mergeTests(apiFixture);

/** Re-exported so custom matchers can be added here without touching any spec. */
export const expect = baseExpect;
