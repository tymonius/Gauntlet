import { describe, expect, it } from 'vitest';
import {
  applyTableLayout,
  buildTableSnapPoints,
  buildTableTextObjects,
  buildTableVectorLines,
} from '../tts/apply-table-layout.mjs';

describe('TTS table layout', () => {
  it('marks the current player workspaces without inventing battle or Front Line zones', () => {
    const text = buildTableTextObjects([]);
    const labels = text.map(object => object.Text.Text);

    for (const label of [
      'Leader + Tracker(s)',
      'Draw Pile',
      'Discard Pile',
      'Graveyard',
      'Hand',
      'Asset Bank',
      'Faction Zone',
    ]) {
      // Each side gets a visible label plus a shadow object for map contrast.
      expect(labels.filter(value => value === label)).toHaveLength(4);
    }
    expect(labels).not.toContain('Treasury');
    expect(labels).not.toContain('Battle');
    expect(labels).not.toContain('Front Line');
    expect(text.filter(object => object.Transform.rotY === 0)).toHaveLength(14);
    expect(text.filter(object => object.Transform.rotY === 180)).toHaveLength(14);
  });

  it('supports six normal Territories plus two Manifest Destiny extensions and unmarked tagged Deed snaps', () => {
    const snaps = buildTableSnapPoints();
    const territory = snaps.filter(point => point.Tags?.includes('gauntlet-territory'));
    const deeds = snaps.filter(point => point.Tags?.includes('gauntlet-deed'));

    expect(territory.map(point => point.Position.z)).toEqual([
      -10.5, -7.5, -4.5, -1.5, 1.5, 4.5, 7.5, 10.5,
    ]);
    expect(territory.every(point => point.Rotation.y === 90)).toBe(true);
    expect(deeds).toHaveLength(16);
    for (const z of territory.map(point => point.Position.z)) {
      expect(deeds.filter(point => point.Position.z === z)).toHaveLength(2);
    }
    expect(snaps).toHaveLength(86);
  });

  it('draws outlined player zones and all eight intermediate Gauntlet slot guides', () => {
    const lines = buildTableVectorLines();
    expect(lines).toHaveLength(44);

    const territoryLines = lines.filter(line => {
      const xs = line.points3.map(point => point.x);
      return Math.min(...xs) === -1.9 && Math.max(...xs) === 1.9;
    });
    expect(territoryLines).toHaveLength(16);
    expect(territoryLines.filter(line => line.thickness === 0.105)).toHaveLength(6);
    expect(territoryLines.filter(line => line.thickness === 0.048)).toHaveLength(6);
    expect(territoryLines.filter(line => line.thickness === 0.075)).toHaveLength(2);
    expect(territoryLines.filter(line => line.thickness === 0.032)).toHaveLength(2);
  });

  it('applies the complete intermediate map layout before the later QA interaction pass', () => {
    const save = {
      ObjectStates: [
        { Name: 'Die_6', Nickname: 'Red Battle Die', Transform: { posX: -4.5, posZ: -12.5, rotY: 0 }, GUID: '000001' },
        { Name: 'Die_6', Nickname: 'Blue Battle Die', Transform: { posX: 4.5, posZ: 12.5, rotY: 0 }, GUID: '000002' },
        { Name: 'PlayerPawn', Nickname: 'Red Player Token', Transform: { posX: 0, posZ: -10.5, rotY: 0 }, GUID: '000003' },
        { Name: 'PlayerPawn', Nickname: 'Blue Player Token', Transform: { posX: 0, posZ: 10.5, rotY: 180 }, GUID: '000004' },
      ],
      Note: 'base note',
      Rules: 'base rules',
    };

    const result = applyTableLayout(save);
    expect(result.textObjectCount).toBe(28);
    expect(result.vectorLineCount).toBe(44);
    expect(result.snapPointCount).toBe(86);

    const redPawn = save.ObjectStates.find(object => object.Nickname === 'Red Player Token');
    const bluePawn = save.ObjectStates.find(object => object.Nickname === 'Blue Player Token');
    expect([redPawn?.Transform.posX, redPawn?.Transform.posZ]).toEqual([-17.4, -10]);
    expect([bluePawn?.Transform.posX, bluePawn?.Transform.posZ]).toEqual([17.4, 10]);
    expect(save.Note).toContain('flexible twelve-snap Faction Zone');
  });
});
