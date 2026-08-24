import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const index = read('rulebook/index.html');
const anatomy = read('rulebook/card-anatomy.js');
const styles = read('rulebook/card-anatomy.css');

describe('Browser Rulebook card anatomy guide', () => {
  it('loads the anatomy guide assets from the browser rulebook', () => {
    expect(index).toContain('href="card-anatomy.css"');
    expect(index).toContain('src="card-anatomy.js"');
  });

  it('uses a current production card render and inserts the guide before Printed card effects', () => {
    expect(anatomy).toContain("const CARD_ID = 'military-unbroken-ranks';");
    expect(anatomy).toContain('card-print-render.html?fit=production&amp;card=${CARD_ID}');
    expect(anatomy).toContain("content.querySelector('#printed-card-effects')");
    expect(anatomy).toContain('heading.before(section)');
  });

  it('keeps the immutable released v0.6.3 view unchanged', () => {
    expect(anatomy).toContain("const CANDIDATE_MODE = 'candidate';");
    expect(anatomy).toContain('if (mode !== CANDIDATE_MODE) return;');
    expect(anatomy).toContain('removeAnatomy();');
  });

  it('documents only current standard playable-card elements', () => {
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
      expect(anatomy).toContain(label);
    }
    expect(anatomy).not.toContain('<strong>Reminder</strong>');
    expect(anatomy).not.toContain('marker-reminder');
    expect(anatomy).toContain('data-marker-target="footer" aria-hidden="true">7</span>');
  });

  it('uses a readable two-column card-and-key layout rather than splitting the key into narrow columns', () => {
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
    expect(anatomy).toContain("its color follows the card's faction identity");
    expect(styles).toContain('.card-anatomy-arcane-crop');
    expect(styles).toContain('#000 calc(100% - 0.8rem)');
    expect(styles).toContain('transparent 100%');
    expect(styles).toContain('@media (max-width: 760px)');
  });
});
