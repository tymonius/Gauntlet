import { describe, expect, it } from 'vitest';
import { buildAllMatchups, buildCoreSave } from '../scripts/generate-tts-core-saves.mjs';

const hosted = Object.freeze({
  gameVersion: 'v-test',
  bySourceFile: {
    'sheets/sheet.png': 'https://example.invalid/sheet.png',
    'backs/military.png': 'https://example.invalid/military-back.png',
    'backs/diplomats.png': 'https://example.invalid/diplomats-back.png',
    'leaders/military-general.png': 'https://example.invalid/general.png',
    'leaders/diplomats-ambassador.png': 'https://example.invalid/ambassador.png',
    'territory-sheets/territories.png': 'https://example.invalid/territories.png',
    'territory-back.png': 'https://example.invalid/territory-back.png',
  },
});

function territory(id, name, cardId) {
  return {
    id,
    name,
    arena: false,
    tts: {
      cardId,
      deckId: 50,
      faceFile: 'territory-sheets/territories.png',
      backFile: 'territory-back.png',
      numWidth: 7,
      numHeight: 4,
    },
  };
}

function starter({ id, name, factionId, leaderName, leaderId, leaderCardId, leaderDeckId, leaderFace, backFile, cardId, territories }) {
  return {
    id,
    name,
    factionId,
    leaderId,
    leader: {
      id: leaderId,
      name: leaderName,
      faction: factionId,
      tts: {
        cardId: leaderCardId,
        deckId: leaderDeckId,
        faceFile: leaderFace,
        backFile,
        numWidth: 1,
        numHeight: 1,
      },
    },
    cardCount: 2,
    back: { file: backFile },
    cards: [{
      id: `${factionId}-card`,
      name: `${name} Card`,
      quantity: 2,
      faction: factionId,
      cost: 1,
      tts: { cardId, deckId: 1, faceFile: 'sheets/sheet.png', numWidth: 10, numHeight: 7 },
    }],
    deckCardIds: [cardId, cardId],
    faceSheets: [{
      deckId: 1,
      faceFile: 'sheets/sheet.png',
      backFile,
      numWidth: 10,
      numHeight: 7,
      backIsHidden: true,
      uniqueBack: false,
    }],
    territories,
    recommendedTerritoryOrder: territories.map((item) => item.id),
  };
}

const blue = starter({
  id: 'military-general-forward-doctrine',
  name: 'Forward Doctrine',
  factionId: 'military',
  leaderName: 'General',
  leaderId: 'general',
  leaderCardId: 10000,
  leaderDeckId: 100,
  leaderFace: 'leaders/military-general.png',
  backFile: 'backs/military.png',
  cardId: 100,
  territories: [territory('t1', 'Blue One', 5000), territory('t2', 'Blue Two', 5001), territory('t3', 'Blue Three', 5002)],
});

const red = starter({
  id: 'diplomats-ambassador-open-channel',
  name: 'Open Channel',
  factionId: 'diplomats',
  leaderName: 'Ambassador',
  leaderId: 'ambassador',
  leaderCardId: 10200,
  leaderDeckId: 102,
  leaderFace: 'leaders/diplomats-ambassador.png',
  backFile: 'backs/diplomats.png',
  cardId: 101,
  territories: [territory('t4', 'Red One', 5003), territory('t5', 'Red Two', 5004), territory('t6', 'Red Three', 5005)],
});

describe('TTS core save generator', () => {
  it('builds real TTS DeckCustom data from starter CardIDs and hosted assets', () => {
    const save = buildCoreSave(blue, red, hosted);
    const decks = save.ObjectStates.filter((object) => object.Name === 'DeckCustom');
    expect(decks).toHaveLength(2);
    expect(decks[0].DeckIDs).toEqual([100, 100]);
    expect(decks[0].ContainedObjects).toHaveLength(2);
    expect(decks[0].CustomDeck['1']).toMatchObject({
      FaceURL: 'https://example.invalid/sheet.png',
      BackURL: 'https://example.invalid/military-back.png',
      NumWidth: 10,
      NumHeight: 7,
      BackIsHidden: true,
      UniqueBack: false,
    });
  });

  it('lays out the six-Territory Gauntlet from each starter recommended order', () => {
    const save = buildCoreSave(blue, red, hosted);
    const territories = save.ObjectStates.filter((object) => object.Description.includes('starts controlled'));
    expect(territories.map((object) => object.Nickname)).toEqual([
      'Blue One', 'Blue Two', 'Blue Three', 'Red One', 'Red Two', 'Red Three',
    ]);
    expect(territories.map((object) => object.Transform.posX)).toEqual([-8.75, -5.25, -1.75, 8.75, 5.25, 1.75]);
    expect(territories.slice(0, 3).every((object) => object.Transform.rotY === 0)).toBe(true);
    expect(territories.slice(3).every((object) => object.Transform.rotY === 180)).toBe(true);
    expect(territories.every((object) => object.SidewaysCard)).toBe(true);
  });

  it('creates two hand zones, Leaders, pawns, dice, and no Lua automation', () => {
    const save = buildCoreSave(blue, red, hosted);
    expect(save.Table).toBe('Table_RPG');
    expect(save.Hands.HandTransforms.map((hand) => hand.Color)).toEqual(['Blue', 'Red']);
    expect(save.ObjectStates.filter((object) => object.Name === 'PlayerPawn')).toHaveLength(2);
    expect(save.ObjectStates.filter((object) => object.Name === 'Die_6')).toHaveLength(2);
    expect(save.ObjectStates.filter((object) => object.Name === 'Card' && object.Description.endsWith('Leader'))).toHaveLength(2);
    expect(save.LuaScript).toBe('');
    expect(save.Note).toContain('Faction supplemental components are not included');
  });

  it('generates every unordered starter pairing including mirror matches without hard-coded starter count', () => {
    const manifest = { gameVersion: 'v-test', decks: [blue, red] };
    const matchups = buildAllMatchups(manifest, hosted);
    expect(matchups).toHaveLength(3);
    expect(matchups.map((matchup) => [matchup.blueStarterId, matchup.redStarterId])).toEqual([
      [blue.id, blue.id],
      [blue.id, red.id],
      [red.id, red.id],
    ]);
  });

  it('fails closed when hosted mappings are missing', () => {
    expect(() => buildCoreSave(blue, red, { gameVersion: 'v-test', bySourceFile: {} }))
      .toThrow(/missing hosted face URL/i);
  });
});
