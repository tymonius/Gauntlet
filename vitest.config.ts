import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    minWorkers: 1,
    maxWorkers: 1,
    reporters: process.env.GITHUB_ACTIONS
      ? ['default', 'hanging-process']
      : ['default'],
  },
});
