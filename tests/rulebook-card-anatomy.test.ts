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
    expect(anatomy).toContain('heading.before(anatomyMarkup())');
  });

  it('keeps the immutable released v0.6.3 view unchanged', () => {
    expect(anatomy).toContain("const CANDIDATE_MODE = 'candidate';");
    expect(anatomy).toContain('if (mode !== CANDIDATE_MODE) return;');
    expect(anatomy).toContain('removeAnatomy();');
  });

  it('documents the full standard playable-card frame and the Arcane trait mark', () => {
    for (const label of [
      'Card name',
      'Card value',
      'Faction identity',
      'Artwork',
      'Effect heading',
      'Effect text',
      'Reminder',
      'Metadata footer',
      'Arcane trait',
    ]) {
      expect(anatomy).toContain(label);
    }
    expect(anatomy).toContain("its color follows the card's faction identity");
    expect(styles).toContain('.card-anatomy-marker');
    expect(styles).toContain('@media (max-width: 760px)');
  });
});
