import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Rules Arbiter v063 compatibility boundary', () => {
  it('archives the historical Worker and certified public corpus together', () => {
    const archived = readdirSync('legacy/rules-assistant/v063');
    expect(archived).toContain('worker-v063.js');
    expect(archived).toContain('v063-public-corpus.js');
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
    expect(corpus).toContain('from "../../../rules-assistant/v063-last-stand-language.js"');
    expect(corpus).toContain('CLEAN_V063_RULEBOOK_SHA256');
    expect(corpus).toContain('CLEAN_V063_CANONICAL_DATA_SHA256');
  });

  it('routes compatibility-source changes through maintained validation/deployment contracts', () => {
    const deploy = read('.github/workflows/deploy-rules-arbiter.yml');
    const language = read('scripts/validate-v063-last-stand-language.mjs');
    const playtest = read('.github/workflows/deploy-playtest-sessions.yml');
    expect(deploy).toContain('"legacy/rules-assistant/v063/**"');
    expect(deploy).toContain('node --check legacy/rules-assistant/v063/worker-v063.js');
    expect(language).toContain("'legacy/rules-assistant/v063/v063-public-corpus.js'");
    expect(playtest).toContain('"legacy/rules-assistant/v063/v063-public-corpus.js"');
  });
});
