import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ROOT,
  cleanPublicFilePath,
  loadPublicationBoundary,
  materializePublicFiles,
  sourcePathForPublicPath,
} from '../scripts/publication-boundary.mjs';

const temporaryRoots = [];

afterEach(() => {
  while (temporaryRoots.length) {
    fs.rmSync(temporaryRoots.pop(), { recursive: true, force: true });
  }
});

describe('materialized public files', () => {
  it('stages a public compatibility filename from one canonical source file', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gauntlet-public-file-source-'));
    const destinationRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gauntlet-public-file-stage-'));
    temporaryRoots.push(root, destinationRoot);

    const source = path.join(root, 'images', 'canonical.png');
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, 'canonical-image');

    const contract = {
      materializedFiles: [
        {
          source: 'images/canonical.png',
          publicPath: '/images/legacy.png',
          kind: 'retired-compatibility',
        },
      ],
    };

    expect(materializePublicFiles({ root, destinationRoot, contract })).toEqual(['/images/legacy.png']);
    expect(fs.readFileSync(path.join(destinationRoot, 'images', 'legacy.png'), 'utf8')).toBe('canonical-image');
    expect(sourcePathForPublicPath(contract, '/images/legacy.png')).toBe('images/canonical.png');
  });

  it('rejects route-like and traversal file aliases', () => {
    expect(() => cleanPublicFilePath('/images/legacy/')).toThrow(/name a file/);
    expect(() => cleanPublicFilePath('/images/../secret.png')).toThrow(/unsupported traversal/);
  });

  it('preserves the historical hero URL without retaining a duplicate source binary', () => {
    const contract = loadPublicationBoundary();
    const alias = contract.materializedFiles.find(
      (entry) => entry.publicPath === '/images/sketches/hero sketch.png',
    );

    expect(alias).toEqual({
      source: 'images/sketches/hero-sketches/hero sketch.png',
      publicPath: '/images/sketches/hero sketch.png',
      kind: 'retired-compatibility',
    });
    expect(fs.existsSync(path.join(ROOT, alias.source))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'images/sketches/hero sketch.png'))).toBe(false);
    expect(sourcePathForPublicPath(contract, '/images/sketches/hero%20sketch.png')).toBe(alias.source);
  });
});
