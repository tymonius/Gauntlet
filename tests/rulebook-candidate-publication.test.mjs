import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { V072_MODULAR_BOOKLETS } from '../packages/rules/publication/v072-modular-booklets.mjs';

const read = (path) => readFile(path, 'utf8');
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

    expect(html.match(/data-rulebook-booklet/g)).toHaveLength(2);
    expect(app).toContain("const CANDIDATE_BOOKLET_BASE_URL = './booklets/v0.7.2/'");
    expect(app).toContain('function updateBookletLinks(mode, documentId = activeCandidateDocument)');
    expect(app).not.toContain('link.hidden = candidate');
    for (const publication of V072_MODULAR_BOOKLETS) {
      expect(app).toContain(`bookletFilename: '${publication.filename}'`);
    }
  });

  it('routes Printable booklet to the document currently displayed', async () => {
    const app = await read('legacy/rulebook-browser/app.js');
    const workflow = await read('.github/workflows/deploy-pages.yml');

    expect(app).toContain('mode === CANDIDATE_MODE ? candidateBookletUrl(documentId) : pdfUrl');
    expect(app).toContain('updateBookletLinks(candidate ? CANDIDATE_MODE : RELEASED_MODE, documentId)');
    expect(app).toContain('if (activeMode === RELEASED_MODE) updateBookletLinks(RELEASED_MODE)');
    expect(app).toContain("printNote.textContent = 'Print double-sided, flip on the short edge, then fold and saddle stitch.'");

    expect(workflow).toContain('Stage current modular Rulebook booklets');
    expect(workflow).toContain('npm install --no-save --package-lock=false pdf-lib');
    expect(workflow).toContain('node scripts/render-v072-dedicated-booklets.mjs');
    expect(workflow).toContain('node scripts/validate-v072-modular-booklets.mjs');
    expect(workflow).toContain('target_root="$SITE_DIR/rulebook/booklets/v0.7.2"');
    expect(workflow).toContain('-dPDFSETTINGS=/printer');
    for (const publication of V072_MODULAR_BOOKLETS) {
      expect(workflow).toContain(publication.filename);
    }
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

  it('renders faction symbols as inset faction-colored masks and avoids bold Georgia for secondary hierarchy', async () => {
    const css = await read('legacy/rulebook-browser/leader-portraits.css');

    expect(css).not.toContain('background-image: var(--publication-faction-symbol)');
    expect(css).toContain('-webkit-mask: var(--publication-faction-symbol) center / 84% 84% no-repeat');
    expect(css).toContain('mask: var(--publication-faction-symbol) center / 84% 84% no-repeat');
    expect(css).toContain('background: var(--candidate-accent, var(--chapter-accent, var(--rulebook-crimson)))');
    expect(css).toContain('.rulebook-content h3,');
    expect(css).toContain('.rulebook-content h4,');
    expect(css).toContain('font-family: var(--rulebook-body);');
  });

  it('keeps browser-only consent and skip controls out of print output', async () => {
    const css = await read('legacy/rulebook-browser/candidate-publication.css');
    expect(css).toMatch(/@media print[\s\S]*\.analytics-consent,[\s\S]*\.skip-link[\s\S]*display: none !important;/);
  });
});
