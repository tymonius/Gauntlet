import { describe, expect, it } from 'vitest';
import { assembleReadySupplementals } from '../scripts/assemble-tts-supplemental-save.mjs';

function tracker(id: string, name: string, cover: any, snapTag: string, layer: number, faceFile: string) {
  return {
    id,
    name,
    faction: 'intelligence',
    family: 'tracker',
    quantity: 1,
    productionStatus: 'ready',
    representation: 'sliding-tracker',
    cover,
    physicalScale: { minimum: 0, maximum: 4 },
    tts: {
      faceFile,
      widthScale: 2.5,
      heightScale: 3.5,
      thickness: 0.05,
      stackable: false,
      assembly: 'intelligence-progress',
      axis: 'vertical',
      layer,
      snapTag,
      snapPoints: [
        { value: 0, registrationFraction: 0 },
        { value: 1, registrationFraction: 0.12 },
        { value: 2, registrationFraction: 0.24 },
        { value: 3, registrationFraction: 0.36 },
        { value: 4, registrationFraction: 0.48 },
      ],
    },
  };
}

describe('Intelligence nested tracker stack', () => {
  it('tags the Leader for Intel and the Intel Tracker for Operation Progress', () => {
    const save = {
      Note: '',
      Rules: '',
      ObjectStates: [{
        Name: 'Bag',
        Nickname: 'Intelligence Starter — Ranger',
        Description: 'Starter kit',
        GUID: 'intel1',
        ContainedObjects: [{
          Name: 'CardCustom',
          Nickname: 'Ranger',
          GUID: 'lead01',
          CardID: 10000,
        }],
      }],
    };

    const starters = {
      gameVersion: 'current-test',
      decks: [{
        id: 'intelligence-starter',
        name: 'Intelligence Starter',
        factionId: 'intelligence',
        leader: { name: 'Ranger', tts: { cardId: 10000 } },
        back: { file: 'backs/intelligence.png', policy: 'standardBack' },
        factionComponentBack: { file: 'backs/intelligence.png', policy: 'factionComponentBack' },
      }],
    };

    const intel = tracker(
      'intelligence-intel-tracker',
      'Intel Tracker',
      { kind: 'leader' },
      'intelligence-intel',
      2,
      'supplementals/trackers/intel.png',
    );
    const progress = tracker(
      'intelligence-operation-progress-tracker',
      'Operation Progress Tracker',
      { kind: 'component', componentId: 'intelligence-intel-tracker' },
      'intelligence-operation-progress',
      1,
      'supplementals/trackers/progress.png',
    );

    const supplementals = {
      gameVersion: 'current-test',
      readyCount: 2,
      ready: [progress, intel],
    };
    const assets = {
      gameVersion: 'current-test',
      releaseTag: 'current-test',
      bySourceFile: {
        'supplementals/trackers/intel.png': 'https://example.invalid/intel.png',
        'supplementals/trackers/progress.png': 'https://example.invalid/progress.png',
        'backs/intelligence.png': 'https://example.invalid/intelligence-back.png',
      },
    };

    const result = assembleReadySupplementals(save, starters, supplementals, assets);
    const objects = result.save.ObjectStates[0].ContainedObjects;
    const leader = objects.find((object: any) => object.CardID === 10000);
    const intelTile = objects.find((object: any) => object.GMNotes === 'gauntlet:supplemental:intelligence-intel-tracker');
    const progressTile = objects.find((object: any) => object.GMNotes === 'gauntlet:supplemental:intelligence-operation-progress-tracker');

    expect(leader.Tags).toContain('intelligence-intel');
    expect(leader.Tags).not.toContain('intelligence-operation-progress');
    expect(intelTile.Tags).toContain('intelligence-operation-progress');
    expect(intelTile.Tags).toContain('intelligence-intel');
    expect(progressTile.Tags).toContain('intelligence-operation-progress');
  });
});