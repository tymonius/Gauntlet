import { describe, expect, it } from 'vitest';
import {
  buildDeckImporterConfig,
  installDeckImporter,
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
  decks: [{
    id: 'military-general-starter',
    factionId: 'military',
    leaderId: 'general',
    leader: { name: 'General' },
    back: { file: 'backs/standard.png' },
  }],
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
  });

  it('installs an idempotent Global UI and Lua importer', () => {
    const config = buildDeckImporterConfig({
      version,
      catalog,
      cardManifest,
      territoryManifest,
      starterManifest,
      releaseAssets,
    });
    const save = {
      ObjectStates: [],
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
    expect((save.LuaScript.match(/GAUNTLET_DECK_IMPORTER_BEGIN/g) || [])).toHaveLength(1);
    expect(save.XmlUI).toContain('DECK IMPORT');
    expect(save.XmlUI).toContain('IMPORT STARTER KIT');
    expect(save.XmlUI).toContain('visibility="White|Green"');
    expect(save.XmlUI).toContain('lineType="MultiLineNewLine"');
    expect(save.XmlUI).toContain('onEndEdit="gauntletDeckImportChanged"');
    expect((save.XmlUI.match(/GAUNTLET_DECK_IMPORTER_BEGIN/g) || [])).toHaveLength(1);
  });

  it('rejects mismatched generated versions', () => {
    expect(() => buildDeckImporterConfig({
      version,
      catalog,
      cardManifest: { ...cardManifest, gameVersion: 'v0.6.3' },
      territoryManifest,
      starterManifest,
      releaseAssets,
    })).toThrow(/version mismatch/i);
  });
});
