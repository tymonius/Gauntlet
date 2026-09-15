import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const factionIds = ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition'];

describe('active rules publication routes', () => {
  it('publishes all active rule surfaces from maintained package sources', async () => {
    const routes = JSON.parse(await read('apps/rules/routes.json'));

    expect(routes.playerGuide).toEqual({
      publicPath: '/rules/player-guide/',
      source: 'packages/rules/player-guide/player-guide.md',
      status: 'active',
    });
    expect(routes.comprehensiveRules).toEqual({
      publicPath: '/rules/comprehensive/',
      source: 'packages/rules/comprehensive/comprehensive-rules.md',
      status: 'active',
    });

    for (const id of factionIds) {
      expect(routes.factionGuides[id].status).toBe('active');
      expect(routes.factionGuides[id].publicPath).toBe(`/rules/factions/${id}/`);
      expect(routes.factionGuides[id].source).toBe(`packages/rules/faction-guides/${id}.md`);
    }
  });

  it('stages maintained Markdown at stable /rules/sources paths', async () => {
    const boundary = JSON.parse(await read('config/publication-boundary.json'));
    const published = new Map(boundary.materializedFiles.map((entry) => [entry.source, entry.publicPath]));

    expect(published.get('packages/rules/player-guide/player-guide.md')).toBe('/rules/sources/player-guide.md');
    expect(published.get('packages/rules/comprehensive/comprehensive-rules.md')).toBe('/rules/sources/comprehensive-rules.md');
    for (const id of factionIds) {
      expect(published.get(`packages/rules/faction-guides/${id}.md`)).toBe(`/rules/sources/factions/${id}.md`);
    }
  });

  it('keeps active readers indexable and independent of repository source layout', async () => {
    const player = await read('apps/rules/player-guide/index.html');
    const comprehensive = await read('apps/rules/comprehensive/index.html');
    const sharedReader = await read('apps/rules/reader.js');
    const factionReader = await read('apps/rules/factions/guide.js');

    expect(player).toContain('data-rules-source="/rules/sources/player-guide.md"');
    expect(player).not.toContain('noindex');
    expect(player).toContain('href="/rules/card-anatomy.css"');
    expect(player).toContain('src="/rules/card-anatomy.js"');
    expect(player).not.toContain('/rulebook/');
    expect(comprehensive).toContain('data-rules-source="/rules/sources/comprehensive-rules.md"');
    expect(comprehensive).not.toContain('noindex');
    expect(sharedReader).toContain("from '/rules/markdown.js'");
    expect(sharedReader).not.toContain("from '/rulebook/");
    expect(factionReader).toContain('/rules/sources/factions/');
    expect(factionReader).toContain("from '/rules/markdown.js'");
    expect(factionReader).not.toContain("from '/rulebook/");

    for (const id of factionIds) {
      const html = await read(`apps/rules/factions/${id}/index.html`);
      expect(html).not.toContain('noindex');
      expect(html).not.toMatch(/draft guide/i);
      expect(html).toContain('href="/rules/player-guide/"');
    }
  });

  it('keeps the new architecture available in parallel while v0.7.1 remains the released Browser Rulebook surface', async () => {
    const hub = await read('apps/rules/index.html');
    expect(hub).toContain('href="/rules/player-guide/"');
    expect(hub).toContain('href="/rules/factions/"');
    expect(hub).toContain('href="/rules/comprehensive/"');
    expect(hub).toContain('href="/rules-arbiter/"');
    expect(hub).toContain('href="/rulebook/"');
    expect(hub).toContain('v0.7.1 remains the public release until the v0.7.2 cutover.');
    expect(hub).toContain('switch between Released v0.7.1 and the current release candidate');
    expect(hub).toContain('href="/releases/v0.7.1/Gauntlet_v0.7.1_Rulebook_Booklet.pdf"');
    expect(hub).not.toContain('The monolithic Browser Rulebook has been retired.');
  });

  it('retains print-friendly reader contracts', async () => {
    const readerCss = await read('apps/rules/reader.css');
    const factionCss = await read('apps/rules/factions/guide.css');
    expect(readerCss).toContain('@media print');
    expect(factionCss).toContain('@media print');
  });

  it('removes draft status from the maintained active Guide sources', async () => {
    const playerGuide = await read('packages/rules/player-guide/player-guide.md');
    expect(playerGuide).not.toMatch(/^> \*\*Draft\.\*\*/m);

    for (const id of factionIds) {
      const guide = await read(`packages/rules/faction-guides/${id}.md`);
      expect(guide).not.toMatch(/^> \*\*Draft\.\*\*/m);
    }
  });
});
