import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, configDefaults } from 'vitest/config';

type QuarantineGroup = {
  id: string;
  reason: string;
  files: string[];
};

type QuarantineManifest = {
  schemaVersion: number;
  groups: QuarantineGroup[];
};

const manifestUrl = new URL('./tests/vitest-quarantine.json', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as QuarantineManifest;
const quarantinedFiles = manifest.groups.flatMap((group) => group.files);
const gameDataPackageRoot = fileURLToPath(new URL('./packages/game-data/', import.meta.url)).replace(/\\/g, '/');

const duplicates = quarantinedFiles.filter((file, index) => quarantinedFiles.indexOf(file) !== index);
if (duplicates.length) {
  throw new Error(`Duplicate Vitest quarantine entries: ${[...new Set(duplicates)].join(', ')}`);
}

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^(?:\.\.\/)+game-data\/(.+)$/,
        replacement: `${gameDataPackageRoot}/$1`,
      },
      {
        find: /^\/game-data\/(.+)$/,
        replacement: `${gameDataPackageRoot}/$1`,
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    // `vitest run` is the maintained regression surface. Historical engine
    // snapshots live under legacy/, while known stale non-legacy tests remain
    // explicitly visible in tests/vitest-quarantine.json until rehabilitated
    // or formally retired.
    exclude: [
      ...configDefaults.exclude,
      'legacy/**',
      ...quarantinedFiles,
    ],
  },
});
