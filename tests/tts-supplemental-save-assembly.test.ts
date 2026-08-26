import { describe, expect, it } from 'vitest';
import { assembleReadySupplementals } from '../scripts/assemble-tts-supplemental-save.mjs';
import {
  CUSTOM_TILE_CARD_LINEAR_SCALE,
  ROUNDED_RECTANGLE_TILE_TYPE,
  TRACKER_RENDER_PX_PER_IN,
} from '../scripts/tts-supplemental-geometry.mjs';

const PENDING_NOTE = 'Ready shared and faction supplemental components are assembled into the same starter kit later in the TTS package pipeline. Rules remain manual.';

function bag(nickname: string, guid: string, leaderCardId?: number) {
  return {
    Name: 'Bag',
    Nickname: nickname,
    Description: 'Starter kit',
    GUID: guid,
    ContainedObjects: [
      {
        Name: 'CardCustom',
        Nickname: leaderCardId ? 'Selected Leader' : 'Existing card',
        GUID: `${guid.slice(0, 5)}a`,
        ...(leaderCardId ? { CardID: leaderCardId } : {}),
      },
    ],
  };
}

function fixture() {
  const save = {
    Note: `Gauntlet current-test review scaffold.\n\n${PENDING_NOTE}`,
    Rules: `Gauntlet current-test review scaffold.\n\n${PENDING_NOTE}`,
    ObjectStates: [
      bag('Mystics Starter — Alchemist', '000010'),
      bag('Military Starter — General', '000020', 10000),
    ],
  };
  const starters = {
    gameVersion: 'current-test',
    decks: [
      { id: 'mystics-starter', name: 'Mystics Starter', factionId: 'mystics', leader: { name: 'Alchemist' } },
      {
        id: 'military-starter',
        name: 'Military Starter',
        factionId: 'military',
        leader: { name: 'General', tts: { cardId: 10000 } },
        back: { file: 'backs/intelligence.png', policy: 'standardBack' },
        factionComponentBack: { file: 'backs/military.png', policy: 'factionComponentBack' },
      },
    ],
  };
  const supplementals = {
    gameVersion: 'current-test',
    readyCount: 2,
    ready: [
      {
        id: 'mystics-reference-a',
        name: 'Mystics Reference A',
        faction: 'mystics',
        family: 'reference-card',
        quantity: 2,
        productionStatus: 'ready',
        representation: 'card',
        tts: {
          cardId: 20000,
          deckId: 200,
          faceFile: 'supplementals/fronts/rite-a.png',
          backFile: 'supplementals/reverses/completed.png',
          numWidth: 1,
          numHeight: 1,
        },
      },
      {
        id: 'military-ready-card',
        name: 'Military Ready Card',
        faction: 'military',
        family: 'reference-card',
        quantity: 1,
        productionStatus: 'ready',
        representation: 'card',
        tts: {
          cardId: 20100,
          deckId: 201,
          faceFile: 'supplementals/fronts/military.png',
          backFile: 'backs/military.png',
          numWidth: 1,
          numHeight: 1,
        },
      },
    ],
  };
  const assets = {
    gameVersion: 'current-test',
    releaseTag: 'current-test',
    bySourceFile: {
      'supplementals/fronts/rite-a.png': 'https://example.invalid/rite-a.png',
      'supplementals/reverses/completed.png': 'https://example.invalid/completed.png',
      'supplementals/fronts/military.png': 'https://example.invalid/military.png',
      'supplementals/fronts/universal.png': 'https://example.invalid/universal.png',
      'supplementals/reverses/universal.png': 'https://example.invalid/universal-back.png',
      'supplementals/trackers/command.png': 'https://example.invalid/command.png',
      'backs/intelligence.png': 'https://example.invalid/black-back.png',
      'backs/military.png': 'https://example.invalid/military-back.png',
    },
  };
  return { save, starters, supplementals, assets };
}

describe('TTS ready supplemental save assembly', () => {
  it('places ready components only into matching starter Bags and expands quantity', () => {
    const { save, starters, supplementals, assets } = fixture();
    const result = assembleReadySupplementals(save, starters, supplementals, assets);

    expect(result.placedCount).toBe(3);
    const mystics = result.save.ObjectStates[0];
    const military = result.save.ObjectStates[1];
    const mysticsSupplementals = mystics.ContainedObjects.filter((object: any) => object.GMNotes?.startsWith('gauntlet:supplemental:'));
    const militarySupplementals = military.ContainedObjects.filter((object: any) => object.GMNotes?.startsWith('gauntlet:supplemental:'));

    expect(mysticsSupplementals).toHaveLength(2);
    expect(mysticsSupplementals.every((object: any) => object.Nickname === 'Mystics Reference A')).toBe(true);
    expect(militarySupplementals).toHaveLength(1);
    expect(militarySupplementals[0].Nickname).toBe('Military Ready Card');
    expect(mystics.Description).toContain('Ready supplemental components: Mystics Reference A ×2');
    expect(military.Description).toContain('Ready supplemental components: Military Ready Card');
  });

  it('places an every-deck shared reference into every starter Bag', () => {
    const { save, starters, supplementals, assets } = fixture();
    supplementals.ready.push({
      id: 'universal-reference',
      name: 'Universal Reference Card',
      faction: 'neutral',
      family: 'reference-card',
      quantity: 1,
      deckInclusion: 'every-deck',
      productionStatus: 'ready',
      representation: 'card',
      tts: {
        cardId: 20200,
        deckId: 202,
        faceFile: 'supplementals/fronts/universal.png',
        backFile: 'supplementals/reverses/universal.png',
        numWidth: 1,
        numHeight: 1,
      },
    } as any);
    supplementals.readyCount = supplementals.ready.length;

    const result = assembleReadySupplementals(save, starters, supplementals, assets);
    expect(result.placedCount).toBe(5);
    for (const starterBag of result.save.ObjectStates) {
      const universal = starterBag.ContainedObjects.filter((object: any) => object.GMNotes === 'gauntlet:supplemental:universal-reference');
      expect(universal).toHaveLength(1);
      expect(universal[0].Nickname).toBe('Universal Reference Card');
    }
  });

  it('creates hand-compatible supplemental cards with hosted face and reverse URLs', () => {
    const { save, starters, supplementals, assets } = fixture();
    const result = assembleReadySupplementals(save, starters, supplementals, assets);
    const card = result.save.ObjectStates[0].ContainedObjects.find((object: any) => object.GMNotes === 'gauntlet:supplemental:mystics-reference-a');

    expect(card.Name).toBe('CardCustom');
    expect(card.Hands).toBe(true);
    expect(card.CardID).toBe(20000);
    expect(card.CustomDeck['200'].FaceURL).toBe('https://example.invalid/rite-a.png');
    expect(card.CustomDeck['200'].BackURL).toBe('https://example.invalid/completed.png');
    expect(card.CustomDeck['200'].BackIsHidden).toBe(true);
    expect(card.CustomDeck['200'].UniqueBack).toBe(false);
  });

  it('creates sliding trackers with exact renderer-measured registration travel', () => {
    const { save, starters, supplementals, assets } = fixture();
    supplementals.ready.push({
      id: 'military-command-tracker',
      name: 'Military Command Tracker',
      faction: 'military',
      family: 'tracker',
      quantity: 1,
      productionStatus: 'ready',
      representation: 'sliding-tracker',
      cover: { kind: 'leader' },
      physicalScale: { cardWidth: 2.5, cardHeight: 3.5, minimum: 0, maximum: 4 },
      tts: {
        faceFile: 'supplementals/trackers/command.png',
        widthScale: 2.5,
        heightScale: 3.5,
        thickness: 0.05,
        stackable: false,
        assembly: 'military-command',
        axis: 'vertical',
        layer: 1,
        snapTag: 'military-command',
        snapPoints: [
          { value: 0, rendererTravelPx: 0, offset: 0 },
          { value: 1, rendererTravelPx: 86.4, offset: 0.9 },
          { value: 2, rendererTravelPx: 144, offset: 1.5 },
          { value: 3, rendererTravelPx: 201.6, offset: 2.1 },
          { value: 4, rendererTravelPx: 259.2, offset: 2.7 },
        ],
      },
    } as any);
    supplementals.readyCount = supplementals.ready.length;

    const result = assembleReadySupplementals(save, starters, supplementals, assets);
    const military = result.save.ObjectStates[1];
    const tracker = military.ContainedObjects.find((object: any) => object.GMNotes === 'gauntlet:supplemental:military-command-tracker');
    const leader = military.ContainedObjects.find((object: any) => object.CardID === 10000);

    expect(tracker.Name).toBe('Custom_Tile');
    expect(tracker.CustomImage.ImageURL).toBe('https://example.invalid/command.png');
    expect(tracker.CustomImage.ImageSecondaryURL).toBe('https://example.invalid/military-back.png');
    expect(tracker.CustomImage.CustomTile.Stackable).toBe(false);
    expect(tracker.CustomImage.CustomTile.Type).toBe(ROUNDED_RECTANGLE_TILE_TYPE);
    expect(tracker.CustomImage.CustomTile.Stretch).toBe(true);
    expect(tracker.CustomImage.WidthScale).toBe(2.5);
    expect(tracker.Transform.scaleX).toBe(CUSTOM_TILE_CARD_LINEAR_SCALE);
    expect(tracker.Transform.scaleY).toBe(1);
    expect(tracker.Transform.scaleZ).toBe(CUSTOM_TILE_CARD_LINEAR_SCALE);
    expect(tracker.AttachedSnapPoints).toHaveLength(5);
    expect(tracker.AttachedSnapPoints[0].Position.z).toBe(0);
    expect(tracker.AttachedSnapPoints[1].Position.z).toBeCloseTo(-(86.4 / TRACKER_RENDER_PX_PER_IN / CUSTOM_TILE_CARD_LINEAR_SCALE), 6);
    expect(tracker.AttachedSnapPoints[4].Position.z).toBeCloseTo(-(259.2 / TRACKER_RENDER_PX_PER_IN / CUSTOM_TILE_CARD_LINEAR_SCALE), 6);
    expect(Math.abs(tracker.AttachedSnapPoints[1].Position.z) * tracker.Transform.scaleZ).toBeCloseTo(0.9, 6);
    expect(Math.abs(tracker.AttachedSnapPoints[4].Position.z) * tracker.Transform.scaleZ).toBeCloseTo(2.7, 6);
    expect(tracker.AttachedSnapPoints.every((point: any) => point.Tags.includes('military-command'))).toBe(true);
    expect(tracker.LuaScript).toContain('self.setSnapPoints({');
    expect(tracker.LuaScript).not.toContain('getBoundsNormalized');
    expect(tracker.LuaScript).not.toContain('Wait.frames');
    expect(leader.Tags).toContain('military-command');
  });

  it('is idempotent when assembly runs more than once', () => {
    const { save, starters, supplementals, assets } = fixture();
    const first = assembleReadySupplementals(save, starters, supplementals, assets).save;
    const second = assembleReadySupplementals(first, starters, supplementals, assets).save;

    const mysticsSupplementals = second.ObjectStates[0].ContainedObjects.filter((object: any) => object.GMNotes?.startsWith('gauntlet:supplemental:'));
    expect(mysticsSupplementals).toHaveLength(2);
    expect(second.ObjectStates[0].Description.match(/Ready supplemental components:/g)).toHaveLength(1);
    expect(second.Note).toContain('production-ready faction components are included automatically');
    expect(second.Note).not.toContain(PENDING_NOTE);
  });

  it('fails closed when a ready component has an unsupported save representation', () => {
    const { save, starters, supplementals, assets } = fixture();
    supplementals.ready[0].representation = 'ledger';

    expect(() => assembleReadySupplementals(save, starters, supplementals, assets)).toThrow(/unsupported save representation ledger/);
  });
});
