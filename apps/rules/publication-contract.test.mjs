import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const factionIds = ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition'];

describe('active rules publication routes', () => {
  it('publishes all active rule surfaces from maintained sources', async () => {
    const routes = JSON.parse(await read('apps/rules/routes.json'));

    expect(routes.playerGuide).toEqual({
      publicPath: '/rules/player-guide/',
      source: 'rulebook/player-guide/player-guide.md',
      status: 'active',
    });
    expect(routes.comprehensiveRules).toEqual({
      publicPath: '/rules/comprehensive/',
      source: 'rulebook/comprehensive/comprehensive-rules.md',
      status: 'active',
    });

    for (const id of factionIds) {
      expect(routes.factionGuides[id].status).toBe('active');
      expect(routes.factionGuides[id].publicPath).toBe(`/rules/factions/${id}/`);
      expect(routes.factionGuides[id].source).toBe(`rulebook/faction-guides/${id}.md`);
    }
  });

  it('stages maintained Markdown at stable /rules/sources paths', async () => {
    const boundary = JSON.parse(await read('config/publication-boundary.json'));
    const published = new Map(boundary.materializedFiles.map((entry) => [entry.source, entry.publicPath]));

    expect(published.get('rulebook/player-guide/player-guide.md')).toBe('/rules/sources/player-guide.md');
    expect(published.get('rulebook/comprehensive/comprehensive-rules.md')).toBe('/rules/sources/comprehensive-rules.md');
    for (const id of factionIds) {
      expect(published.get(`rulebook/faction-guides/${id}.md`)).toBe(`/rules/sources/factions/${id}.md`);
    }
  });

  it('keeps active readers indexable and independent of repository source layout', async () => {
    const player = await read('apps/rules/player-guide/index.html');
    const comprehensive = await read('apps/rules/comprehensive/index.html');
    const factionReader = await read('apps/rules/factions/guide.js');

    expect(player).toContain('data-rules-source="/rules/sources/player-guide.md"');
    expect(player).not.toContain('noindex');
    expect(comprehensive).toContain('data-rules-source="/rules/sources/comprehensive-rules.md"');
    expect(comprehensive).not.toContain('noindex');
    expect(factionReader).toContain('/rules/sources/factions/');

    for (const id of factionIds) {
      const html = await read(`apps/rules/factions/${id}/index.html`);
      expect(html).not.toContain('noindex');
      expect(html).not.toMatch(/draft guide/i);
      expect(html).toContain('href="/rules/player-guide/"');
    }
  });

  it('makes the active architecture primary without retiring the legacy Rulebook', async () => {
    const hub = await read('apps/rules/index.html');
    expect(hub).toContain('href="/rules/player-guide/"');
    expect(hub).toContain('href="/rules/factions/"');
    expect(hub).toContain('href="/rules/comprehensive/"');
    expect(hub).toContain('href="/rules-arbiter/"');
    expect(hub).toContain('href="/rulebook/"');
    expect(hub).toMatch(/legacy Rulebook remains available/i);
  });

  it('retains print-friendly reader contracts', async () => {
    const readerCss = await read('apps/rules/reader.css');
    const factionCss = await read('apps/rules/factions/guide.css');
    expect(readerCss).toContain('@media print');
    expect(factionCss).toContain('@media print');
  });

  it('removes draft status from the maintained active Guide sources', async () => {
    const playerGuide = await read('rulebook/player-guide/player-guide.md');
    expect(playerGuide).not.toMatch(/^> \*\*Draft\.\*\*/m);

    for (const id of factionIds) {
      const guide = await read(`rulebook/faction-guides/${id}.md`);
      expect(guide).not.toMatch(/^> \*\*Draft\.\*\*/m);
    }
  });
});
