import { describe, expect, it } from 'vitest';
import { buildTtsSave } from '../scripts/generate-tts-save.mjs';

const version = 'v0.7.0';
const files = {
  deckFace: 'sheets/cards-01.png',
  standardBack: 'backs/standard.png',
  factionBack: 'backs/military.png',
  leader: 'leaders/military-general.png',
  territories: ['territories/one.png', 'territories/two.png', 'territories/three.png'],
};

const releaseAssets = {
  gameVersion: version,
  releaseTag: version,
  bySourceFile: Object.fromEntries([
    files.deckFace,
    files.standardBack,
    files.factionBack,
    files.leader,
    ...files.territories,
  ].map((file) => [file, `https://example.invalid/${version}/${file}`])),
};

const starterManifest = {
  gameVersion: version,
  decks: [{
    id: 'military-general-test',
    name: 'Military General Test',
    factionId: 'military',
    summary: 'Structural fixture',
    cardCount: 2,
    deckbuildingValue: 2,
    back: { file: files.standardBack },
    leader: {
      name: 'General',
      factionLabel: 'Military',
      tts: {
        cardId: 10000,
        deckId: 100,
        faceFile: files.leader,
        backFile: files.factionBack,
        numWidth: 1,
        numHeight: 1,
      },
    },
    cards: [{
      id: 'test-card',
      name: 'Test Card',
      faction: 'military',
      cost: 1,
      quantity: 2,
      tts: { cardId: 101, deckId: 1 },
    }],
    deckCardIds: [101, 101],
    faceSheets: [{
      deckId: 1,
      faceFile: files.deckFace,
      numWidth: 10,
      numHeight: 7,
    }],
    territories: files.territories.map((faceFile, index) => ({
      id: `territory-${index + 1}`,
      name: `Territory ${index + 1}`,
      arena: false,
      tts: {
        cardId: 20000 + index,
        deckId: 200 + index,
        faceFile,
        backFile: files.standardBack,
        numWidth: 1,
        numHeight: 1,
      },
    })),
    recommendedTerritoryOrder: ['territory-1', 'territory-2', 'territory-3'],
  }],
};

describe('generated TTS table structure', () => {
  const save = buildTtsSave(starterManifest, releaseAssets);

  it('creates exactly the Red and Blue player hand configurations', () => {
    expect(save.Hands.Enable).toBe(true);
    expect(save.Hands.DisableUnused).toBe(true);
    expect(save.Hands.HandTransforms.map((hand) => hand.Color)).toEqual(['Red', 'Blue']);
    expect(save.Hands.HandTransforms[0].Transform.posZ).toBeLessThan(0);
    expect(save.Hands.HandTransforms[1].Transform.posZ).toBeGreaterThan(0);
  });

  it('creates the six center-line Gauntlet snap positions in order', () => {
    expect(save.SnapPoints).toHaveLength(6);
    expect(save.SnapPoints.map((point) => point.Position.x)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(save.SnapPoints.map((point) => point.Position.z)).toEqual([-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]);
  });

  it('keeps player utilities inside the selected faction starter Bag rather than on the table', () => {
    const topLevel = save.ObjectStates;
    expect(topLevel.filter((object) => object.Name === 'Die_6')).toHaveLength(0);
    expect(topLevel.filter((object) => object.Name === 'PlayerPawn')).toHaveLength(0);

    const bag = topLevel.find((object) => object.Name === 'Bag');
    expect(bag).toBeTruthy();
    const die = bag.ContainedObjects.filter((object) => object.Name === 'Die_6');
    const token = bag.ContainedObjects.filter((object) => object.Name === 'PlayerPawn');
    expect(die).toHaveLength(1);
    expect(token).toHaveLength(1);
    expect(die[0].Nickname).toBe('Military Battle Die');
    expect(token[0].Nickname).toBe('Military Player Token');
    expect(die[0].GMNotes).toBe('gauntlet:starter-utility:battle-die:military');
    expect(token[0].GMNotes).toBe('gauntlet:starter-utility:player-token:military');
    expect(die[0].ColorDiffuse).toEqual(bag.ColorDiffuse);
    expect(token[0].ColorDiffuse).toEqual(bag.ColorDiffuse);
  });

  it('builds each starter Bag with one Leader, three sideways Territories, one Deck, one token, and one die', () => {
    const bag = save.ObjectStates.find((object) => object.Name === 'Bag');
    expect(bag).toBeTruthy();
    expect(bag.ContainedObjects).toHaveLength(7);

    const deck = bag.ContainedObjects.filter((object) => object.Name === 'DeckCustom');
    const cards = bag.ContainedObjects.filter((object) => object.Name === 'CardCustom');
    const leader = cards.filter((object) => object.Description.endsWith('Leader'));
    const territories = cards.filter((object) => object.Description.includes('Territory'));

    expect(deck).toHaveLength(1);
    expect(deck[0].DeckIDs).toEqual([101, 101]);
    expect(leader).toHaveLength(1);
    expect(leader[0].CardID).toBe(10000);
    expect(territories).toHaveLength(3);
    expect(territories.every((territory) => territory.SidewaysCard === true)).toBe(true);
    expect(territories.every((territory) => territory.Transform.rotY === 90)).toBe(true);
    expect(territories.every((territory) => territory.LuaScript.includes('self.use_rotation_value_flip = true'))).toBe(true);
    expect(territories.every((territory) => Object.values(territory.CustomDeck)
      .every((state) => state.BackURL === `https://example.invalid/${version}/${files.standardBack}`))).toBe(true);
    expect(bag.ContainedObjects.filter((object) => object.Name === 'PlayerPawn')).toHaveLength(1);
    expect(bag.ContainedObjects.filter((object) => object.Name === 'Die_6')).toHaveLength(1);
  });

  it('uses only HTTPS hosted URLs for every custom face and back in the save', () => {
    const urls = [];
    const walk = (objects) => {
      for (const object of objects || []) {
        for (const state of Object.values(object.CustomDeck || {})) {
          urls.push(state.FaceURL, state.BackURL);
        }
        walk(object.ContainedObjects);
      }
    };
    walk(save.ObjectStates);

    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => /^https:\/\//.test(url))).toBe(true);
  });
});
