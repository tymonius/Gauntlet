import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  V072_BOOKLET_HERO_WOODCUTS,
  V072_BOOKLET_MANIFEST,
  V072_BOOKLET_OUTPUT_ROOT,
  V072_BOOKLET_RELEASE_VERSION,
  V072_MODULAR_BOOKLETS,
  v072BookletImposition,
} from '../packages/rules/publication/v072-modular-booklets.mjs';

const expected = [
  ['player-guide', 'Gauntlet_v0.7.2_Player_Guide_Booklet.pdf'],
  ['military', 'Gauntlet_v0.7.2_Military_Guide_Booklet.pdf'],
  ['diplomats', 'Gauntlet_v0.7.2_Diplomats_Guide_Booklet.pdf'],
  ['financiers', 'Gauntlet_v0.7.2_Financiers_Guide_Booklet.pdf'],
  ['intelligence', 'Gauntlet_v0.7.2_Intelligence_Guide_Booklet.pdf'],
  ['mystics', 'Gauntlet_v0.7.2_Mystics_Guide_Booklet.pdf'],
  ['inquisition', 'Gauntlet_v0.7.2_Inquisition_Guide_Booklet.pdf'],
  ['complete-rules', 'Gauntlet_v0.7.2_Complete_Rules_Booklet.pdf'],
];

describe('v0.7.2 modular booklet pipeline', () => {
  it('defines exactly the eight required publication booklets', () => {
    expect(V072_BOOKLET_RELEASE_VERSION).toBe('v0.7.2');
    expect(V072_BOOKLET_OUTPUT_ROOT).toBe('artifacts/rules-booklets/v0.7.2');
    expect(V072_BOOKLET_MANIFEST).toBe('Gauntlet_v0.7.2_Modular_Rules_Manifest.json');
    expect(V072_MODULAR_BOOKLETS.map(({ id, filename }) => [id, filename])).toEqual(expected);
    expect(new Set(V072_MODULAR_BOOKLETS.map(publication => publication.source)).size).toBe(8);
  });

  it('uses the approved hero woodcut compositions for semantic padding pages', () => {
    expect(V072_BOOKLET_HERO_WOODCUTS).toHaveLength(4);
    expect(V072_BOOKLET_HERO_WOODCUTS.map(hero => hero.source)).toEqual([
      'images/woodcuts/hero compositions/hero 1.png',
      'images/woodcuts/hero compositions/hero 2.png',
      'images/woodcuts/hero compositions/hero 3.png',
      'images/woodcuts/hero compositions/hero 4.png',
    ]);
    expect(V072_BOOKLET_HERO_WOODCUTS.every(hero => hero.publicUrl.startsWith('/images/woodcuts/hero compositions/'))).toBe(true);
  });

  it('uses standard saddle-stitch imposition order', () => {
    expect(v072BookletImposition(4, 0)).toEqual({ front: [4, 1], back: [2, 3] });
    expect(v072BookletImposition(8, 0)).toEqual({ front: [8, 1], back: [2, 7] });
    expect(v072BookletImposition(8, 1)).toEqual({ front: [6, 3], back: [4, 5] });
    expect(() => v072BookletImposition(6, 0)).toThrow(/multiple of four/i);
  });

  it('uses the approved v0.7.1 production design instead of inventing a parallel booklet style', async () => {
    const adapter = await readFile('scripts/render-v072-dedicated-booklets.mjs', 'utf8');
    const renderer = await readFile('scripts/render-v072-modular-booklets.mjs', 'utf8');
    const html = await readFile('apps/rules/booklet/index.html', 'utf8');
    const css = await readFile('apps/rules/booklet/booklet.css', 'utf8');
    const parityCss = await readFile('apps/rules/booklet/v071-parity.css', 'utf8');
    const componentsCss = await readFile('apps/rules/booklet/v071-components.css', 'utf8');
    const v071PublicationCss = await readFile('apps/rules/booklet/v071-publication.css', 'utf8');
    const client = await readFile('apps/rules/booklet/booklet.js', 'utf8');
    const validator = await readFile('scripts/validate-v072-modular-booklets.mjs', 'utf8');
    const workflow = await readFile('.github/workflows/build-v072-modular-booklets.yml', 'utf8');

    expect(renderer).toContain('/rulebook/?rules=candidate&doc=');
    expect(adapter).toContain("'/rulebook/booklet/?doc='");
    expect(adapter).toContain("'displayHeaderFooter: false,'");
    expect(adapter).toContain("'preferCSSPageSize: true,'");
    expect(adapter).toContain("top: '0'");
    expect(adapter).toContain('Fixed-page booklet composition already owns pagination');
    expect(adapter).toContain('approved PR #357 publication template');

    expect(html).toContain('data-booklet-pages');
    expect(html).toContain('https://use.typekit.net/vgm6nwi.css');
    expect(html).toContain('family=Inter');
    expect(html).toContain('./v071-parity.css');
    expect(html).toContain('./v071-components.css');
    expect(html).toContain('./v071-publication.css');
    expect(html.indexOf('./v071-parity.css')).toBeGreaterThan(html.indexOf('./booklet.css'));
    expect(html.indexOf('./v071-components.css')).toBeGreaterThan(html.indexOf('./v071-parity.css'));
    expect(html.indexOf('./v071-publication.css')).toBeGreaterThan(html.indexOf('./v071-components.css'));
    expect(html).not.toContain('Start</');
    expect(html).not.toContain('Playtest</');

    /* The compositor shell must not become a second publication design. */
    expect(css).toContain('this file is NOT the publication design authority');
    expect(css).toContain('genuinely new modular-only surfaces');
    expect(css).toContain('@page { size: 5.5in 8.5in; margin: 0; }');
    expect(css).toContain('.booklet-card-anatomy-guide');
    expect(css).toContain('.booklet-arcane-example');
    expect(css).toContain('.digital-tool img');
    expect(css).not.toContain('width: 3.25in');
    expect(css).not.toContain('height: 3.25in');

    /* PR #357 + v0.7.1 production tokens and page geometry. */
    expect(parityCss).toContain('DESIGN CONTRACT');
    expect(parityCss).toContain('approved production Rulebook is the visual authority');
    expect(parityCss).toContain('PR #357');
    expect(parityCss).toContain('rulebook-production/production.css');
    expect(parityCss).toContain('rulebook-production/publication-corrections.css');
    expect(parityCss).toContain('--paper: #f5f2ea');
    expect(parityCss).toContain('--paper-deep: #e7e3da');
    expect(parityCss).toContain('--body: "adobe-caslon-pro"');
    expect(parityCss).toContain('--heritage: "p22-1722-pro"');
    expect(parityCss).toContain('--flavor: "p22-declaration-pro"');
    expect(parityCss).toContain('--ui: Inter');
    expect(parityCss).toContain('padding: .44in .46in .46in .58in');
    expect(parityCss).toContain('padding: .44in .58in .46in .46in');
    expect(parityCss).toContain('font-size: 9pt');

    /* Running furniture, contents, and chapter hierarchy inherit production. */
    expect(parityCss).toContain('bottom: .235in');
    expect(parityCss).toContain('grid-template-columns: 14px 1fr auto');
    expect(parityCss).toContain('grid-template-columns: 42px minmax(0, 1fr)');
    expect(parityCss).toContain('font-variant-numeric: lining-nums tabular-nums');
    expect(parityCss).toContain('font-size: 27pt');
    expect(parityCss).toContain('font-size: 34pt');
    expect(parityCss).toContain('font-size: 42pt');

    /* Artwork and Leader treatment match the old physical publication scale. */
    expect(parityCss).toContain('contrast(1.32) brightness(1.12)');
    expect(parityCss).toContain('width: 1.87in');
    expect(parityCss).toContain('max-height: 2.4in');
    expect(parityCss).toContain('border-bottom: 2px solid #333');
    expect(parityCss).toContain('.faction-symbol-badge');
    expect(parityCss).toContain('display: none !important');

    /* Existing component families are direct old-production adaptations too. */
    expect(componentsCss).toContain('direct selector adaptations of the approved PR #357 proof system');
    expect(componentsCss).toContain('.glance-grid');
    expect(componentsCss).toContain('.victory-band');
    expect(componentsCss).toContain('.battle-step');
    expect(componentsCss).toContain('.ability-strip');
    expect(componentsCss).toContain('grid-template-columns: 1.02fr 1.32fr');
    expect(componentsCss).toContain('.destination-grid');
    expect(componentsCss).toContain('.timing-table');
    expect(componentsCss).toContain('.colophon-block');

    /* Back cover is the approved PR #357 geometry, not a new compact design. */
    expect(parityCss).toContain('.back-cover .page-inner');
    expect(parityCss).toContain('padding: .48in');
    expect(parityCss).toContain('min-height: 2.12in');
    expect(parityCss).toContain('margin: -.48in -.48in .42in');
    expect(parityCss).toContain('padding: .44in .48in .34in');
    expect(parityCss).toContain('font-size: 25pt');

    /* Preserve final production watermark placement without relying on external masks. */
    expect(v071PublicationCss).toContain('.faction-page-watermark');
    expect(v071PublicationCss).toContain('opacity: .09');
    expect(v071PublicationCss).toContain('width: 3.9in');
    expect(v071PublicationCss).toContain('right: -.62in');
    expect(v071PublicationCss).toContain('left: -.62in');
    expect(v071PublicationCss).not.toContain('mask-image: var(--booklet-symbol)');

    /* Only genuinely new surfaces keep purpose-built modular composition. */
    expect(parityCss).toContain('genuinely new instructional surfaces');
    expect(parityCss).toContain('.booklet-card-frame');
    expect(parityCss).toContain('width: 2.02in');
    expect(parityCss).toContain('height: 2.83in');
    expect(parityCss).toContain('.booklet-arcane-frame');
    expect(parityCss).toContain('transform: none');

    expect(client).toContain('createPage');
    expect(client).toContain('newContinuationPage');
    expect(client).toContain('buildCardAnatomyBlock');
    expect(client).toContain("symbolMark.className = 'faction-overview-symbol booklet-inline-faction-symbol'");
    expect(client).toContain("block.className = 'booklet-faction-overview'");
    expect(client).toContain("if (node.matches?.('ul, ol')) break;");
    expect(client).toContain('hydrateFactionSymbols');
    expect(client).toContain('addFactionWatermarkPlaceholders');
    expect(css).toContain('.booklet-faction-overview');
    expect(css).toContain('.faction-overview-symbol');
    expect(css).not.toContain('.faction-overview-heading::before');
    expect(client).toContain('paginateLeaderSection');
    expect(client).toContain('appendHeadingAndFollower');
    expect(client).toContain('waitForFrames');
    expect(client).toContain('ensurePublicationFonts');
    // Verify the publication compositor keeps explicit card-render constants without
    // naming released card ids in this regression file. The v0.7.0 behavior audit
    // intentionally scans tests for card ids as behavioral evidence; publication
    // tests must not masquerade as gameplay regression coverage.
    expect(client).toMatch(/const CARD_ANATOMY_CARD_ID = '[^']+';/);
    expect(client).toMatch(/const ARCANE_CARD_ID = '[^']+';/);
    expect(client).toContain('card-print-render.html?fit=production&card=${CARD_ANATOMY_CARD_ID}');
    expect(client).toContain('card-print-render.html?fit=production&card=${ARCANE_CARD_ID}');
    expect(client).toContain('const fillerCount = (4 - (logicalPageCount % 4)) % 4;');
    expect(client).toContain('composePublication');
    expect(client).toContain('balancedFillerSectionIndexes');
    expect(client).toContain('resetPublicationPages');
    expect(client).toContain("if (fillerCount > 0 && !ordered[1]?.classList.contains('woodcut-page'))");
    expect(client).toContain('Booklet filler pages may not appear back to back.');
    expect(client).toContain('rebuild from the source so every content page is');
    expect(client).toContain("document.body.dataset.bookletReady = 'true'");
    expect(client).toContain("document.body.dataset.rulesetMode = 'candidate'");

    expect(renderer).toContain("width: '5.5in'");
    expect(renderer).toContain("height: '8.5in'");
    expect(renderer).toContain('LETTER_LANDSCAPE');
    expect(validator).toContain("await import('pdf-lib')");
    expect(validator).toContain('paddedPages % 4');
    expect(workflow).toContain('Render all eight modular booklets');
    expect(workflow).toContain('render-v072-dedicated-booklets.mjs');
    expect(workflow).toContain('Browser Rulebook chrome leaked');
    // Split the fallback font name so this publication test is not mistaken for
    // regression evidence for the released card whose name is the same word.
    expect(workflow).toContain(['DejaVuSans', 'Libera' + 'tionSans'].join('|'));
    expect(workflow).toContain('Inter was not embedded');
    expect(workflow).toContain('pdffonts');
    expect(workflow).toContain('pdftoppm');
    expect(workflow).toContain('pdftotext');
    expect(workflow).toContain('upload-artifact@v4');
  });
});
