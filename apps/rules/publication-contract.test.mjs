import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

const expectedRedirects = new Map([
  ['/rules/', { source: 'apps/rules/index.html', target: '/rulebook/?rules=candidate&doc=player-guide' }],
  ['/rules/player-guide/', { source: 'apps/rules/player-guide/index.html', target: '/rulebook/?rules=candidate&doc=player-guide' }],
  ['/rules/comprehensive/', { source: 'apps/rules/comprehensive/index.html', target: '/rulebook/?rules=candidate&doc=complete-rules' }],
  ['/rules/factions/', { source: 'apps/rules/factions/index.html', target: '/rulebook/?rules=candidate&doc=player-guide#9-the-six-factions' }],
  ['/rules/factions/military/', { source: 'apps/rules/factions/military/index.html', target: '/rulebook/?rules=candidate&doc=military' }],
  ['/rules/factions/diplomats/', { source: 'apps/rules/factions/diplomats/index.html', target: '/rulebook/?rules=candidate&doc=diplomats' }],
  ['/rules/factions/financiers/', { source: 'apps/rules/factions/financiers/index.html', target: '/rulebook/?rules=candidate&doc=financiers' }],
  ['/rules/factions/intelligence/', { source: 'apps/rules/factions/intelligence/index.html', target: '/rulebook/?rules=candidate&doc=intelligence' }],
  ['/rules/factions/mystics/', { source: 'apps/rules/factions/mystics/index.html', target: '/rulebook/?rules=candidate&doc=mystics' }],
  ['/rules/factions/inquisition/', { source: 'apps/rules/factions/inquisition/index.html', target: '/rulebook/?rules=candidate&doc=inquisition' }],
]);

describe('rules compatibility routes', () => {
  it('declares /rulebook/ as the primary rules publication and /rules/ as compatibility-only', async () => {
    const routes = JSON.parse(await read('apps/rules/routes.json'));
    expect(routes.schemaVersion).toBe(2);
    expect(routes.status).toBe('compatibility-only');
    expect(routes.primaryRulesRoute).toBe('/rulebook/');
    expect(new Map(Object.entries(routes.redirects))).toEqual(
      new Map([...expectedRedirects].map(([route, value]) => [route, value.target])),
    );
  });

  it('redirects every former standalone reader into the integrated Browser Rulebook', async () => {
    for (const [route, { source, target }] of expectedRedirects) {
      const html = await read(source);
      const escapedTarget = target.replaceAll('&', '&amp;');
      expect(html, route).toContain('name="robots" content="noindex, follow"');
      expect(html, route).toContain(`content="0; url=${escapedTarget}"`);
      expect(html, route).toContain(`href="https://gauntlet.run${escapedTarget}"`);
      expect(html, route).toContain("window.location.replace(target);");
      expect(html, route).not.toContain('data-rules-source=');
      expect(html, route).not.toContain('data-guide-source=');
    }
  });

  it('publishes /rules/ only as a compatibility route and no longer stages duplicate rule sources there', async () => {
    const boundary = JSON.parse(await read('config/publication-boundary.json'));
    expect(boundary.materializedRoutes.find((entry) => entry.publicPath === '/rulebook/')).toMatchObject({
      source: 'legacy/rulebook-browser',
      kind: 'release-transition-app',
    });
    expect(boundary.materializedRoutes.find((entry) => entry.publicPath === '/rules/')).toMatchObject({
      source: 'apps/rules',
      kind: 'compatibility-route',
    });
    expect(boundary.materializedFiles.some((entry) => entry.publicPath.startsWith('/rules/sources/'))).toBe(false);
  });

  it('keeps maintained player-facing guide sources active without exposing the old standalone readers', async () => {
    const playerGuide = await read('packages/rules/player-guide/player-guide.md');
    expect(playerGuide).not.toMatch(/^> \*\*Draft\.\*\*/m);
    for (const id of ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
      const guide = await read(`packages/rules/faction-guides/${id}.md`);
      expect(guide).not.toMatch(/^> \*\*Draft\.\*\*/m);
    }
  });
});
