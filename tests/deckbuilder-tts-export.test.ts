import { describe, expect, it } from 'vitest';
import {
  buildTtsDeckPayload,
  decodeTtsDeckCode,
  encodeTtsDeckCode,
  isTtsDeckExportAvailable,
  isTtsDeckExportQaAvailable,
  TTS_DECK_CODE_PREFIX,
  TTS_DECK_EXPORT_MIN_VERSION,
} from '../deckbuilder/tts-export.mjs';

describe('Deckbuilder TTS Deck Code', () => {
  const deck = {
    gameVersion: 'v0.7.0',
    name: 'General Pressure',
    factionId: 'military',
    leaderId: 'general',
    cards: [
      { id: 'military-encampment', name: 'Encampment', faction: 'military', qty: 2 },
      { id: 'neutral-rally', name: 'Rally', faction: 'neutral', qty: 3 },
    ],
    territories: [
      { id: 'high-ground', name: 'High Ground' },
      { id: 'supply-depot', name: 'Supply Depot' },
      { id: 'arena-grand-melee', name: 'Grand Melee', arena: true },
    ],
  };

  it('keeps the public Deckbuilder export dormant until v0.7.1', () => {
    expect(TTS_DECK_EXPORT_MIN_VERSION).toBe('v0.7.1');
    expect(isTtsDeckExportAvailable('v0.7.0')).toBe(false);
    expect(isTtsDeckExportAvailable('v0.7.1-candidate')).toBe(false);
    expect(isTtsDeckExportQaAvailable('v0.7.1-candidate')).toBe(true);
    expect(isTtsDeckExportQaAvailable('v0.7.0-candidate')).toBe(false);
    expect(isTtsDeckExportQaAvailable('v0.7.1')).toBe(false);
    expect(isTtsDeckExportAvailable('v0.7.1')).toBe(true);
    expect(isTtsDeckExportAvailable('v0.8.0')).toBe(true);
    expect(isTtsDeckExportAvailable('candidate')).toBe(false);
  });

  it('exports only stable ids and compact quantities', () => {
    expect(buildTtsDeckPayload(deck)).toEqual({
      v: 'v0.7.0',
      n: 'General Pressure',
      f: 'military',
      l: 'general',
      c: [
        ['military-encampment', 2],
        ['neutral-rally', 3],
      ],
      t: ['high-ground', 'supply-depot', 'arena-grand-melee'],
    });
  });

  it('round-trips the GDL1 clipboard format', () => {
    const code = encodeTtsDeckCode(deck);
    expect(code.startsWith(TTS_DECK_CODE_PREFIX)).toBe(true);
    expect(decodeTtsDeckCode(code)).toEqual(buildTtsDeckPayload(deck));
  });

  it('rejects malformed quantities and foreign clipboard text', () => {
    expect(() => encodeTtsDeckCode({ ...deck, cards: [{ id: 'neutral-rally', qty: 0 }] })).toThrow(/quantity/i);
    expect(() => decodeTtsDeckCode('not a deck')).toThrow(/not a Gauntlet/i);
  });

  it('fails closed for Mystics until TTS can assemble the selected three-Rite package', () => {
    expect(() => buildTtsDeckPayload({
      ...deck,
      factionId: 'mystics',
      leaderId: 'alchemist',
      selectedRites: ['echoes', 'blood', 'equivalence'],
    })).toThrow(/selected-Rite assembly/i);
  });
});
