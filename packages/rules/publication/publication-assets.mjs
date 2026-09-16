export const RULES_PUBLICATION_ASSETS = Object.freeze({
  hero: Object.freeze({
    sourcePath: 'images/woodcuts/hero compositions/hero 1.png',
    publicUrl: '/images/woodcuts/hero compositions/hero 1.png',
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
      leaders: Object.freeze([
        Object.freeze({ name: 'General', sourcePath: 'images/sketches/general.png', publicUrl: '/images/sketches/general.png' }),
        Object.freeze({ name: 'Commandant', sourcePath: 'images/sketches/commandant.png', publicUrl: '/images/sketches/commandant.png' }),
      ]),
    }),
    diplomats: Object.freeze({
      name: 'Diplomats',
      symbol: Object.freeze({ sourcePath: 'images/faction-symbols/diplomats.svg', publicUrl: '/images/faction-symbols/diplomats.svg' }),
      leaders: Object.freeze([
        Object.freeze({ name: 'Ambassador', sourcePath: 'images/sketches/ambassador.png', publicUrl: '/images/sketches/ambassador.png' }),
        Object.freeze({ name: 'Senator', sourcePath: 'images/sketches/senator.png', publicUrl: '/images/sketches/senator.png' }),
      ]),
    }),
    financiers: Object.freeze({
      name: 'Financiers',
      symbol: Object.freeze({ sourcePath: 'images/faction-symbols/financiers.svg', publicUrl: '/images/faction-symbols/financiers.svg' }),
      leaders: Object.freeze([
        Object.freeze({ name: 'Banker', sourcePath: 'images/sketches/banker.png', publicUrl: '/images/sketches/banker.png' }),
        Object.freeze({ name: 'Executive', sourcePath: 'images/sketches/executive.png', publicUrl: '/images/sketches/executive.png' }),
      ]),
    }),
    intelligence: Object.freeze({
      name: 'Intelligence',
      symbol: Object.freeze({ sourcePath: 'images/faction-symbols/intelligence.svg', publicUrl: '/images/faction-symbols/intelligence.svg' }),
      leaders: Object.freeze([
        Object.freeze({ name: 'Ranger', sourcePath: 'images/sketches/ranger.png', publicUrl: '/images/sketches/ranger.png' }),
        Object.freeze({ name: 'Spymaster', sourcePath: 'images/sketches/spymaster.png', publicUrl: '/images/sketches/spymaster.png' }),
      ]),
    }),
    mystics: Object.freeze({
      name: 'Mystics',
      symbol: Object.freeze({ sourcePath: 'images/faction-symbols/mystics.svg', publicUrl: '/images/faction-symbols/mystics.svg' }),
      leaders: Object.freeze([
        Object.freeze({ name: 'Alchemist', sourcePath: 'images/sketches/alchemist.png', publicUrl: '/images/sketches/alchemist.png' }),
        Object.freeze({ name: 'Spirit Walker', sourcePath: 'images/sketches/spirit walker.png', publicUrl: '/images/sketches/spirit walker.png' }),
      ]),
    }),
    inquisition: Object.freeze({
      name: 'Inquisition',
      symbol: Object.freeze({ sourcePath: 'images/faction-symbols/inquisition.svg', publicUrl: '/images/faction-symbols/inquisition.svg' }),
      leaders: Object.freeze([
        Object.freeze({ name: 'Grand Inquisitor', sourcePath: 'images/sketches/grand inquisitor.png', publicUrl: '/images/sketches/grand inquisitor.png' }),
        Object.freeze({ name: 'Witch Hunter', sourcePath: 'images/sketches/witch hunter.png', publicUrl: '/images/sketches/witch hunter.png' }),
      ]),
    }),
  }),
});

export const RULES_PUBLICATION_FACTION_IDS = Object.freeze(Object.keys(RULES_PUBLICATION_ASSETS.factions));
