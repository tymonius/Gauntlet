import { access, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadCurrentGameAuthority } from '../scripts/current-game-authority.mjs';
import {
  RULES_PUBLICATION_ASSETS,
  RULES_PUBLICATION_FACTION_IDS,
} from '../legacy/rulebook-browser/assets/publication-assets.mjs';

const expectedFactionIds = ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition'];

describe('Browser Rulebook publication assets', () => {
  it('binds faction symbols, paired guide woodcuts, and approved Leader woodcuts to current authority', async () => {
    const authority = await loadCurrentGameAuthority();
    expect([...RULES_PUBLICATION_FACTION_IDS].sort()).toEqual([...expectedFactionIds].sort());

    for (const factionId of expectedFactionIds) {
      const asset = RULES_PUBLICATION_ASSETS.factions[factionId];
      expect(asset).toBeTruthy();

      const authorityLeaders = authority.leaders
        .filter(leader => leader.faction === factionId)
        .map(leader => leader.name)
        .sort();
      const publicationLeaders = asset.leaders.map(leader => leader.name).sort();
      expect(publicationLeaders).toEqual(authorityLeaders);

      await access(asset.symbol.sourcePath);
      expect(asset.guideWoodcut.sourcePath).toBe(`images/woodcuts/factions/${factionId}.png`);
      expect(asset.guideWoodcut.publicUrl).toBe(`/images/woodcuts/factions/${factionId}.png`);
      await access(asset.guideWoodcut.sourcePath);

      for (const leader of asset.leaders) {
        expect(leader.sourcePath.startsWith('images/woodcuts/')).toBe(true);
        expect(leader.publicUrl.startsWith('/images/woodcuts/')).toBe(true);
        expect(leader.sourcePath).not.toContain('/sketches/');
        await access(leader.sourcePath);
      }
    }
  });

  it('reuses existing production card-anatomy and hero assets', async () => {
    await access(RULES_PUBLICATION_ASSETS.hero.sourcePath);
    expect(RULES_PUBLICATION_ASSETS.completeRulesWoodcut.sourcePath).toBe('images/woodcuts/hero compositions/full.png');
    expect(RULES_PUBLICATION_ASSETS.completeRulesWoodcut.publicUrl).toBe('/images/woodcuts/hero compositions/full.png');
    await access(RULES_PUBLICATION_ASSETS.completeRulesWoodcut.sourcePath);
    await access(RULES_PUBLICATION_ASSETS.cardAnatomy.browserModule);

    const anatomy = await readFile(RULES_PUBLICATION_ASSETS.cardAnatomy.browserModule, 'utf8');
    expect(anatomy).toContain(`const CARD_ID = '${RULES_PUBLICATION_ASSETS.cardAnatomy.playableCardId}'`);
    expect(anatomy).toContain(`const ARCANE_CARD_ID = '${RULES_PUBLICATION_ASSETS.cardAnatomy.arcaneCardId}'`);
  });

  it('uses document-specific header woodcuts for the released modular rules library', async () => {
    const script = await readFile('legacy/rulebook-browser/leader-portraits.js', 'utf8');

    expect(script).toContain("import { RULES_PUBLICATION_ASSETS } from './assets/publication-assets.mjs'");
    expect(script).toContain('const DEFAULT_HERO_ART = RULES_PUBLICATION_ASSETS.hero.publicUrl');
    expect(script).toContain('decoratePlayerGuideFactions()');
    expect(script).toContain('decorateCompleteRulesFactions()');
    expect(script).toContain('decorateFactionGuide(documentId)');
    expect(script).toContain('updateHeroArt(mode, documentId)');
    expect(script).toContain("documentId === 'complete-rules'");
    expect(script).toContain('RULES_PUBLICATION_ASSETS.completeRulesWoodcut.publicUrl');
    expect(script).toContain('const faction = RULES_PUBLICATION_ASSETS.factions[documentId]');
    expect(script).toContain("faction?.guideWoodcut?.publicUrl || DEFAULT_HERO_ART");
    expect(script).toContain("document: url.searchParams.get('doc') || 'player-guide'");

    for (const releasedPortrait of [
      '../images/woodcuts/general.png',
      '../images/woodcuts/commandant.png',
      '../images/woodcuts/ambassador.png',
      '../images/woodcuts/senator.png',
      '../images/woodcuts/banker.png',
      '../images/woodcuts/executive.png',
      '../images/woodcuts/ranger.png',
      '../images/woodcuts/spymaster.png',
      '../images/woodcuts/alchemist.png',
      '../images/woodcuts/spirit-walker.png',
      '../images/woodcuts/grand-inquisitor.png',
      '../images/woodcuts/witch-hunter.png',
    ]) {
      expect(script).toContain(releasedPortrait);
    }
  });
});
