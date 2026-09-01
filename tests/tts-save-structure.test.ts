import { describe, expect, it } from 'vitest';
import { buildTtsSave } from '../scripts/generate-tts-save.mjs';

const version = 'v0.7.0';
const files = {
  deckFace: 'sheets/cards-01.png',
  standardBack: 'backs/standard.png',
  factionBack: 'backs/military.png',
  leader: 'leaders/military-general.png',
  table: 'environment/campaign-map-table.png',
  panorama: 'environment/command-tent-panorama.png',
  rulebook: 'rulebook-reader.pdf',
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
    files.table,
    files.panorama,
    files.rulebook,
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

  it('uses hosted environment assets instead of branch-local raw URLs', () => {
    expect(save.Table).toBe('Table_Custom');
    expect(save.Sky).toBe('Sky_Museum');
    expect(save.TableURL).toBe(`https://example.invalid/${version}/${files.table}`);
    expect(save.SkyURL).toBe(`https://example.invalid/${version}/${files.panorama}`);
  });

  it('adds one shared reader-order Rulebook to the base save', () => {
    const rulebook = save.ObjectStates.find((object) => object.GMNotes === 'gauntlet:shared-rulebook');
    expect(rulebook?.Name).toBe('Custom_PDF');
    expect(rulebook?.CustomPDF?.PDFUrl).toBe(`https://example.invalid/${version}/${files.rulebook}`);
    expect(rulebook?.Transform).toMatchObject({ posX: 11.4, posZ: 0, rotY: 90 });
  });

  it('creates exactly the White and Green native TTS player hand configurations', () => {
    expect(save.Hands.Enable).toBe(true);
    expect(save.Hands.DisableUnused).toBe(false);
    expect(save.Hands.HandTransforms.map((hand) => hand.Color)).toEqual(['White', 'Green']);
    expect(save.Hands.HandTransforms[0].Transform).toMatchObject({ posY: 4, posZ: -23.25, rotY: 0, scaleX: 12, scaleY: 6, scaleZ: 4 });
    expect(save.Hands.HandTransforms[1].Transform).toMatchObject({ posY: 4, posZ: 23.25, rotY: 180, scaleX: 12, scaleY: 6, scaleZ: 4 });
  });

  it('creates the six center-line Gauntlet snap positions in order', () => {
    expect(save.SnapPoints).toHaveLength(6);
    expect(save.SnapPoints.map((point) => point.Position.x)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(save.SnapPoints.map((point) => point.Position.z)).toEqual([-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]);
    expect(save.SnapPoints.every((point) => point.Rotation === undefined)).toBe(true);
  });

  it('keeps player utilities inside the selected faction starter Bag rather than on the table', () => {
    const topLevel = save.ObjectStates;
    expect(topLevel.filter((object) => object.Name === 'Die_6')).toHaveLength(0);
    expect(topLevel.filter((object) => object.Name === 'PlayerPawn')).toHaveLength(0);

    const bag = topLevel.find((object) => object.Name === 'Bag');
    expect(bag).toBeTruthy();
    expect(bag.Transform.rotY).toBe(180);
    expect(bag.ContainedObjects.every((object) => object.Transform?.rotY === 180)).toBe(true);
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

  it('builds each starter Bag with a Leader, playable Deck, one three-Territory stack, token, and die', () => {
    const bag = save.ObjectStates.find((object) => object.Name === 'Bag');
    expect(bag).toBeTruthy();
    expect(bag.GMNotes).toBe('gauntlet:starter-kit:military-general-test');
    expect(bag.ContainedObjects).toHaveLength(5);

    const leader = bag.ContainedObjects.find((object) => object.Name === 'CardCustom' && object.Description.endsWith('Leader'));
    const deck = bag.ContainedObjects.find((object) => object.GMNotes === 'gauntlet:starter-deck:military-general-test');
    const territoryStack = bag.ContainedObjects.find((object) => object.GMNotes === 'gauntlet:starter-territories:military-general-test');
    const territories = territoryStack?.ContainedObjects || [];

    expect(bag.ContainedObjects.slice(0, 3).map((object) => object.GMNotes || object.Nickname)).toEqual([
      'General',
      'gauntlet:starter-deck:military-general-test',
      'gauntlet:starter-territories:military-general-test',
    ]);
    expect(leader?.CardID).toBe(10000);

    expect(deck?.Name).toBe('DeckCustom');
    expect(deck?.DeckIDs).toEqual([101, 101]);
    expect(deck?.ContainedObjects.every((card) => card.GMNotes === 'gauntlet:playable-card:test-card')).toBe(true);

    expect(territoryStack?.Name).toBe('DeckCustom');
    expect(territoryStack?.SidewaysCard).toBe(true);
    expect(territoryStack?.Transform.rotY).toBe(180);
    expect(territoryStack?.DeckIDs).toEqual([20000, 20001, 20002]);
    expect(territories).toHaveLength(3);
    expect(territories.every((territory) => territory.SidewaysCard === true)).toBe(true);
    expect(territories.every((territory) => territory.Transform.rotY === 180)).toBe(true);
    expect(territories.every((territory) => String(territory.LuaScript || '') === '')).toBe(true);
    expect(territories.every((territory) => !String(territory.LuaScript || '').includes('tryRotate'))).toBe(true);
    expect(territories.every((territory) => !String(territory.LuaScript || '').includes('use_rotation_value_flip'))).toBe(true);
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
