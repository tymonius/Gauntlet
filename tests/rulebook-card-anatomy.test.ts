import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const index = read('rulebook/index.html');
const anatomy = read('rulebook/card-anatomy.js');
const currentRulebook = read('rulebook/player-facing/current-rulebook.md');
const currentGame = JSON.parse(read('game-data/current-game.json'));
const styles = read('rulebook/card-anatomy.css');

describe('Browser Rulebook card anatomy guide', () => {
  it('loads the browser enhancement assets while keeping the content in the maintained current Rulebook', () => {
    expect(index).toContain('href="card-anatomy.css"');
    expect(index).toContain('src="card-anatomy.js"');
    expect(currentRulebook).toContain('## Card anatomy');
    expect(currentRulebook).toContain('### Arcane trait mark');
  });

  it('enhances the authored Card Anatomy section with a current production card render', () => {
    expect(anatomy).toContain("const CARD_ID = 'military-unbroken-ranks';");
    expect(anatomy).toContain('card-print-render.html?fit=production&amp;card=${CARD_ID}');
    expect(anatomy).toContain("content?.querySelector('#card-anatomy')");
    expect(anatomy).toContain("content?.querySelector('#printed-card-effects')");
    expect(anatomy).toContain("section.className = 'card-anatomy-guide'");
    expect(anatomy).toContain('transformKey(list)');
  });

  it('keeps print fallbacks separate from the live Browser Rulebook presentation', () => {
    expect(anatomy).toContain('img[alt="Card anatomy diagram"]');
    expect(anatomy).toContain('img[alt="Arcane trait mark example"]');
    expect(anatomy).not.toContain('CARD_ANATOMY_EMBED');
    expect(styles).not.toContain('body.card-anatomy-embed');
    expect(anatomy).toContain('removeEnhancement();');
  });

  it('authors all current standard playable-card elements in the Rulebook source itself', () => {
    for (const label of [
      'Card name',
      'Card value',
      'Faction identity',
      'Artwork',
      'Effect heading',
      'Effect text',
      'Metadata footer',
      'Arcane trait mark',
    ]) {
      expect(currentRulebook).toContain(label);
    }
    expect(currentRulebook).not.toContain('**Reminder**');
    expect(currentRulebook).not.toContain('faction-specific procedure');
    expect(anatomy).not.toContain('marker-reminder');
    expect(anatomy).toContain('data-marker-target="footer" aria-hidden="true">7</span>');
  });

  it('documents every current printed playable-card effect heading', () => {
    const start = currentRulebook.indexOf('## Printed card effects');
    const end = currentRulebook.indexOf('### Arcane symbol', start);
    const section = currentRulebook.slice(start, end);
    const headingRules = currentGame.gameplay.card_rules.effect_headings;
    const documentedHeadings = [
      ...headingRules.ordinary_role_headings,
      ...headingRules.special_or_procedural_headings,
    ];

    for (const heading of headingRules.all_present_headings) {
      expect(documentedHeadings).toContain(heading);
    }
    for (const heading of documentedHeadings) {
      expect(section).toContain(`**${heading}:**`);
    }
  });

  it('uses a card-plus-single-key-column layout instead of splitting the key into narrow columns', () => {
    expect(styles).toContain('grid-template-columns: 19rem minmax(0, 1fr);');
    expect(styles).toContain('.card-anatomy-key');
    expect(styles).toContain('grid-template-columns: minmax(0, 1fr);');
    expect(styles).not.toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(styles).toContain('align-items: start;');
  });

  it('positions callouts from the actual rendered card elements instead of hard-coded vertical guesses', () => {
    expect(anatomy).toContain("name: { selector: '.card-title' }");
    expect(anatomy).toContain("value: { selector: '.value-medallion' }");
    expect(anatomy).toContain("faction: { selector: '.gauntlet-card', ratio: 0.23 }");
    expect(anatomy).toContain("art: { selector: '.card-art' }");
    expect(anatomy).toContain("heading: { selector: '.rule-section h4' }");
    expect(anatomy).toContain("text: { selector: '.rule-section p' }");
    expect(anatomy).toContain("footer: { selector: '.card-footer' }");
    expect(anatomy).toContain('target.getBoundingClientRect()');
    expect(anatomy).toContain("frameDocument.body?.dataset.renderReady !== 'true'");
    expect(anatomy).toContain("section.classList.add('markers-positioned')");
    expect(styles).toContain('.card-anatomy-guide.markers-positioned .card-anatomy-marker');
    expect(styles).toContain('.card-anatomy-marker.marker-faction-edge::after');
    expect(styles).not.toContain('.marker-heading { top:');
    expect(styles).not.toContain('.marker-text { top:');
  });

  it('shows the Arcane trait on a real card with only the cropped bottom edge feathered', () => {
    expect(anatomy).toContain("const ARCANE_CARD_ID = 'mystics-witchcraft';");
    expect(anatomy).toContain('card-print-render.html?fit=production&amp;card=${ARCANE_CARD_ID}');
    expect(currentRulebook).toContain("its color follows the card's faction identity");
    expect(styles).toContain('.card-anatomy-arcane-crop');
    expect(styles).toContain('#000 calc(100% - 0.8rem)');
    expect(styles).toContain('transparent 100%');
    expect(styles).toContain('@media (max-width: 760px)');
  });
});
