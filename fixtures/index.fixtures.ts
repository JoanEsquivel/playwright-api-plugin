import { expect as baseExpect, mergeTests } from '@playwright/test';
import { z } from 'zod';
import { apiFixture } from './api.fixtures';

/** Single import point for every spec: `import { test, expect } from '@/fixtures/index.fixtures'`. */
export const test = mergeTests(apiFixture);

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
