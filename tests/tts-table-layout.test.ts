import { describe, expect, it } from 'vitest';
import {
  applyTableLayout,
  buildTableSnapPoints,
  buildTableTextObjects,
  buildTableVectorLines,
} from '../tts/apply-table-layout.mjs';

describe('authoritative TTS table layout', () => {
  it('marks the actual Gauntlet player workspaces', () => {
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
    expect(deeds.every(point => point.Rotation.y === 90)).toBe(true);
    expect(snaps).toHaveLength(80);
  });

  it('draws only the six primary Territory guides', () => {
    const lines = buildTableVectorLines();
    expect(lines).toHaveLength(40);

    const territoryLines = lines.filter(line => {
      const xs = line.points3.map(point => point.x);
      return Math.min(...xs) === -1.85 && Math.max(...xs) === 1.85;
    });
    expect(territoryLines).toHaveLength(12);
    expect(territoryLines.filter(line => line.thickness === 0.105)).toHaveLength(6);
    expect(territoryLines.filter(line => line.thickness === 0.048)).toHaveLength(6);
  });

  it('owns the environment, seats, hands, and player-side private zones without duplicate HandTrigger objects', () => {
    const save: any = {
      ObjectStates: [],
      Note: 'base note',
      Rules: 'base rules',
      Turns: { TurnColor: 'Blue' },
    };

    const result = applyTableLayout(save);
    expect(result.textObjectCount).toBe(28);
    expect(result.vectorLineCount).toBe(40);
    expect(result.snapPointCount).toBe(80);
    expect(result.privateZoneCount).toBe(2);

    expect(save.Table).toBe('Table_Custom');
    expect(save.TableURL).toContain('campaign-map-table');
    expect(save.SkyURL).toContain('command-tent-panorama');
    expect(save.Turns.TurnColor).toBe('Red');

    const red = save.Hands.HandTransforms.find((hand: any) => hand.Color === 'Red');
    const blue = save.Hands.HandTransforms.find((hand: any) => hand.Color === 'Blue');
    expect(red.Transform.posZ).toBeLessThan(0);
    expect(red.Transform.rotY).toBe(0);
    expect(blue.Transform.posZ).toBeGreaterThan(0);
    expect(blue.Transform.rotY).toBe(180);
    expect(save.ObjectStates.filter((object: any) => object.Name === 'HandTrigger')).toHaveLength(0);

    const privateZones = save.ObjectStates.filter((object: any) => object.Name === 'FogOfWarTrigger');
    expect(privateZones).toHaveLength(2);
    expect(privateZones.map((zone: any) => zone.FogColor).sort()).toEqual(['Blue', 'Red']);
    expect(privateZones.every((zone: any) => zone.FogReverseHiding === false)).toBe(true);
    expect(privateZones.every((zone: any) => zone.FogSeethrough === true)).toBe(true);
  });
});
