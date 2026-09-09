import { defineConfig } from 'vitest/config';

// Diagnostic/archaeology mode: intentionally bypasses the maintained-suite
// exclusions in vitest.config.ts so every discoverable test file is attempted.
// This is not a required green CI surface.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
