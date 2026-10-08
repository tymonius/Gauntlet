import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Rules Arbiter v0.7.0 compatibility source boundary', () => {
  it('archives v0.7.0 implementation source outside the current backend root', () => {
    expect(existsSync('legacy/rules-assistant/v070/worker-v070.js')).toBe(true);
    expect(existsSync('legacy/rules-assistant/v070/v070-public-corpus.js')).toBe(true);
  });

  it('preserves live compatibility routing through the current Worker entry', () => {
    const entry = read('rules-assistant/worker-entry.js');
    expect(entry).toContain('import v070Worker from "../legacy/rules-assistant/v070/worker-v070.js";');
    expect(entry).toContain('url.pathname === "/api/v070/rules"');
    expect(entry).toContain('url.pathname === "/api/v070/health"');
    expect(entry).toContain('requestedVersion === "v0.7.0"');
  });

  it('keeps historical source dependent only on maintained shared runtime and frozen v0.7.0 release data', () => {
    const worker = read('legacy/rules-assistant/v070/worker-v070.js');
    const corpus = read('legacy/rules-assistant/v070/v070-public-corpus.js');
    expect(worker).toContain('from "../../../rules-assistant/local-search.js"');
    expect(worker).toContain('from "./v070-public-corpus.js"');
    expect(corpus).toContain("from '../../../rules-assistant/local-search.js'");
    expect(corpus).toContain("V070_RULEBOOK_SOURCE_PATH = 'releases/v0.7.0/Gauntlet_v0.7.0_Rulebook.md'");
    expect(corpus).toContain("V070_CANONICAL_SOURCE_PATH = 'releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json'");
  });

  it('routes legacy compatibility changes through deployment and historical regression', () => {
    const deploy = read('.github/workflows/deploy-rules-arbiter.yml');
    const live = read('.github/workflows/verify-current-live-publication.yml');
    const regression = read('.github/workflows/rules-arbiter-historical-regression.yml');
    expect(deploy).toContain('"legacy/rules-assistant/v070/**"');
    expect(live).toContain("'legacy/rules-assistant/**'");
    expect(live).toContain('legacy/rules-assistant/*.js');
    expect(regression).toContain("'legacy/rules-assistant/**'");
  });
});
