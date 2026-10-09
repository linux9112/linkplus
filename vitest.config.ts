import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['default'],
  },
});
