import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as archivedNormalizer from '../legacy/rules-assistant/v063/v063-last-stand-language.js';
import * as publicNormalizer from '../rules-assistant/v063-last-stand-language.js';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Rules Arbiter v063 compatibility boundary', () => {
  it('archives the historical Worker and certified public corpus together', () => {
    const archived = readdirSync('legacy/rules-assistant/v063');
    expect(archived).toContain('worker-v063.js');
    expect(archived).toContain('v063-public-corpus.js');
    expect(archived).toContain('v063-last-stand-language.js');
    expect(readdirSync('rules-assistant')).not.toContain('worker-v063.js');
    expect(readdirSync('rules-assistant')).not.toContain('v063-public-corpus.js');
  });

  it('preserves versioned routing through the current Worker entry', () => {
    const entry = read('rules-assistant/worker-entry.js');
    expect(entry).toContain('import v063Worker from "../legacy/rules-assistant/v063/worker-v063.js";');
    expect(entry).toContain('url.pathname === "/api/v063/rules"');
    expect(entry).toContain('url.pathname === "/api/v063/health"');
    expect(entry).toContain('requestedVersion === "v0.6.3"');
  });

  it('keeps the archived implementation coupled to maintained shared retrieval and its existing publication normalizer', () => {
    const worker = read('legacy/rules-assistant/v063/worker-v063.js');
    const corpus = read('legacy/rules-assistant/v063/v063-public-corpus.js');
    expect(worker).toContain('from "../../../rules-assistant/local-search.js"');
    expect(worker).toContain('from "./v063-public-corpus.js"');
    expect(corpus).toContain('from "../../../rules-assistant/local-search.js"');
    expect(corpus).toContain('from "./v063-last-stand-language.js"');
    expect(corpus).toContain('CLEAN_V063_RULEBOOK_SHA256');
    expect(corpus).toContain('CLEAN_V063_CANONICAL_DATA_SHA256');
  });

  it('keeps exactly one archived v063 normalizer implementation behind the former import path', () => {
    const shim = read('rules-assistant/v063-last-stand-language.js');
    const source = read('legacy/rules-assistant/v063/v063-last-stand-language.js');
    expect(shim).toContain("from '../legacy/rules-assistant/v063/v063-last-stand-language.js'");
    expect(shim).not.toContain('function replaceLiteral');
    expect(source).toContain("from '../../../rulebook/player-facing/corrections.js'");
    expect(Object.keys(publicNormalizer).sort()).toEqual(Object.keys(archivedNormalizer).sort());
    for (const name of Object.keys(archivedNormalizer)) {
      expect(publicNormalizer[name as keyof typeof publicNormalizer]).toBe(
        archivedNormalizer[name as keyof typeof archivedNormalizer],
      );
    }
    expect(publicNormalizer.normalizeV063LastStandOnlyText("initiate a Last Stand"))
      .toBe(archivedNormalizer.normalizeV063LastStandOnlyText("initiate a Last Stand"));
  });

  it('routes compatibility-source changes through maintained validation/deployment contracts', () => {
    const deploy = read('.github/workflows/deploy-rules-arbiter.yml');
    const language = read('scripts/validate-v063-last-stand-language.mjs');
    const playtest = read('.github/workflows/deploy-playtest-sessions.yml');
    expect(deploy).toContain('"legacy/rules-assistant/v063/**"');
    expect(deploy).toContain('node --check legacy/rules-assistant/v063/worker-v063.js');
    expect(language).toContain("'legacy/rules-assistant/v063/v063-public-corpus.js'");
    expect(playtest).toContain('"legacy/rules-assistant/v063/v063-public-corpus.js"');
    expect(deploy).toContain('node --check legacy/rules-assistant/v063/v063-last-stand-language.js');
    expect(read('.github/workflows/verify-current-live-publication.yml')).toContain('legacy/rules-assistant/v063/*.js');
    expect(read('.github/workflows/build-clean-v063-booklet.yml')).toContain('/legacy/rules-assistant/v063/v063-last-stand-language.js');
    expect(read('.github/workflows/current-publication-contract.yml')).toContain('/legacy/rules-assistant/v063/v063-last-stand-language.js');
  });
});
