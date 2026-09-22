import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const homepage = readFileSync('index.html', 'utf8');
const styles = readFileSync('homepage-rules-arbiter.css', 'utf8');

describe('homepage Chief Justice rules support block', () => {
  it('presents the Chief Justice as the player-facing rules authority', () => {
    expect(homepage).toContain('<h2>Ask the Chief Justice.</h2>');
    expect(homepage).toContain('<strong>Ask the Chief Justice</strong>');
    expect(homepage).toContain('identifies the controlling rule or distinction');
    expect(homepage).toContain('he issues a provisional ruling so play may continue');
    expect(homepage).toContain('The relevant rulebook and card sources are included with each answer');
    expect(homepage).toContain('falls back to direct canonical source lookup');
    expect(homepage).not.toContain('<h2>Ask the Rules Arbiter.</h2>');
  });

  it('uses the full Chief Justice artwork on the right side of the block', () => {
    const section = homepage.match(/<section id="rules-assistant"[\s\S]*?<\/section>/)?.[0] || '';

    expect(section).toContain('/images/rules-arbiter/chief-justice-rules-arbiter.webp');
    expect(section).not.toContain('chief-justice-rules-arbiter-popup.webp');
    expect(section.indexOf('class="assistant-copy"')).toBeLessThan(section.indexOf('class="assistant-portrait"'));
    expect(styles).toMatch(/\.assistant-section\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(300px,\s*400px\);/);
    expect(styles).toMatch(/\.assistant-portrait\s*\{[\s\S]*order:\s*2;/);
  });

  it('keeps the Chief Justice block usable on narrow screens', () => {
    expect(styles).toMatch(/@media \(max-width:\s*620px\)[\s\S]*\.assistant-section\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
    expect(styles).toMatch(/@media \(max-width:\s*620px\)[\s\S]*\.assistant-copy \.assistant-open\s*\{[\s\S]*width:\s*100%;/);
  });
});
