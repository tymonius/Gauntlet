import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const factionIds = ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition'];

describe('Browser Rulebook candidate publication', () => {
  it('keeps released v0.7.1 and exposes the modular candidate set in one shell', async () => {
    const html = await read('legacy/rulebook-browser/index.html');
    const app = await read('legacy/rulebook-browser/app.js');

    expect(html).toContain('data-ruleset="released"');
    expect(html).toContain('data-ruleset="candidate"');
    expect(html).toContain('data-candidate-document-switch');
    expect(html).toContain('<option value="player-guide">Player\'s Guide</option>');
    expect(html).toContain('<option value="complete-rules">Complete Rules</option>');
    for (const id of factionIds) expect(html).toContain(`<option value="${id}">`);

    expect(app).toContain("const DEFAULT_CANDIDATE_DOCUMENT = 'player-guide'");
    expect(app).toContain("url.searchParams.set('rules', CANDIDATE_MODE)");
    expect(app).toContain("url.searchParams.set('doc', normalizedDocument)");
    expect(app).toContain("sourceUrl: './sources/player-guide.md'");
    expect(app).toContain("sourceUrl: './sources/complete-rules.md'");
    for (const id of factionIds) expect(app).toContain(`sourceUrl: './sources/factions/${id}.md'`);
  });

  it('materializes all candidate documents beneath /rulebook/', async () => {
    const boundary = JSON.parse(await read('config/publication-boundary.json'));
    const aliases = new Map(boundary.materializedFiles.map((entry) => [entry.publicPath, entry.source]));

    expect(aliases.get('/rulebook/sources/player-guide.md')).toBe('packages/rules/player-guide/player-guide.md');
    expect(aliases.get('/rulebook/sources/complete-rules.md')).toBe('packages/rules/comprehensive/comprehensive-rules.md');
    for (const id of factionIds) {
      expect(aliases.get(`/rulebook/sources/factions/${id}.md`)).toBe(`packages/rules/faction-guides/${id}.md`);
    }
  });

  it('does not present the released Arbiter as candidate-aware before corpus cutover', async () => {
    const app = await read('legacy/rulebook-browser/app.js');
    expect(app).toContain('The current production Rules Arbiter remains bound to released v0.7.1');
    expect(app).toContain('rulesAssistantButton.hidden = candidate');
  });
});
