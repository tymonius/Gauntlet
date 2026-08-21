import { describe, expect, it } from 'vitest';
import { assembleReadySupplementals } from '../scripts/assemble-tts-supplemental-save.mjs';

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
    Note: 'This scaffold intentionally does not yet include faction-specific supplemental trackers or secondary components. Rules remain manual.',
    Rules: 'This scaffold intentionally does not yet include faction-specific supplemental trackers or secondary components. Rules remain manual.',
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
        id: 'mystics-rite-a',
        name: 'Rite A',
        faction: 'mystics',
        family: 'rite-card',
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
      'supplementals/trackers/command.png': 'https://example.invalid/command.png',
      'backs/intelligence.png': 'https://example.invalid/black-back.png',
      'backs/military.png': 'https://example.invalid/military-back.png',
    },
  };
  return { save, starters, supplementals, assets };
}

describe('TTS ready supplemental save assembly', () => {
  it('places ready components only into starter Bags for their faction and expands quantity', () => {
    const { save, starters, supplementals, assets } = fixture();
    const result = assembleReadySupplementals(save, starters, supplementals, assets);

    expect(result.placedCount).toBe(3);
    const mystics = result.save.ObjectStates[0];
    const military = result.save.ObjectStates[1];
    const mysticsSupplementals = mystics.ContainedObjects.filter((object: any) => object.GMNotes?.startsWith('gauntlet:supplemental:'));
    const militarySupplementals = military.ContainedObjects.filter((object: any) => object.GMNotes?.startsWith('gauntlet:supplemental:'));

    expect(mysticsSupplementals).toHaveLength(2);
    expect(mysticsSupplementals.every((object: any) => object.Nickname === 'Rite A')).toBe(true);
    expect(militarySupplementals).toHaveLength(1);
    expect(militarySupplementals[0].Nickname).toBe('Military Ready Card');
    expect(mystics.Description).toContain('Ready faction supplementals: Rite A ×2');
    expect(military.Description).toContain('Ready faction supplementals: Military Ready Card');
  });

  it('creates public supplemental cards with hosted face and reverse URLs', () => {
    const { save, starters, supplementals, assets } = fixture();
    const result = assembleReadySupplementals(save, starters, supplementals, assets);
    const card = result.save.ObjectStates[0].ContainedObjects.find((object: any) => object.GMNotes === 'gauntlet:supplemental:mystics-rite-a');

    expect(card.Name).toBe('CardCustom');
    expect(card.Hands).toBe(false);
    expect(card.CardID).toBe(20000);
    expect(card.CustomDeck['200'].FaceURL).toBe('https://example.invalid/rite-a.png');
    expect(card.CustomDeck['200'].BackURL).toBe('https://example.invalid/completed.png');
    expect(card.CustomDeck['200'].BackIsHidden).toBe(true);
    expect(card.CustomDeck['200'].UniqueBack).toBe(false);
  });

  it('creates non-stackable sliding tracker tiles with faction-color backs, production snap points, and tagged Leader covers', () => {
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
      physicalScale: { minimum: 0, maximum: 4 },
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
          { value: 0, offset: 0 },
          { value: 1, offset: 0.8 },
          { value: 2, offset: 1.3 },
          { value: 3, offset: 1.8 },
          { value: 4, offset: 2.3 },
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
    expect(tracker.CustomImage.ImageSecondaryURL).not.toBe('https://example.invalid/black-back.png');
    expect(tracker.CustomImage.CustomTile.Stackable).toBe(false);
    expect(tracker.AttachedSnapPoints).toHaveLength(5);
    expect(tracker.AttachedSnapPoints[0].Position.z).toBe(0);
    expect(tracker.AttachedSnapPoints[4].Position.z).toBe(2.3);
    expect(tracker.AttachedSnapPoints.every((point: any) => point.Tags.includes('military-command'))).toBe(true);
    expect(leader.Tags).toContain('military-command');
  });

  it('is idempotent when assembly runs more than once', () => {
    const { save, starters, supplementals, assets } = fixture();
    const first = assembleReadySupplementals(save, starters, supplementals, assets).save;
    const second = assembleReadySupplementals(first, starters, supplementals, assets).save;

    const mysticsSupplementals = second.ObjectStates[0].ContainedObjects.filter((object: any) => object.GMNotes?.startsWith('gauntlet:supplemental:'));
    expect(mysticsSupplementals).toHaveLength(2);
    expect(second.ObjectStates[0].Description.match(/Ready faction supplementals:/g)).toHaveLength(1);
  });

  it('fails closed when a ready component has an unsupported save representation', () => {
    const { save, starters, supplementals, assets } = fixture();
    supplementals.ready[0].representation = 'ledger';

    expect(() => assembleReadySupplementals(save, starters, supplementals, assets)).toThrow(/unsupported save representation ledger/);
  });

  it('updates the scaffold note without pretending rules are automated', () => {
    const { save, starters, supplementals, assets } = fixture();
    const result = assembleReadySupplementals(save, starters, supplementals, assets);

    expect(result.save.Note).toContain('marked ready are included automatically');
    expect(result.save.Note).toContain('single-sided faction components use faction-color backs');
    expect(result.save.Note).toContain('production-derived snap registration');
    expect(result.save.Note).toContain('Rules remain manual');
    expect(result.save.Rules).toBe(result.save.Note);
  });
});