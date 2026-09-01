import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const contract = currentGame.componentContract;
const copy = readFileSync('card-design/reference-copy/v0.7.0/universal-reference.md', 'utf8');
const referenceRenderer = readFileSync('card-design/reference-card.js', 'utf8');
const ruleColumns = readFileSync('card-design/card-rule-columns.css', 'utf8');
const universalStyles = readFileSync('card-design/universal-reference.css', 'utf8');
const titleWrapStyles = readFileSync('card-design/reference-title-wrap.css', 'utf8');
const gauntletMark = readFileSync('images/Gauntlet.svg', 'utf8');
const ttsRenderer = readFileSync('tts/supplemental-renderer/index.html', 'utf8');
const supplementalGenerator = readFileSync('scripts/generate-tts-supplemental-assets.mjs', 'utf8');
const deckbuilderComponents = readFileSync('deckbuilder/faction-components.js', 'utf8');

const universal = contract.sharedComponents.find((component: Record<string, any>) => component.id === 'universal-reference');

describe('final Universal Reference and reference-title fitting', () => {
  it('keeps the Universal Reference on the ordinary battle sequence rather than teaching Diplomat Terms', () => {
    expect(universal).toMatchObject({
      family: 'reference-card',
      designStatus: 'final',
      productionStatus: 'ready',
      backPolicy: 'twoSided',
      copyMode: 'bespoke',
      deckInclusion: 'every-deck',
    });

    expect(copy).toContain('# Gauntlet v0.7.0 — Universal Reference Copy');
    expect(copy).toContain('### Battle Sequence');
    expect(copy).toContain("When movement enters the opponent's Position, it initiates a battle and immediately enters **Onset**.");
    expect(copy).toContain('1. **Onset**');
    expect(copy).toContain('2. Set **Gambits**.');
    expect(copy).toContain('8. Resolve the **Aftermath**.');
    expect(copy).not.toMatch(/\bpending(?:-|\s+)battle\b/i);
    expect(copy).not.toMatch(/\bTerms\b/);
    expect(copy).not.toMatch(/\bHeartlands?\b/i);
  });

  it('keeps the turn sequence compact and explains Capture only in the dedicated reverse-side section', () => {
    expect(copy).toContain('1. **Capture** — Capture a Territory / Advance Front Line, if applicable.');
    expect(copy).toContain("At the start of your turn, if you occupy an opponent's Territory, rotate that Territory card to face you to capture it.");
    expect(copy).toContain('If doing so would create a non-continuous line of controlled Territories, instead capture the next Territory past your Front Line: **Advance Front Line 1**.');
    expect(copy).toContain('Capture changes control of at most **1 Territory per turn**.');
    expect(copy).not.toContain('Resolve your Capture step');
    expect(copy).not.toContain('If your token is on or beyond the next opponent-controlled Territory beyond your Front Line');
  });

  it('states the baseline reference rules without normally/normal hedge wording', () => {
    expect(copy).toContain('You take **1 Action total per turn**, during either Opening or Denouement. Each phase permits at most **1 Action**, even when you gain Additional Actions.');
    expect(copy).toContain('### Battle Result');
    expect(copy).toContain('During Onset, withdrawal ends the battle sequence: no Gambits, battle result, or Aftermath.');
    expect(copy).toContain('The defender has **Defensive Edge**.');
    expect(copy).not.toMatch(/\bnormal(?:ly)?\b/i);
  });

  it('states surprising exceptions directly instead of narrating obvious non-events', () => {
    expect(copy).toContain('A Last Stand can be forced while you occupy the final Territory, before you capture it.');
    expect(copy).toContain('force them to make a Last Stand with a **new legal Advance beyond the Gauntlet**.');
    expect(copy).toContain('**Occupation** alone does not change control.');
    expect(copy).not.toContain('Additional Actions do not permit');
    expect(copy).not.toContain('No winner or loser');
    expect(copy).not.toContain('No prior control of the final Territory is required');
    expect(copy).not.toContain('unused prior movement cannot carry over');
  });

  it('states both Run the Gauntlet routes with the canonical capture target and an explicitly offensive Last Stand', () => {
    expect(copy).toContain("**Capture the Territory at the opponent's end**, or force the opponent to make a **Last Stand** and win the resulting battle.");
    expect(copy).not.toContain("capturing the opponent's final Territory");
    expect(copy).not.toContain("forcing the opponent's **Last Stand**");
    expect(copy).not.toContain('or winning a **Last Stand**');
  });

  it('shrinks, wraps, then shrinks the wrapped reference-face title before failing', () => {
    expect(universalStyles).toContain('@import url("reference-title-wrap.css")');
    expect(referenceRenderer).toContain('const REFERENCE_TITLE_MIN_PT = 8.4');
    expect(referenceRenderer).toContain('while (horizontallyOverflows() && fontSize > minimumPx');
    expect(referenceRenderer).toContain("card.dataset.referenceTitleWrapped = 'false'");
    expect(referenceRenderer).toContain("card.dataset.referenceTitleWrapped = 'true'");
    expect(referenceRenderer).toContain("title.style.fontSize = ''");
    expect(referenceRenderer).toContain('const wrappedOverflows = () => (');
    expect(referenceRenderer).toContain('while (wrappedOverflows() && fontSize > minimumPx');
    expect(referenceRenderer).toContain('title.scrollHeight > title.clientHeight + 0.5');
    expect(referenceRenderer).toContain("card.dataset.referenceTitleWarning = overflow ? 'true' : 'false'");
    expect(referenceRenderer).toContain('titleWrapped: titleFit.wrapped');

    expect(titleWrapStyles).toContain('[data-reference-title-wrapped="true"]');
    expect(titleWrapStyles).toContain('white-space: normal !important');
    expect(titleWrapStyles).toContain('-webkit-line-clamp: 2');
  });

  it('can load only requested reference records for isolated production renders', () => {
    expect(referenceRenderer).toContain('export async function loadReferenceRecords(componentIds = null)');
    expect(referenceRenderer).toContain('const requestedIds = componentIds == null');
    expect(referenceRenderer).toContain('(!requestedIds || requestedIds.has(component.id))');
    expect(referenceRenderer).toContain('Current-game authority cannot resolve requested reference card(s)');
  });

  it('loads the neutral Universal styling on both review and standalone TTS render surfaces', () => {
    expect(ruleColumns).toContain('@import url("universal-reference.css")');
    expect(universalStyles).toContain('.reference-card[data-component-id="universal-reference"]');
    expect(universalStyles).toContain('neutral-parchment-v2.png');
    expect(ttsRenderer).toContain('/card-design/universal-reference.css');
  });

  it('places the Gauntlet G beside the overline/title like faction emblems and leaves more vertical room for copy', () => {
    expect(gauntletMark).toContain('viewBox="0 0 1871.79 493.58"');
    expect(universalStyles).toContain('grid-template-rows: 0.50in minmax(0, 1fr) 0.18in');
    expect(universalStyles).toContain('grid-template-columns: 0.17in minmax(0, 1fr)');
    expect(universalStyles).toContain('.reference-card[data-component-id="universal-reference"] .reference-card-header::before {\n  grid-column: 2;\n  grid-row: 1;');
    expect(universalStyles).toContain('.reference-card[data-component-id="universal-reference"] .reference-face-title {\n  grid-column: 2;\n  grid-row: 2;');
    expect(universalStyles).toContain('.reference-card[data-component-id="universal-reference"] .reference-type-line {\n  display: contents;');
    expect(universalStyles).toContain('grid-row: 1 / span 2');
    expect(universalStyles).toContain('-webkit-mask-image: url("../images/Gauntlet.svg")');
    expect(universalStyles).toContain('grid-column: 1 / -1');
    expect(universalStyles).toContain('padding-bottom: calc(0.012in * var(--reference-rules-scale))');
    expect(universalStyles).toContain('line-height: 1.08');
  });

  it('keeps the improved list alignment and divider-free Universal body', () => {
    expect(universalStyles).toContain('grid-template-columns: 0.10in minmax(0, 1fr)');
    expect(universalStyles).toContain('text-align: left');
    expect(universalStyles).toContain('grid-template-columns: 0.045in minmax(0, 1fr)');
    expect(universalStyles).toContain('margin-top: 0.019in');
    expect(universalStyles).toContain('.reference-panel + .reference-panel {\n  padding-top: 0;\n  border-top: 0;');
    expect(universalStyles).toContain('.reference-step-list li + li,\n.reference-card[data-component-id="universal-reference"] .reference-option-list li + li {\n  margin-top: calc(0.008in * var(--reference-rules-scale));\n  padding-top: 0;\n  border-top: 0;');
  });

  it('exports bespoke reference faces from their authored headings rather than stale selector lists', () => {
    expect(supplementalGenerator).toContain('function parseBespokeReferenceFace');
    expect(supplementalGenerator).toContain("const parseFace = component.copyMode === 'bespoke' ? parseBespokeReferenceFace : parseReferenceFace;");
    expect(supplementalGenerator).toContain("const faceHeading = `${sideLabel} — ${title}`;");
    expect(supplementalGenerator).toContain("const heading = line.trim().match(/^###\\s+(.+)$/);");
  });

  it('exports and production-prints the ready shared reference instead of leaving it as a placeholder', () => {
    expect(supplementalGenerator).toContain('const sharedSupplementals = (contract.sharedComponents || [])');
    expect(supplementalGenerator).toContain("faction: component.faction || 'neutral'");
    expect(deckbuilderComponents).toContain('const sharedCardComponents = (currentGame.sharedComponents || []).filter(component => (');
    expect(deckbuilderComponents).toContain('component.cardLike && component.deckInclusion === "every-deck"');
    expect(deckbuilderComponents).toContain('const components = [...sharedCardComponents, ...factionComponents]');
    expect(deckbuilderComponents).toContain('.map(component => projectPrintComponent(component, currentGame))');
  });
});
