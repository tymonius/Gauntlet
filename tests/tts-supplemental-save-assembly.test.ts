import { describe, expect, it } from 'vitest';
import { assembleReadySupplementals } from '../scripts/assemble-tts-supplemental-save.mjs';
import {
  CUSTOM_TILE_CARD_LINEAR_SCALE,
  ROUNDED_RECTANGLE_TILE_TYPE,
} from '../scripts/tts-supplemental-geometry.mjs';

const PENDING_NOTE = 'Ready shared and faction supplemental components are assembled into the same starter kit later in the TTS package pipeline. Rules remain manual.';

function card(id: string, family: string, faction: string, cardId: number, deckId: number) {
  return {
    id,
    name: id,
    faction,
    family,
    quantity: 1,
    productionStatus: 'ready',
    representation: 'card',
    tts: {
      cardId,
      deckId,
      faceFile: `supplementals/fronts/${id}.png`,
      backFile: `supplementals/reverses/${id}.png`,
      numWidth: 1,
      numHeight: 1,
      ...(family === 'deed-card' ? { sidewaysCard: true } : {}),
    },
  };
}

function fixture() {
  const save: any = {
    Note: `Gauntlet current-test review scaffold.\n\n${PENDING_NOTE}`,
    Rules: `Gauntlet current-test review scaffold.\n\n${PENDING_NOTE}`,
    ObjectStates: [
      {
        Name: 'Bag', Nickname: 'Financiers Starter — Banker', Description: 'Starter kit', GUID: '000010',
        ContainedObjects: [{ Name: 'CardCustom', Nickname: 'Banker', GUID: '00001a', CardID: 10000 }],
      },
      {
        Name: 'Bag', Nickname: 'Military Starter — General', Description: 'Starter kit', GUID: '000020',
        ContainedObjects: [{ Name: 'CardCustom', Nickname: 'General', GUID: '00002a', CardID: 11000 }],
      },
    ],
  };
  const starters: any = {
    gameVersion: 'current-test',
    decks: [
      { id: 'financiers', name: 'Financiers Starter', factionId: 'financiers', leader: { name: 'Banker' }, factionComponentBack: { file: 'backs/financiers.png' } },
      { id: 'military', name: 'Military Starter', factionId: 'military', leader: { name: 'General' }, factionComponentBack: { file: 'backs/military.png' } },
    ],
  };
  const ready: any[] = [
    {
      ...card('universal-reference', 'reference-card', 'neutral', 20000, 200),
      name: 'Universal Reference',
      deckInclusion: 'every-deck',
    },
    {
      id: 'military-command-tracker', name: 'Military Command Tracker', faction: 'military', family: 'tracker', quantity: 1,
      productionStatus: 'ready', representation: 'sliding-tracker', cover: { kind: 'leader' },
      physicalScale: { cardWidth: 2.5, cardHeight: 3.5, minimum: 0, maximum: 4 },
      tts: {
        faceFile: 'supplementals/trackers/command.png', widthScale: 2.5, heightScale: 3.5, thickness: 0.05,
        stackable: false, assembly: 'military-command', axis: 'vertical', layer: 1, snapTag: 'military-command',
        snapPoints: [
          { value: 0, rendererTravelPx: 0, registrationFraction: 0 },
          { value: 1, rendererTravelPx: 51.54688, registrationFraction: 51.54688 / 336 },
          { value: 2, rendererTravelPx: 74.65625, registrationFraction: 74.65625 / 336 },
          { value: 3, rendererTravelPx: 97.76563, registrationFraction: 97.76563 / 336 },
          { value: 4, rendererTravelPx: 120.875, registrationFraction: 120.875 / 336 },
        ],
      },
    },
    ...Array.from({ length: 8 }, (_, index) => card(`deed-${index + 1}`, 'deed-card', 'financiers', 21000 + index, 210 + index)),
  ];
  const supplementals: any = { gameVersion: 'current-test', readyCount: ready.length, ready };
  const bySourceFile: Record<string, string> = {
    'backs/financiers.png': 'https://example.invalid/financiers-back.png',
    'backs/military.png': 'https://example.invalid/military-back.png',
    'supplementals/trackers/command.png': 'https://example.invalid/command.png',
  };
  for (const component of ready.filter(item => item.representation === 'card')) {
    bySourceFile[component.tts.faceFile] = `https://example.invalid/${component.id}-front.png`;
    bySourceFile[component.tts.backFile] = `https://example.invalid/${component.id}-back.png`;
  }
  const assets: any = { gameVersion: 'current-test', releaseTag: 'current-test', bySourceFile };
  return { save, starters, supplementals, assets };
}

describe('TTS ready supplemental save assembly', () => {
  it('places shared material into every starter and faction material only into its faction', () => {
    const { save, starters, supplementals, assets } = fixture();
    const result = assembleReadySupplementals(save, starters, supplementals, assets);
    expect(result.assembledIds).toContain('universal-reference');
    for (const starterBag of result.save.ObjectStates) {
      expect(JSON.stringify(starterBag)).toContain('gauntlet:supplemental:universal-reference');
    }
    expect(JSON.stringify(result.save.ObjectStates[0])).not.toContain('military-command-tracker');
    expect(JSON.stringify(result.save.ObjectStates[1])).toContain('military-command-tracker');
  });

  it('makes live TTS bounds the sole authority for tracker snap coordinates', () => {
    const { save, starters, supplementals, assets } = fixture();
    const result = assembleReadySupplementals(save, starters, supplementals, assets);
    const military = result.save.ObjectStates[1];
    const tracker = military.ContainedObjects.find((object: any) => object.GMNotes === 'gauntlet:supplemental:military-command-tracker');
    const leader = military.ContainedObjects.find((object: any) => object.CardID === 11000);

    expect(tracker.Name).toBe('Custom_Tile');
    expect(tracker.CustomImage.CustomTile.Stackable).toBe(false);
    expect(tracker.Sticky).toBe(true);
    expect(tracker.Transform.rotY).toBe(0);
    expect(tracker.Tags).toContain('gauntlet-faction-zone');
    expect(tracker.CustomImage.CustomTile.Type).toBe(ROUNDED_RECTANGLE_TILE_TYPE);
    expect(tracker.Transform.scaleZ).toBe(CUSTOM_TILE_CARD_LINEAR_SCALE);
    expect(tracker.AttachedSnapPoints).toBeUndefined();
    expect(tracker.LuaScript).toContain('self.getBoundsNormalized()');
    expect(tracker.LuaScript).toContain('local localLength = bounds.size.z / scaleZ');
    expect(tracker.LuaScript).toContain('-localLength * registration.fraction');
    expect(tracker.LuaScript).toContain(`fraction = ${51.54688 / 336}`);
    expect(tracker.LuaScript).toContain(`fraction = ${74.65625 / 336}`);
    expect(tracker.LuaScript).not.toContain('3.06');
    expect(leader.Tags).toContain('military-command');
  });

  it('packages Deeds as one landscape stack that uses ordinary Faction Zone magnets', () => {
    const { save, starters, supplementals, assets } = fixture();
    const result = assembleReadySupplementals(save, starters, supplementals, assets);
    const financiers = result.save.ObjectStates[0];
    const stack = financiers.ContainedObjects.find((object: any) => object.GMNotes === 'gauntlet:supplemental-stack:deeds');

    expect(stack.Name).toBe('DeckCustom');
    expect(stack.ContainedObjects).toHaveLength(8);
    expect(stack.SidewaysCard).toBe(true);
    expect(stack.Transform.rotY).toBe(90);
    expect(stack.Tags).toContain('gauntlet-deed-stack');
    expect(stack.Tags).toContain('gauntlet-faction-zone');
    expect(stack.ContainedObjects.every((deed: any) => deed.Tags.includes('gauntlet-deed'))).toBe(true);
    expect(stack.ContainedObjects.every((deed: any) => deed.Tags.includes('gauntlet-faction-zone'))).toBe(true);
  });

  it('is idempotent', () => {
    const { save, starters, supplementals, assets } = fixture();
    const first = assembleReadySupplementals(save, starters, supplementals, assets).save;
    const second = assembleReadySupplementals(first, starters, supplementals, assets).save;
    for (const starterBag of second.ObjectStates) {
      expect((starterBag.ContainedObjects || []).filter((object: any) => object.GMNotes === 'gauntlet:supplemental:universal-reference')).toHaveLength(1);
    }
  });
});
