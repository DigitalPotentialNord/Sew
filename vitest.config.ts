import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/_tests/**/*.test.ts'],
    reporters: 'default',
  },
});
