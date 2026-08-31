import { describe, expect, it } from 'vitest';
import {
  buildDeckImporterConfig,
  installDeckImporter,
  installStarterTemplateLibrary,
  MAX_TTS_IMPORTER_LUA_BYTES,
  validateGeneratedLuaStrings,
  isDeckImporterReleaseVersion,
  TTS_DECK_IMPORTER_MIN_VERSION,
} from '../scripts/tts-deck-importer.mjs';

const version = 'v0.7.0';
const releaseAssets = {
  gameVersion: version,
  releaseTag: version,
  bySourceFile: {
    'backs/standard.png': 'https://example.invalid/v0.7.0/backs/standard.png',
    'sheets/cards.png': 'https://example.invalid/v0.7.0/sheets/cards.png',
    'territory-sheets/territories.png': 'https://example.invalid/v0.7.0/territory-sheets/territories.png',
    'supplementals/fronts/mystics-rite-echoes.png': 'https://example.invalid/v0.7.0/rites/echoes-front.png',
    'supplementals/reverses/mystics-rite-echoes-completed.png': 'https://example.invalid/v0.7.0/rites/echoes-back.png',
    'supplementals/fronts/mystics-rite-blood.png': 'https://example.invalid/v0.7.0/rites/blood-front.png',
    'supplementals/reverses/mystics-rite-blood-completed.png': 'https://example.invalid/v0.7.0/rites/blood-back.png',
    'supplementals/fronts/mystics-rite-equivalence.png': 'https://example.invalid/v0.7.0/rites/equivalence-front.png',
    'supplementals/reverses/mystics-rite-equivalence-completed.png': 'https://example.invalid/v0.7.0/rites/equivalence-back.png',
    'supplementals/fronts/mystics-ritual-of-ascension.png': 'https://example.invalid/v0.7.0/rites/ritual-front.png',
    'supplementals/reverses/mystics-ritual-of-ascension.png': 'https://example.invalid/v0.7.0/rites/ritual-back.png',
  },
};
const catalog = {
  gameVersion: version,
  playableCards: [
    { id: 'neutral-rally', name: 'Rally', faction: 'neutral', cost: 1, unique: false },
    { id: 'military-encampment', name: 'Encampment', faction: 'military', cost: 2, unique: true },
  ],
  territories: [
    { id: 'high-ground', name: 'High Ground', arena: false },
    { id: 'arena-grand-melee', name: 'Grand Melee', arena: true },
  ],
};
const cardManifest = {
  gameVersion: version,
  sheets: [{
    deckId: 1,
    faceFile: 'sheets/cards.png',
    numWidth: 10,
    numHeight: 7,
    cards: [
      { id: 'neutral-rally', name: 'Rally', faction: 'neutral', ttsCardId: 100 },
      { id: 'military-encampment', name: 'Encampment', faction: 'military', ttsCardId: 101 },
    ],
  }],
};
const territoryManifest = {
  gameVersion: version,
  sheets: [{
    deckId: 200,
    faceFile: 'territory-sheets/territories.png',
    numWidth: 4,
    numHeight: 5,
    cards: [
      { id: 'high-ground', name: 'High Ground', arena: false, ttsCardId: 20000 },
      { id: 'arena-grand-melee', name: 'Grand Melee', arena: true, ttsCardId: 20001 },
    ],
  }],
};
const starterManifest = {
  gameVersion: version,
  construction: {
    minimumCards: 30,
    maximumDeckbuildingValue: 60,
    territoriesPerPlayer: 3,
    maximumArenas: 1,
  },
  decks: [
    {
      id: 'military-general-starter',
      factionId: 'military',
      leaderId: 'general',
      leader: { name: 'General' },
      back: { file: 'backs/standard.png' },
    },
    {
      id: 'mystics-alchemist-starter',
      factionId: 'mystics',
      leaderId: 'alchemist',
      leader: { name: 'Alchemist' },
      selectedRites: ['echoes', 'blood', 'equivalence'],
      back: { file: 'backs/standard.png' },
    },
  ],
};

function starterTemplateBag(starterId: string, faction: string, includeRites = false) {
  const objects: any[] = [
    {
      Name: 'DeckCustom',
      Nickname: `${faction} Starter Deck`,
      GUID: 'deck01',
      GMNotes: `gauntlet:starter-deck:${starterId}`,
      DeckIDs: [100, 101],
      CustomDeck: { '1': { FaceURL: 'old', BackURL: 'old' } },
      ContainedObjects: [
        { Name: 'CardCustom', GUID: 'card01', Nickname: 'Prototype Card', CardID: 100, CustomDeck: { '1': {} }, Tags: ['gauntlet-playable'] },
        { Name: 'CardCustom', GUID: 'card02', Nickname: 'Other Card', CardID: 101, CustomDeck: { '1': {} } },
      ],
    },
    {
      Name: 'DeckCustom',
      Nickname: `${faction} Territories`,
      GUID: 'terr01',
      GMNotes: `gauntlet:starter-territories:${starterId}`,
      DeckIDs: [20000, 20001],
      CustomDeck: { '200': { FaceURL: 'old', BackURL: 'old' } },
      ContainedObjects: [
        { Name: 'CardCustom', GUID: 'terr02', Nickname: 'Territory Prototype', CardID: 20000, CustomDeck: { '200': {} }, Tags: ['gauntlet-territory'] },
        { Name: 'CardCustom', GUID: 'terr03', Nickname: 'Other Territory', CardID: 20001, CustomDeck: { '200': {} } },
      ],
    },
    { Name: 'CardCustom', GUID: 'lead01', Nickname: 'Leader', GMNotes: 'leader-template' },
    { Name: 'PlayerPawn', GUID: 'pawn01', Nickname: 'Player Token' },
  ];
  if (includeRites) {
    objects.splice(2, 0, {
      Name: 'DeckCustom',
      Nickname: 'Rites + Ritual',
      GUID: 'rite01',
      GMNotes: 'gauntlet:supplemental-stack:rites-rituals',
      DeckIDs: [20600, 20700, 22300, 22400],
      CustomDeck: { '206': {}, '207': {}, '223': {}, '224': {} },
      ContainedObjects: [
        { Name: 'CardCustom', GUID: 'rite02', Nickname: 'Rite Prototype', CardID: 20600, CustomDeck: { '206': {} }, Tags: ['gauntlet-faction-zone'] },
        { Name: 'CardCustom', GUID: 'rite03', Nickname: 'Other Rite', CardID: 20700, CustomDeck: { '207': {} } },
      ],
    });
  }
  return {
    Name: 'Bag',
    GUID: includeRites ? 'bag002' : 'bag001',
    Nickname: `${starterId} Kit`,
    GMNotes: `gauntlet:starter-kit:${starterId}`,
    ContainedObjects: objects,
  };
}

const supplementalManifest = {
  gameVersion: version,
  ready: [
    {
      id: 'mystics-rite-echoes',
      name: 'Rite of Echoes',
      faction: 'mystics',
      family: 'rite-card',
      tts: { cardId: 20600, deckId: 206, faceFile: 'supplementals/fronts/mystics-rite-echoes.png', backFile: 'supplementals/reverses/mystics-rite-echoes-completed.png', numWidth: 1, numHeight: 1 },
    },
    {
      id: 'mystics-rite-blood',
      name: 'Rite of Blood',
      faction: 'mystics',
      family: 'rite-card',
      tts: { cardId: 20700, deckId: 207, faceFile: 'supplementals/fronts/mystics-rite-blood.png', backFile: 'supplementals/reverses/mystics-rite-blood-completed.png', numWidth: 1, numHeight: 1 },
    },
    {
      id: 'mystics-rite-equivalence',
      name: 'Rite of Equivalence',
      faction: 'mystics',
      family: 'rite-card',
      tts: { cardId: 22300, deckId: 223, faceFile: 'supplementals/fronts/mystics-rite-equivalence.png', backFile: 'supplementals/reverses/mystics-rite-equivalence-completed.png', numWidth: 1, numHeight: 1 },
    },
    {
      id: 'mystics-ritual-of-ascension',
      name: 'Ritual of Ascension',
      faction: 'mystics',
      family: 'ritual-card',
      tts: { cardId: 22400, deckId: 224, faceFile: 'supplementals/fronts/mystics-ritual-of-ascension.png', backFile: 'supplementals/reverses/mystics-ritual-of-ascension.png', numWidth: 1, numHeight: 1 },
    },
  ],
};

describe('TTS Deckbuilder importer', () => {
  it('is a v0.7.1-and-later release feature', () => {
    expect(TTS_DECK_IMPORTER_MIN_VERSION).toBe('v0.7.1');
    expect(isDeckImporterReleaseVersion('v0.7.0')).toBe(false);
    expect(isDeckImporterReleaseVersion('v0.7.1-candidate')).toBe(true);
    expect(isDeckImporterReleaseVersion('v0.7.1')).toBe(true);
    expect(isDeckImporterReleaseVersion('v0.7.2')).toBe(true);
    expect(isDeckImporterReleaseVersion('v1.0.0')).toBe(true);
    expect(isDeckImporterReleaseVersion('development')).toBe(false);
  });

  it('builds a hosted canonical-id import map', () => {
    const config = buildDeckImporterConfig({
      version,
      catalog,
      cardManifest,
      territoryManifest,
      starterManifest,
      supplementalManifest,
      releaseAssets,
    });

    expect(config.codePrefix).toBe('GDL1:');
    expect(config.backUrl).toBe('https://example.invalid/v0.7.0/backs/standard.png');
    expect(config.cards['neutral-rally']).toMatchObject({
      cardId: 100,
      deckId: 1,
      cost: 1,
      faction: 'neutral',
    });
    expect(config.territories['arena-grand-melee']).toMatchObject({
      cardId: 20001,
      deckId: 200,
      arena: true,
    });
    expect(config.starters['military:general']).toEqual({
      starterId: 'military-general-starter',
      starterName: undefined,
      leaderName: 'General',
    });
    expect(config.selectedRiteCount).toBe(3);
    expect(config.rites.equivalence).toMatchObject({
      name: 'Rite of Equivalence',
      cardId: 22300,
      deckId: 223,
      frontUrl: 'https://example.invalid/v0.7.0/rites/equivalence-front.png',
      backUrl: 'https://example.invalid/v0.7.0/rites/equivalence-back.png',
    });
    expect(config.ritual).toMatchObject({
      name: 'Ritual of Ascension',
      cardId: 22400,
      deckId: 224,
    });
  });

  it('stores pruned immutable starter templates in a hidden internal library', () => {
    const config = buildDeckImporterConfig({
      version,
      catalog,
      cardManifest,
      territoryManifest,
      starterManifest,
      supplementalManifest,
      releaseAssets,
    });
    const sourceBag = starterTemplateBag('military-general-starter', 'military');
    const mysticsBag = starterTemplateBag('mystics-alchemist-starter', 'mystics', true);
    const save: any = { ObjectStates: [sourceBag, mysticsBag] };

    installStarterTemplateLibrary(save, config);

    const library = save.ObjectStates.find((object: any) =>
      object.GMNotes === 'gauntlet:internal:deck-import-template-library'
    );
    expect(library).toBeTruthy();
    expect(library.Locked).toBe(true);
    expect(library.DragSelectable).toBe(false);
    expect(library.Transform.posY).toBe(-30);
    expect(library.ContainedObjects).toHaveLength(2);

    const template = library.ContainedObjects.find((object: any) =>
      object.GMNotes === 'gauntlet:starter-kit:military-general-starter'
    );
    const deck = template.ContainedObjects.find((object: any) =>
      String(object.GMNotes || '').startsWith('gauntlet:starter-deck:')
    );
    const territories = template.ContainedObjects.find((object: any) =>
      String(object.GMNotes || '').startsWith('gauntlet:starter-territories:')
    );
    const mysticsTemplate = library.ContainedObjects.find((object: any) =>
      object.GMNotes === 'gauntlet:starter-kit:mystics-alchemist-starter'
    );
    const rites = mysticsTemplate.ContainedObjects.find((object: any) =>
      object.GMNotes === 'gauntlet:supplemental-stack:rites-rituals'
    );

    expect(template.GUID).toBeTruthy();
    expect(deck.GUID).toBeTruthy();
    expect(deck.DeckIDs).toEqual([]);
    expect(deck.CustomDeck).toEqual({});
    expect(deck.ContainedObjects).toHaveLength(1);
    expect(territories.ContainedObjects).toHaveLength(1);
    expect(rites.ContainedObjects).toHaveLength(1);

    // Capturing templates must not mutate visible starter kits.
    expect(sourceBag.GUID).toBe('bag001');
    expect(sourceBag.ContainedObjects[0].ContainedObjects).toHaveLength(2);
  });

  it('installs an idempotent Global UI and Lua importer', () => {
    const config = buildDeckImporterConfig({
      version,
      catalog,
      cardManifest,
      territoryManifest,
      starterManifest,
      supplementalManifest,
      releaseAssets,
    });
    const save = {
      ObjectStates: [
        starterTemplateBag('military-general-starter', 'military'),
        starterTemplateBag('mystics-alchemist-starter', 'mystics', true),
      ],
      LuaScript: 'function existing() end',
      XmlUI: '<Text text="Existing" />',
    };

    installDeckImporter(save, config);
    installDeckImporter(save, config);

    expect(save.LuaScript).toContain('function existing() end');
    expect(save.LuaScript).toContain('function gauntletImportDeck');
    expect(save.LuaScript).toContain('pcall(function() return player.color end)');
    expect(save.LuaScript).toContain('UI.show("gauntlet-deck-import-panel")');
    expect(save.LuaScript).toContain('UI.hide("gauntlet-deck-import-open")');
    expect(save.LuaScript).not.toContain('UI.getValue("gauntlet-deck-import-code")');
    expect(save.LuaScript).toContain('gauntlet:starter-kit:');
    expect(save.LuaScript).toContain('gauntlet:internal:deck-import-template-library');
    expect(save.LuaScript).toContain('getAllObjects()');
    expect(save.LuaScript).toContain('library.getJSON()');
    expect(save.LuaScript).not.toContain('official " .. validated.starter.leaderName .. " starter kit is not on the table');
    expect(save.LuaScript).toContain('function gauntletBuildMysticsRiteStack');
    expect(save.LuaScript).toContain('GAUNTLET_DECK_IMPORT.selectedRiteCount');
    expect(save.LuaScript).toContain('gauntlet:supplemental:mystics-ritual-of-ascension');
    expect(save.LuaScript).toContain('bagData.Description = "Custom Deckbuilder starter kit\\n\\n"');
    expect(save.LuaScript).not.toContain(`bagData.Description = "Custom Deckbuilder starter kit

"`);
    expect(Buffer.byteLength(save.LuaScript, 'utf8')).toBeLessThan(MAX_TTS_IMPORTER_LUA_BYTES);
    expect(save.LuaScript).not.toContain('"template":{');
    expect((save.LuaScript.match(/GAUNTLET_DECK_IMPORTER_BEGIN/g) || [])).toHaveLength(1);
    expect(save.XmlUI).toContain('DECK IMPORT');
    expect(save.XmlUI).toContain('IMPORT STARTER KIT');
    expect(save.XmlUI).toContain('visibility="White|Green"');
    expect(save.XmlUI).toContain('lineType="MultiLineNewLine"');
    expect(save.XmlUI).toContain('onEndEdit="gauntletDeckImportChanged"');
    expect((save.XmlUI.match(/GAUNTLET_DECK_IMPORTER_BEGIN/g) || [])).toHaveLength(1);
  });

  it('rejects raw newlines inside generated Lua quoted strings', () => {
    expect(() => validateGeneratedLuaStrings('local value = "broken\nstring"')).toThrow(/raw newline/i);
    expect(validateGeneratedLuaStrings('local value = "safe\\nstring"')).toBe(true);
    expect(validateGeneratedLuaStrings('local payload = [[line one\nline two]]')).toBe(true);
  });

  it('rejects mismatched generated versions', () => {
    expect(() => buildDeckImporterConfig({
      version,
      catalog,
      cardManifest: { ...cardManifest, gameVersion: 'v0.6.3' },
      territoryManifest,
      starterManifest,
      supplementalManifest,
      releaseAssets,
    })).toThrow(/version mismatch/i);
  });
});
