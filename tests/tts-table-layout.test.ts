import { describe, expect, it } from 'vitest';
import {
  applyTableLayout,
  buildTableSnapPoints,
  buildTableTextObjects,
  buildTableVectorLines,
} from '../tts/apply-table-layout.mjs';

describe('authoritative TTS table layout', () => {
  it('marks the final tested Gauntlet player workspaces', () => {
    const text = buildTableTextObjects([]);
    const labels = text.map(object => object.Text.Text);

    for (const label of [
      'Leader & References',
      'Draw Pile',
      'Discard Pile',
      'Graveyard',
      'Hand',
      'Asset Bank',
      'Faction Zone',
    ]) {
      expect(labels.filter(value => value === label)).toHaveLength(4);
    }
    expect(labels).not.toContain('Leader + Tracker(s)');
    expect(labels).not.toContain('Treasury');
    expect(labels).not.toContain('Battle');
    expect(labels).not.toContain('Front Line');
    expect(text.filter(object => object.Transform.rotY === 0)).toHaveLength(14);
    expect(text.filter(object => object.Transform.rotY === 180)).toHaveLength(14);

    const redLeaderLabel = text.find(object => object.GMNotes === 'gauntlet:table-layout:red-leader-references:label');
    const redHandLabel = text.find(object => object.GMNotes === 'gauntlet:table-layout:red-hand:label');
    const redGraveyardLabel = text.find(object => object.GMNotes === 'gauntlet:table-layout:red-graveyard:label');
    expect(redLeaderLabel?.Transform.posX).toBe(-12.25);
    expect(redHandLabel?.Transform.posZ).toBeLessThan(-20);
    expect(redGraveyardLabel?.Transform.posX).toBe(17.15);
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
    expect(snaps).toHaveLength(80);
  });

  it('faces every player workspace card toward its player instead of using label orientation', () => {
    const snaps = buildTableSnapPoints();
    const faction = snaps.filter(point => point.Tags?.includes('gauntlet-faction-zone'));
    const deedStacks = snaps.filter(point => point.Tags?.includes('gauntlet-deed-stack'));

    const redFaction = faction.filter(point => point.Position.z < 0);
    const blueFaction = faction.filter(point => point.Position.z > 0);
    expect(redFaction).toHaveLength(12);
    expect(blueFaction).toHaveLength(12);
    expect(redFaction.every(point => point.Rotation.y === 180)).toBe(true);
    expect(blueFaction.every(point => point.Rotation.y === 0)).toBe(true);

    const redDeedStack = deedStacks.find(point => point.Position.z < 0);
    const blueDeedStack = deedStacks.find(point => point.Position.z > 0);
    expect(redDeedStack?.Rotation.y).toBe(270);
    expect(blueDeedStack?.Rotation.y).toBe(90);

    const redDraw = snaps.find(point => point.Position.x === -1.55 && point.Position.z === -13.55);
    const redDiscard = snaps.find(point => point.Position.x === 1.55 && point.Position.z === -13.55);
    const redHandParking = snaps.find(point => point.Position.x === 0 && point.Position.z === -18.25);
    const redGraveyard = snaps.find(point => point.Position.x === 17.15 && point.Position.z === -17.75);
    for (const point of [redDraw, redDiscard, redHandParking, redGraveyard]) expect(point?.Rotation.y).toBe(180);

    const blueDraw = snaps.find(point => point.Position.x === 1.55 && point.Position.z === 13.55);
    const blueDiscard = snaps.find(point => point.Position.x === -1.55 && point.Position.z === 13.55);
    const blueHandParking = snaps.find(point => point.Position.x === 0 && point.Position.z === 18.25);
    const blueGraveyard = snaps.find(point => point.Position.x === -17.15 && point.Position.z === 17.75);
    for (const point of [blueDraw, blueDiscard, blueHandParking, blueGraveyard]) expect(point?.Rotation.y).toBe(0);
  });

  it('draws only the six primary Territory guides at the recovered slot size', () => {
    const lines = buildTableVectorLines();
    expect(lines).toHaveLength(40);

    const territoryLines = lines.filter(line => {
      const xs = line.points3.map(point => point.x);
      return Math.min(...xs) === -1.9 && Math.max(...xs) === 1.9;
    });
    expect(territoryLines).toHaveLength(12);
    expect(territoryLines.filter(line => line.thickness === 0.105)).toHaveLength(6);
    expect(territoryLines.filter(line => line.thickness === 0.048)).toHaveLength(6);
  });

  it('owns the environment, seat orientation, and two broad real player HandTrigger zones without Fog of War volumes', () => {
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
    expect(result.textObjectCount).toBe(28);
    expect(result.vectorLineCount).toBe(40);
    expect(result.snapPointCount).toBe(80);

    expect(save.Table).toBe('Table_Custom');
    expect(save.TableURL).toContain('campaign-map-table');
    expect(save.SkyURL).toContain('command-tent-panorama');
    expect(save.Turns.TurnColor).toBe('Red');

    const red = save.Hands.HandTransforms.find((hand: any) => hand.Color === 'Red');
    const blue = save.Hands.HandTransforms.find((hand: any) => hand.Color === 'Blue');
    expect(save.Hands.DisableUnused).toBe(false);
    expect(red.Transform).toMatchObject({ posZ: -23, rotY: 180, scaleX: 34, scaleY: 2, scaleZ: 5.5 });
    expect(blue.Transform).toMatchObject({ posZ: 23, rotY: 0, scaleX: 34, scaleY: 2, scaleZ: 5.5 });

    const handTriggers = save.ObjectStates.filter((object: any) => object.Name === 'HandTrigger');
    expect(handTriggers).toHaveLength(2);
    expect(handTriggers.find((object: any) => object.Nickname === 'Red Hand')?.Transform).toEqual(red.Transform);
    expect(handTriggers.find((object: any) => object.Nickname === 'Blue Hand')?.Transform).toEqual(blue.Transform);
    expect(handTriggers.find((object: any) => object.Nickname === 'Red Hand')?.ColorDiffuse).toMatchObject({ r: 0.856, g: 0.1, b: 0.094 });
    expect(handTriggers.find((object: any) => object.Nickname === 'Blue Hand')?.ColorDiffuse).toMatchObject({ r: 0.118, g: 0.53, b: 1 });
    expect(save.ObjectStates.filter((object: any) => object.Name === 'FogOfWarTrigger')).toHaveLength(0);
    expect(save.Note).toContain('actual Red/Blue TTS Hand Zones');
    expect(save.LuaScript).toContain('function gauntletSeatCamera(color)');
    expect(save.LuaScript).toContain('pitch = 55, yaw = 0, distance = 38');
    expect(save.LuaScript).toContain('pitch = 55, yaw = 180, distance = 38');

    const starter = save.ObjectStates.find((object: any) => object.GUID === 'starter');
    const handEligible = [starter.ContainedObjects[0], starter.ContainedObjects[1], starter.ContainedObjects[1].ContainedObjects[0]];
    expect(handEligible.every((object: any) => object.Hands === true)).toBe(true);
  });
});
