import { describe, expect, it } from 'vitest';
import {
  applyTableLayout,
  buildTableSnapPoints,
  buildTableTextObjects,
  buildTableVectorLines,
} from '../scripts/apply-tts-table-layout.mjs';

describe('TTS table layout', () => {
  it('marks the canonical player zones without inventing battle or Front Line zones', () => {
    const text = buildTableTextObjects([]);
    const labels = text.map(object => object.Text.Text);

    for (const label of [
      'Leader + Tracker(s)',
      'Draw Pile',
      'Discard Pile',
      'Graveyard',
      'Hand',
      'Asset Bank',
      'Treasury',
    ]) {
      expect(labels.filter(value => value === label)).toHaveLength(2);
    }
    expect(labels).not.toContain('Battle');
    expect(labels).not.toContain('Front Line');
    expect(text.filter(object => object.Transform.rotY === 0)).toHaveLength(7);
    expect(text.filter(object => object.Transform.rotY === 180)).toHaveLength(7);
  });

  it('supports six normal Territories plus two Manifest Destiny extensions and unmarked Deed snaps', () => {
    const snaps = buildTableSnapPoints();
    const territory = snaps.filter(point => point.Position.x === 0);
    const deeds = snaps.filter(point => Math.abs(point.Position.x) === 4.1);

    expect(territory.map(point => point.Position.z)).toEqual([
      -10.5, -7.5, -4.5, -1.5, 1.5, 4.5, 7.5, 10.5,
    ]);
    expect(territory.every(point => point.Rotation.y === 90)).toBe(true);
    expect(deeds).toHaveLength(16);
    for (const z of territory.map(point => point.Position.z)) {
      expect(deeds.filter(point => point.Position.z === z)).toHaveLength(2);
    }
    expect(snaps).toHaveLength(30);
  });

  it('draws only the six primary Gauntlet slots strongly and keeps the two extension slots secondary', () => {
    const lines = buildTableVectorLines();
    expect(lines).toHaveLength(22);

    const territoryLines = lines.filter(line => {
      const xs = line.points3.map(point => point.x);
      return Math.min(...xs) === -1.9 && Math.max(...xs) === 1.9;
    });
    expect(territoryLines).toHaveLength(8);
    expect(territoryLines.filter(line => line.thickness === 0.065)).toHaveLength(6);
    expect(territoryLines.filter(line => line.thickness === 0.04)).toHaveLength(2);
  });

  it('repositions the initial pawns away from the extension Territory snaps', () => {
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
    expect(result.textObjectCount).toBe(14);
    expect(result.vectorLineCount).toBe(22);
    expect(result.snapPointCount).toBe(30);

    const redPawn = save.ObjectStates.find(object => object.Nickname === 'Red Player Token');
    const bluePawn = save.ObjectStates.find(object => object.Nickname === 'Blue Player Token');
    expect([redPawn?.Transform.posX, redPawn?.Transform.posZ]).toEqual([-5, -10.4]);
    expect([bluePawn?.Transform.posX, bluePawn?.Transform.posZ]).toEqual([5, 10.4]);
    expect(save.Note).toContain('hidden TTS hand zone remains the private Reserve area');
  });
});
