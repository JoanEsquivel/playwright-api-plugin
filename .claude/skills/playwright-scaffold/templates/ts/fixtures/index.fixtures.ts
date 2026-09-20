import { expect as baseExpect, mergeTests } from '@playwright/test';
import { z } from 'zod';
import { pageFixture } from './page.fixtures';
import { e2eFixture } from './e2e.fixtures';
// @api-start
import { apiFixture } from './api.fixtures';
// @api-end

/** Single import point for every spec: `import { test, expect } from '<relative>/fixtures/index.fixtures'`. */
export const test = mergeTests(
  pageFixture,
  e2eFixture,
  // @api-start
  apiFixture,
  // @api-end
);

export const expect = baseExpect.extend({
  /** Asserts a payload matches a zod schema; prints a readable diff on failure. */
  toMatchSchema(received: unknown, schema: z.ZodType) {
    const result = schema.safeParse(received);
    return {
      pass: result.success,
      message: () =>
        result.success
          ? 'Expected payload NOT to match schema'
          : `Payload does not match schema:\n${z.prettifyError(result.error)}`,
    };
  },
});
