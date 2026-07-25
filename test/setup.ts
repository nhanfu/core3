import * as matchers from 'jest-extended';
import { expect, type MockInstance } from 'vitest';
expect.extend(matchers);

// Override toHaveBeenCalledBefore: passes if first was called and second was
// either not called (vacuously first ran before it) or called after.
expect.extend({
  toHaveBeenCalledBefore(first: MockInstance, second: MockInstance) {
    const f = first.mock.invocationCallOrder;
    const s = second.mock.invocationCallOrder;
    if (f.length === 0) {
      return { pass: false, message: () => 'expected first mock to have been called' };
    }
    if (s.length === 0) {
      return { pass: true, message: () => 'expected first mock NOT to have been called before second (second was never called)' };
    }
    const pass = f[0] < s[0];
    return {
      pass,
      message: () => `Expected first mock (order ${f[0]}) to ${pass ? 'not ' : ''}have been called before second (order ${s[0]})`,
    };
  },
});
