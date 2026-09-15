import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contract = JSON.parse(readFileSync('config/publication-boundary.json', 'utf8'));
const architecture = JSON.parse(readFileSync('config/repository-architecture.json', 'utf8'));

describe('card-design documentation boundary', () => {
  it('keeps maintained design standards under docs while preserving established public paths', () => {
    const activeCardDesignRoot = ['card', 'design'].join('-');
    const publicCardDesignRoot = `/${activeCardDesignRoot}`;
    const documents = [
      'PARCHMENT_BACKGROUND_MAPPING.md',
      'faction-feature-taxonomy.md',
    ];
    const files = new Map(contract.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));

    for (const document of documents) {
      expect(existsSync(`docs/card-design/${document}`)).toBe(true);
      expect(existsSync(`${activeCardDesignRoot}/${document}`)).toBe(false);
      expect(files.get(`${publicCardDesignRoot}/${document}`)).toBe(`docs/card-design/${document}`);
    }
  });

  it('keeps card-design classified as production tooling rather than documentation ownership', () => {
    expect(architecture.root_directories['card-design'].role).toBe('production_tooling');
    expect(architecture.root_directories.docs.role).toBe('documentation');
    expect(architecture.root_directories['card-design'].note).toContain('docs/card-design/');
    expect(architecture.root_directories.docs.note).toContain('docs/card-design/');
  });
});
