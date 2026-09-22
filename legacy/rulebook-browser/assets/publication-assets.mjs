export const RULES_PUBLICATION_ASSETS = Object.freeze({
  hero: Object.freeze({
    sourcePath: 'images/woodcuts/hero compositions/hero 1.png',
    publicUrl: '/images/woodcuts/hero compositions/hero 1.png',
  }),
  completeRulesWoodcut: Object.freeze({
    sourcePath: 'images/woodcuts/hero compositions/full.png',
    publicUrl: '/images/woodcuts/hero compositions/full.png',
  }),
  cardAnatomy: Object.freeze({
    browserModule: 'legacy/rulebook-browser/card-anatomy.js',
    playableCardId: 'military-unbroken-ranks',
    arcaneCardId: 'mystics-witchcraft',
  }),
  factions: Object.freeze({
    military: Object.freeze({
      name: 'Military',
      symbol: Object.freeze({ sourcePath: 'images/faction-symbols/military.svg', publicUrl: '/images/faction-symbols/military.svg' }),
      guideWoodcut: Object.freeze({ sourcePath: 'images/woodcuts/factions/military.png', publicUrl: '/images/woodcuts/factions/military.png' }),
      leaders: Object.freeze([
        Object.freeze({ name: 'General', sourcePath: 'images/woodcuts/general.png', publicUrl: '/images/woodcuts/general.png' }),
        Object.freeze({ name: 'Commandant', sourcePath: 'images/woodcuts/commandant.png', publicUrl: '/images/woodcuts/commandant.png' }),
      ]),
    }),
    diplomats: Object.freeze({
      name: 'Diplomats',
      symbol: Object.freeze({ sourcePath: 'images/faction-symbols/diplomats.svg', publicUrl: '/images/faction-symbols/diplomats.svg' }),
      guideWoodcut: Object.freeze({ sourcePath: 'images/woodcuts/factions/diplomats.png', publicUrl: '/images/woodcuts/factions/diplomats.png' }),
      leaders: Object.freeze([
        Object.freeze({ name: 'Ambassador', sourcePath: 'images/woodcuts/ambassador.png', publicUrl: '/images/woodcuts/ambassador.png' }),
        Object.freeze({ name: 'Senator', sourcePath: 'images/woodcuts/senator.png', publicUrl: '/images/woodcuts/senator.png' }),
      ]),
    }),
    financiers: Object.freeze({
      name: 'Financiers',
      symbol: Object.freeze({ sourcePath: 'images/faction-symbols/financiers.svg', publicUrl: '/images/faction-symbols/financiers.svg' }),
      guideWoodcut: Object.freeze({ sourcePath: 'images/woodcuts/factions/financiers.png', publicUrl: '/images/woodcuts/factions/financiers.png' }),
      leaders: Object.freeze([
        Object.freeze({ name: 'Banker', sourcePath: 'images/woodcuts/banker.png', publicUrl: '/images/woodcuts/banker.png' }),
        Object.freeze({ name: 'Executive', sourcePath: 'images/woodcuts/executive.png', publicUrl: '/images/woodcuts/executive.png' }),
      ]),
    }),
    intelligence: Object.freeze({
      name: 'Intelligence',
      symbol: Object.freeze({ sourcePath: 'images/faction-symbols/intelligence.svg', publicUrl: '/images/faction-symbols/intelligence.svg' }),
      guideWoodcut: Object.freeze({ sourcePath: 'images/woodcuts/factions/intelligence.png', publicUrl: '/images/woodcuts/factions/intelligence.png' }),
      leaders: Object.freeze([
        Object.freeze({ name: 'Ranger', sourcePath: 'images/woodcuts/ranger.png', publicUrl: '/images/woodcuts/ranger.png' }),
        Object.freeze({ name: 'Spymaster', sourcePath: 'images/woodcuts/spymaster.png', publicUrl: '/images/woodcuts/spymaster.png' }),
      ]),
    }),
    mystics: Object.freeze({
      name: 'Mystics',
      symbol: Object.freeze({ sourcePath: 'images/faction-symbols/mystics.svg', publicUrl: '/images/faction-symbols/mystics.svg' }),
      guideWoodcut: Object.freeze({ sourcePath: 'images/woodcuts/factions/mystics.png', publicUrl: '/images/woodcuts/factions/mystics.png' }),
      leaders: Object.freeze([
        Object.freeze({ name: 'Alchemist', sourcePath: 'images/woodcuts/alchemist.png', publicUrl: '/images/woodcuts/alchemist.png' }),
        Object.freeze({ name: 'Spirit Walker', sourcePath: 'images/woodcuts/spirit-walker.png', publicUrl: '/images/woodcuts/spirit-walker.png' }),
      ]),
    }),
    inquisition: Object.freeze({
      name: 'Inquisition',
      symbol: Object.freeze({ sourcePath: 'images/faction-symbols/inquisition.svg', publicUrl: '/images/faction-symbols/inquisition.svg' }),
      guideWoodcut: Object.freeze({ sourcePath: 'images/woodcuts/factions/inquisition.png', publicUrl: '/images/woodcuts/factions/inquisition.png' }),
      leaders: Object.freeze([
        Object.freeze({ name: 'Grand Inquisitor', sourcePath: 'images/woodcuts/grand-inquisitor.png', publicUrl: '/images/woodcuts/grand-inquisitor.png' }),
        Object.freeze({ name: 'Witch Hunter', sourcePath: 'images/woodcuts/witch-hunter.png', publicUrl: '/images/woodcuts/witch-hunter.png' }),
      ]),
    }),
  }),
});

export const RULES_PUBLICATION_FACTION_IDS = Object.freeze(Object.keys(RULES_PUBLICATION_ASSETS.factions));
