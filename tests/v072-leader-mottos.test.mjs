import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const guides = {
  military: ['Forward. Again.', 'We hold. They break.'],
  diplomats: ['Words first. War last.', 'Procedure endures.'],
  financiers: ['Credit closes the distance.', 'Take the ground. Close the deal.'],
  intelligence: ['Know the land before the battle begins.', 'Information never rests. Momentum is the weapon.'],
  mystics: ['Nothing is fixed. Everything can be transformed.', 'The spirits remember what the living abandon.'],
  inquisition: ['We judge. We purge.', 'You ran. I followed.'],
};

describe('v0.7.2 faction and Leader mottos', () => {
  it('restores the twelve released Leader flavor mottos to the faction guides', async () => {
    for (const [faction, mottos] of Object.entries(guides)) {
      const markdown = await readFile(`packages/rules/faction-guides/${faction}.md`, 'utf8');
      for (const motto of mottos) {
        expect(markdown).toContain(`**Motto:** *${motto}*`);
      }
    }
  });

  it('uses P22 Declaration Pro for faction mottos in print and browser publications', async () => {
    const bookletParity = await readFile('apps/rules/booklet/v071-parity.css', 'utf8');
    const browserPublication = await readFile('legacy/rulebook-browser/candidate-publication.css', 'utf8');

    expect(bookletParity).toContain('--flavor: "p22-declaration-pro"');
    expect(bookletParity).toMatch(/\.faction-opener \.faction-claim \{[\s\S]*?font-family: var\(--flavor\);/);
    expect(browserPublication).toMatch(/\.candidate-masthead-claim \{[\s\S]*?font-family: var\(--rulebook-flavor\) !important;/);
  });

  it('places Leader mottos in the identity column and renders the quote in Declaration Pro', async () => {
    const booklet = await readFile('apps/rules/booklet/booklet.js', 'utf8');
    const refinements = await readFile('apps/rules/booklet/publication-layout-refinements.js', 'utf8');
    const bookletCss = await readFile('apps/rules/booklet/v071-final-parity.css', 'utf8');
    const browserLeaders = await readFile('legacy/rulebook-browser/leader-portraits.js', 'utf8');
    const browserCss = await readFile('legacy/rulebook-browser/candidate-publication.css', 'utf8');

    expect(booklet).toContain("clone.classList.add('leader-motto')");
    expect(refinements).toContain("flow?.querySelector(':scope > .leader-motto')");
    expect(refinements).toContain('identity.append(playstyle, motto, ability)');
    expect(bookletCss).toMatch(/\.leader-page \.leader-identity-column \.leader-motto \{[\s\S]*?font-family: var\(--flavor\);/);
    expect(bookletCss).toContain('.leader-page .leader-identity-column .leader-motto em');

    expect(browserLeaders).toContain("motto.classList.add('candidate-leader-motto')");
    expect(browserLeaders).toContain('identity.append(motto)');
    expect(browserCss).toMatch(/\.candidate-leader-identity \.candidate-leader-motto \{[\s\S]*?font-family: var\(--rulebook-flavor\) !important;/);
    expect(browserCss).toContain('.candidate-leader-identity .candidate-leader-motto em');
  });
});
