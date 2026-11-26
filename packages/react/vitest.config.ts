import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

export default defineProject({
  resolve: {
    // Test against core's source so `vitest` works without building first.
    alias: {
      '@razorpay-js/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    name: 'react',
    environment: 'jsdom',
    restoreMocks: true,
  },
});
