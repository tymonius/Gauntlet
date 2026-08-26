import { describe, expect, it } from 'vitest';
import {
  applyTableLayout,
  buildTableSnapPoints,
  buildTableTextObjects,
  buildTableVectorLines,
} from '../tts/apply-table-layout.mjs';

describe('authoritative TTS table layout', () => {
  it('keeps the player workspaces while leaving the one-card Hand parking snap unmarked', () => {
    const text = buildTableTextObjects([]);
    const labels = text.map(object => object.Text.Text);

    for (const label of [
      'Leader & References',
      'Draw Pile',
      'Discard Pile',
      'Graveyard',
      'Asset Bank',
      'Faction Zone',
    ]) {
      expect(labels.filter(value => value === label)).toHaveLength(4);
    }
    expect(labels).not.toContain('Hand');
    expect(text).toHaveLength(24);

    const redHandSnap = buildTableSnapPoints().find(point => point.Position.x === 0 && point.Position.z === -18.25);
    const blueHandSnap = buildTableSnapPoints().find(point => point.Position.x === 0 && point.Position.z === 18.25);
    expect(redHandSnap?.Rotation.y).toBe(180);
    expect(blueHandSnap?.Rotation.y).toBe(0);
  });

  it('keeps six visible Gauntlet slots plus two invisible Manifest Destiny extensions and sixteen landscape Deed snaps', () => {
    const snaps = buildTableSnapPoints();
    const territory = snaps.filter(point => point.Tags?.includes('gauntlet-territory'));
    const deeds = snaps.filter(point => point.Tags?.includes('gauntlet-deed'));

    expect(territory.map(point => point.Position.z)).toEqual([
      -10.5, -7.5, -4.5, -1.5, 1.5, 4.5, 7.5, 10.5,
    ]);
    expect(territory.every(point => point.Rotation.y === 90)).toBe(true);
    expect(deeds).toHaveLength(16);
    expect(deeds.every(point => Math.abs(point.Position.x) === 4.35)).toBe(true);
    expect(deeds.every(point => point.Rotation.y === 90)).toBe(true);
    expect(snaps).toHaveLength(78);
    expect(snaps.filter(point => point.Tags?.includes('gauntlet-deed-stack'))).toHaveLength(0);
  });

  it('uses normal Faction Zone magnets without a second Deed-stack magnet system', () => {
    const snaps = buildTableSnapPoints();
    const faction = snaps.filter(point => point.Tags?.includes('gauntlet-faction-zone'));
    const redFaction = faction.filter(point => point.Position.z < 0);
    const blueFaction = faction.filter(point => point.Position.z > 0);

    expect(redFaction).toHaveLength(12);
    expect(blueFaction).toHaveLength(12);
    expect(redFaction.every(point => point.Rotation.y === 180)).toBe(true);
    expect(blueFaction.every(point => point.Rotation.y === 0)).toBe(true);
  });

  it('draws no Hand parking rectangle and only the six primary Territory guides', () => {
    const lines = buildTableVectorLines();
    expect(lines).toHaveLength(36);

    const territoryLines = lines.filter(line => {
      const xs = line.points3.map(point => point.x);
      return Math.min(...xs) === -1.9 && Math.max(...xs) === 1.9;
    });
    expect(territoryLines).toHaveLength(12);
    expect(territoryLines.filter(line => line.thickness === 0.105)).toHaveLength(6);
    expect(territoryLines.filter(line => line.thickness === 0.048)).toHaveLength(6);

    const redHandRectangle = lines.find(line => {
      const zs = line.points3.map(point => point.z);
      const xs = line.points3.map(point => point.x);
      return Math.min(...xs) === -1.425 && Math.max(...xs) === 1.425
        && Math.min(...zs) === -20.25 && Math.max(...zs) === -16.25;
    });
    expect(redHandRectangle).toBeUndefined();
  });

  it('uses one canonical serialized hand-zone system aligned with the seat cameras', () => {
    const save: any = {
      ObjectStates: [
        { Name: 'HandTrigger', GUID: 'legacy-hand' },
        { Name: 'FogOfWarTrigger', GMNotes: 'gauntlet:private-zone:red', GUID: 'legacy-fog' },
        {
          Name: 'Bag',
          GUID: 'starter',
          ContainedObjects: [
            { Name: 'CardCustom', GUID: 'card', Hands: false },
            { Name: 'DeckCustom', GUID: 'deck', Hands: false, ContainedObjects: [{ Name: 'CardCustom', GUID: 'inside', Hands: false }] },
          ],
        },
      ],
      Note: 'base note',
      Rules: 'base rules',
      LuaScript: '',
      Turns: { TurnColor: 'Blue' },
    };

    const result = applyTableLayout(save);
    expect(result.textObjectCount).toBe(24);
    expect(result.vectorLineCount).toBe(36);
    expect(result.snapPointCount).toBe(78);

    const red = save.Hands.HandTransforms.find((hand: any) => hand.Color === 'Red');
    const blue = save.Hands.HandTransforms.find((hand: any) => hand.Color === 'Blue');
    expect(save.Hands.DisableUnused).toBe(false);
    expect(red.Transform).toMatchObject({ posZ: -23, rotY: 0, scaleX: 7, scaleY: 2.5, scaleZ: 3 });
    expect(blue.Transform).toMatchObject({ posZ: 23, rotY: 180, scaleX: 7, scaleY: 2.5, scaleZ: 3 });

    expect(save.ObjectStates.filter((object: any) => object.Name === 'HandTrigger')).toHaveLength(0);
    expect(save.ObjectStates.filter((object: any) => object.Name === 'FogOfWarTrigger')).toHaveLength(0);
    expect(save.LuaScript).toContain('pitch = 55, yaw = 0, distance = 38');
    expect(save.LuaScript).toContain('pitch = 55, yaw = 180, distance = 38');

    const starter = save.ObjectStates.find((object: any) => object.GUID === 'starter');
    const handEligible = [starter.ContainedObjects[0], starter.ContainedObjects[1], starter.ContainedObjects[1].ContainedObjects[0]];
    expect(handEligible.every((object: any) => object.Hands === true)).toBe(true);
  });

  it('changes Territory flip behavior without altering its cardback data', () => {
    const originalCustomDeck = {
      '200': {
        FaceURL: 'https://example.invalid/territory.png',
        BackURL: 'https://example.invalid/standard-cardback.png',
      },
    };
    const save: any = {
      ObjectStates: [{
        Name: 'Bag', GUID: 'starter', ContainedObjects: [{
          Name: 'CardCustom', Description: 'Territory', GUID: 'territory', Transform: {}, CustomDeck: structuredClone(originalCustomDeck),
        }],
      }],
      Note: '', Rules: '', Turns: {},
    };

    applyTableLayout(save);
    const territory = save.ObjectStates.find((object: any) => object.GUID === 'starter').ContainedObjects[0];
    expect(territory.CustomDeck).toEqual(originalCustomDeck);
    expect(territory.SidewaysCard).toBe(true);
    expect(territory.Transform.rotY).toBe(90);
    expect(territory.LuaScript).toContain('self.use_rotation_value_flip = true');
  });
});
