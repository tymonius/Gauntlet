import { describe, expect, it } from 'vitest';
import { assembleReadySupplementals } from '../scripts/assemble-tts-supplemental-save.mjs';

function bag(nickname: string, guid: string) {
  return {
    Name: 'Bag',
    Nickname: nickname,
    Description: 'Starter kit',
    GUID: guid,
    ContainedObjects: [
      { Name: 'CardCustom', Nickname: 'Existing card', GUID: `${guid.slice(0, 5)}a` },
    ],
  };
}

function fixture() {
  const save = {
    Note: 'This scaffold intentionally does not yet include faction-specific supplemental trackers or secondary components. Rules remain manual.',
    Rules: 'This scaffold intentionally does not yet include faction-specific supplemental trackers or secondary components. Rules remain manual.',
    ObjectStates: [
      bag('Mystics Starter — Alchemist', '000010'),
      bag('Military Starter — General', '000020'),
    ],
  };
  const starters = {
    gameVersion: 'current-test',
    decks: [
      { id: 'mystics-starter', name: 'Mystics Starter', factionId: 'mystics', leader: { name: 'Alchemist' } },
      { id: 'military-starter', name: 'Military Starter', factionId: 'military', leader: { name: 'General' } },
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
    supplementals.ready[0].representation = 'sliding-tracker';

    expect(() => assembleReadySupplementals(save, starters, supplementals, assets)).toThrow(/unsupported save representation sliding-tracker/);
  });

  it('updates the scaffold note without pretending rules are automated', () => {
    const { save, starters, supplementals, assets } = fixture();
    const result = assembleReadySupplementals(save, starters, supplementals, assets);

    expect(result.save.Note).toContain('marked ready are included automatically');
    expect(result.save.Note).toContain('pending components remain excluded');
    expect(result.save.Note).toContain('Rules remain manual');
    expect(result.save.Rules).toBe(result.save.Note);
  });
});
