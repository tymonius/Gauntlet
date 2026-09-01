import { describe, expect, it } from 'vitest';
import {
  applyTableLayout,
  buildTableSnapPoints,
  buildTableTextObjects,
  buildTableVectorLines,
  handZoneTransform,
  parkingHiddenZoneTransform,
} from '../tts/apply-table-layout.mjs';

function zoneContainsPoint(zone: any, x: number, z: number) {
  return Math.abs(x - zone.posX) <= zone.scaleX / 2
    && Math.abs(z - zone.posZ) <= zone.scaleZ / 2;
}

function close(a: number, b: number, tolerance = 0.001) {
  return Math.abs(a - b) <= tolerance;
}

const TEST_ENVIRONMENT = {
  TableURL: 'https://github.com/tymonius/Gauntlet/releases/download/v0.7.0/Gauntlet_v0.7.0_TTS_Environment_Table.png',
  SkyURL: 'https://github.com/tymonius/Gauntlet/releases/download/v0.7.0/Gauntlet_v0.7.0_TTS_Environment_Panorama.png',
};

describe('authoritative TTS table layout', () => {
  it('uses functional east/west workspace grouping with wide private strips', () => {
    const text = buildTableTextObjects([]);
    const labels = text.map(object => object.Text.Text);

    for (const label of [
      'Draw',
      'Discard',
      'Graveyard',
      'Private / Hand',
      'Asset Bank',
      'Faction / Leader & References',
    ]) {
      expect(labels.filter(value => value === label)).toHaveLength(4);
    }
    expect(labels.filter(value => value === 'Gambits')).toHaveLength(4);
    expect(labels.filter(value => value === 'Tactics')).toHaveLength(4);
    expect(text).toHaveLength(32);

    const whitePrivate = buildTableSnapPoints().filter(point => point.Position.z === -18.65);
    const greenPrivate = buildTableSnapPoints().filter(point => point.Position.z === 18.65);
    expect(whitePrivate).toHaveLength(6);
    expect(greenPrivate).toHaveLength(6);
    expect(whitePrivate.every(point => point.Rotation.y === 180)).toBe(true);
    expect(greenPrivate.every(point => point.Rotation.y === 0)).toBe(true);
  });

  it('keeps six visible Gauntlet slots plus two invisible Manifest Destiny extensions and sixteen landscape Deed snaps', () => {
    const snaps = buildTableSnapPoints();
    const territory = snaps.filter(point => point.Tags?.includes('gauntlet-territory'));
    const deeds = snaps.filter(point => point.Tags?.includes('gauntlet-deed'));

    expect(territory.map(point => point.Position.z)).toEqual([
      -10.5, -7.5, -4.5, -1.5, 1.5, 4.5, 7.5, 10.5,
    ]);
    expect(territory.every(point => point.Rotation === undefined)).toBe(true);
    expect(deeds).toHaveLength(16);
    expect(deeds.every(point => Math.abs(point.Position.x) === 4.35)).toBe(true);
    expect(deeds.every(point => point.Rotation === undefined)).toBe(true);
    expect(snaps).toHaveLength(108);
    expect(snaps.filter(point => point.Tags?.includes('gauntlet-deed-stack'))).toHaveLength(0);
  });

  it('groups both Asset Banks and the shared Battle Zone on the west side', () => {
    const snaps = buildTableSnapPoints();
    const whiteAssets = snaps.filter(point => point.Position.z === -8.3 && point.Position.x < -6);
    const greenAssets = snaps.filter(point => point.Position.z === 8.3 && point.Position.x < -6);
    const whiteBattle = snaps.filter(point => point.Position.z === -2.15);
    const greenBattle = snaps.filter(point => point.Position.z === 2.15);

    expect(whiteAssets).toHaveLength(7);
    expect(greenAssets).toHaveLength(7);
    expect(whiteBattle).toHaveLength(10);
    expect(greenBattle).toHaveLength(10);
    expect(whiteBattle.every(point => point.Rotation.y === 180)).toBe(true);
    expect(greenBattle.every(point => point.Rotation.y === 0)).toBe(true);

    const battleLines = buildTableVectorLines().filter(line => {
      const xs = line.points3.map(point => point.x);
      const zs = line.points3.map(point => point.z);
      return close(Math.min(...xs), -18.7) && close(Math.max(...xs), -6.1)
        && close(Math.min(...zs), -4.3) && close(Math.max(...zs), 4.3);
    });
    expect(battleLines).toHaveLength(2);
  });

  it('merges Faction, Leader, and reference space on the east side while preserving Faction magnets', () => {
    const snaps = buildTableSnapPoints();
    const faction = snaps.filter(point => point.Tags?.includes('gauntlet-faction-zone'));
    const whiteFaction = faction.filter(point => point.Position.z < 0);
    const greenFaction = faction.filter(point => point.Position.z > 0);
    expect(whiteFaction).toHaveLength(12);
    expect(greenFaction).toHaveLength(12);
    expect(whiteFaction.every(point => point.Rotation.y === 180)).toBe(true);
    expect(greenFaction.every(point => point.Rotation.y === 0)).toBe(true);

    const leaderXs = [7.65, 10.15, 12.65, 15.15];
    const whiteLeader = snaps.filter(point => point.Position.z === -13.4 && leaderXs.includes(point.Position.x));
    const greenLeader = snaps.filter(point => point.Position.z === 13.4 && leaderXs.includes(point.Position.x));
    expect(whiteLeader).toHaveLength(4);
    expect(greenLeader).toHaveLength(4);

    const factionLines = buildTableVectorLines().filter(line => {
      const xs = line.points3.map(point => point.x);
      const zs = line.points3.map(point => point.z);
      return Math.min(...xs) === 6.15 && Math.max(...xs) === 16.65
        && (Math.min(...zs) === -15.3 || Math.min(...zs) === 4.7);
    });
    expect(factionLines).toHaveLength(4);
  });

  it('keeps Graveyards isolated at the outer east edge', () => {
    const snaps = buildTableSnapPoints();
    const whiteGraveyard = snaps.find(point => point.Position.x === 18.7 && point.Position.z === -15.1);
    const greenGraveyard = snaps.find(point => point.Position.x === 18.7 && point.Position.z === 15.1);
    expect(whiteGraveyard?.Rotation.y).toBe(180);
    expect(greenGraveyard?.Rotation.y).toBe(0);
  });

  it('draws compact workspace guides, the shared Battle Zone, and only the six primary Territory guides', () => {
    const lines = buildTableVectorLines();
    expect(lines).toHaveLength(38);

    const territoryLines = lines.filter(line => {
      const xs = line.points3.map(point => point.x);
      return Math.min(...xs) === -1.9 && Math.max(...xs) === 1.9;
    });
    expect(territoryLines).toHaveLength(12);

    const whitePrivateLines = lines.filter(line => {
      const zs = line.points3.map(point => point.z);
      const xs = line.points3.map(point => point.x);
      return close(Math.min(...xs), -7) && close(Math.max(...xs), 7)
        && close(Math.min(...zs), -20.1) && close(Math.max(...zs), -17.2);
    });
    const greenPrivateLines = lines.filter(line => {
      const zs = line.points3.map(point => point.z);
      const xs = line.points3.map(point => point.x);
      return close(Math.min(...xs), -7) && close(Math.max(...xs), 7)
        && close(Math.min(...zs), 17.2) && close(Math.max(...zs), 20.1);
    });
    expect(whitePrivateLines).toHaveLength(2);
    expect(greenPrivateLines).toHaveLength(2);
  });

  it('keeps Reserve hand zones outside the wide tabletop private areas', () => {
    const white = handZoneTransform('White');
    const green = handZoneTransform('Green');
    const whiteParking = parkingHiddenZoneTransform('White');
    const greenParking = parkingHiddenZoneTransform('Green');

    expect(white).toMatchObject({ posX: 0, posY: 4, posZ: -22.7, rotY: 0, scaleX: 14, scaleY: 6, scaleZ: 4 });
    expect(green).toMatchObject({ posX: 0, posY: 4, posZ: 22.7, rotY: 180, scaleX: 14, scaleY: 6, scaleZ: 4 });
    expect(whiteParking).toMatchObject({ posX: 0, posY: 3, rotY: 0, scaleX: 14, scaleY: 6, scaleZ: 4.2 });
    expect(greenParking).toMatchObject({ posX: 0, posY: 3, rotY: 180, scaleX: 14, scaleY: 6, scaleZ: 4.2 });
    expect(whiteParking.posZ).toBeCloseTo(-19.05, 6);
    expect(greenParking.posZ).toBeCloseTo(19.05, 6);

    expect(zoneContainsPoint(white, 0, -18.65)).toBe(false);
    expect(zoneContainsPoint(green, 0, 18.65)).toBe(false);
    expect(zoneContainsPoint(whiteParking, 0, -18.65)).toBe(true);
    expect(zoneContainsPoint(greenParking, 0, 18.65)).toBe(true);
    expect(zoneContainsPoint(whiteParking, 0, -20.7)).toBe(true);
    expect(zoneContainsPoint(greenParking, 0, 20.7)).toBe(true);

    expect(zoneContainsPoint(white, -1.6, -14.25)).toBe(false);
    expect(zoneContainsPoint(white, 1.6, -14.25)).toBe(false);
    expect(zoneContainsPoint(white, 18.7, -15.1)).toBe(false);
    expect(zoneContainsPoint(green, -1.6, 14.25)).toBe(false);
    expect(zoneContainsPoint(green, 1.6, 14.25)).toBe(false);
    expect(zoneContainsPoint(green, 18.7, 15.1)).toBe(false);
  });

  it('serializes only TTS-native hand transforms and does not commandeer the camera', () => {
    const save: any = {
      ObjectStates: [
        { Name: 'HandTrigger', GUID: 'legacy-hand' },
        { Name: 'FogOfWarTrigger', GMNotes: 'gauntlet:private-zone:red', GUID: 'legacy-fog' },
        { Name: 'FogOfWarTrigger', GMNotes: 'unrelated-hidden-zone', GUID: 'other-fog' },
        {
          Name: 'Bag',
          GUID: 'starter',
          ContainedObjects: [
            { Name: 'CardCustom', GUID: 'card', Hands: false },
            { Name: 'DeckCustom', GUID: 'deck', Hands: false, ContainedObjects: [{ Name: 'CardCustom', GUID: 'inside', Hands: false }] },
            { Name: 'Custom_Tile', GUID: 'tracker', LuaScript: 'local gauntletTrackerRegistrations = {}', Tags: ['tracker-specific'] },
          ],
        },
      ],
      Note: 'base note',
      Rules: 'base rules',
      LuaScript: '-- unrelated global script',
      Turns: { TurnColor: 'Green' },
    };

    const result = applyTableLayout(Object.assign(save, TEST_ENVIRONMENT));
    expect(result.textObjectCount).toBe(32);
    expect(result.vectorLineCount).toBe(38);
    expect(result.snapPointCount).toBe(108);

    const white = save.Hands.HandTransforms.find((hand: any) => hand.Color === 'White');
    const green = save.Hands.HandTransforms.find((hand: any) => hand.Color === 'Green');
    expect(save.Hands.DisableUnused).toBe(false);
    expect(save.Hands.Hiding).toBe(0);
    expect(white.Transform).toEqual(handZoneTransform('White'));
    expect(green.Transform).toEqual(handZoneTransform('Green'));
    expect(white.Transform.rotY).toBe(0);
    expect(green.Transform.rotY).toBe(180);

    // Native Hand rotations own TTS seat/camera orientation. Tabletop card
    // snaps deliberately use the opposite rotations so cards face each player.
    const whiteTableCard = buildTableSnapPoints().find(point => point.Position.x === -5.5 && point.Position.z === -18.65);
    const greenTableCard = buildTableSnapPoints().find(point => point.Position.x === -5.5 && point.Position.z === 18.65);
    expect(whiteTableCard?.Rotation.y).toBe(180);
    expect(greenTableCard?.Rotation.y).toBe(0);

    // Reserve is serialized through Hands.HandTransforms. Parking uses exactly
    // one color-owned Hidden Zone per player and does not count as a hand.
    expect(save.ObjectStates.filter((object: any) => object.Name === 'HandTrigger')).toHaveLength(0);
    const fogZones = save.ObjectStates.filter((object: any) => object.Name === 'FogOfWarTrigger');
    const parkingZones = fogZones.filter((object: any) => String(object.GMNotes || '').startsWith('gauntlet:private-parking:'));
    expect(parkingZones).toHaveLength(2);
    expect(parkingZones.map((object: any) => object.FogColor).sort()).toEqual(['Green', 'White']);
    expect(parkingZones.every((object: any) => object.FogReverseHiding === false)).toBe(true);
    expect(parkingZones.every((object: any) => object.Hands === false)).toBe(true);
    expect(fogZones.some((object: any) => object.GUID === 'other-fog')).toBe(true);
    expect(save.Note).toContain('wide private tabletop Hand parking strip');
    expect(save.LuaScript).toBe('-- unrelated global script');
    expect(save.LuaScript).not.toContain('gauntletSeatCamera');

    const starter = save.ObjectStates.find((object: any) => object.GUID === 'starter');
    const handEligible = [starter.ContainedObjects[0], starter.ContainedObjects[1], starter.ContainedObjects[1].ContainedObjects[0]];
    expect(handEligible.every((object: any) => object.Hands === true)).toBe(true);
    const tracker = starter.ContainedObjects.find((object: any) => object.GUID === 'tracker');
    expect(tracker.Tags).toContain('tracker-specific');
    expect(tracker.Tags).toContain('gauntlet-faction-zone');
  });

  it('gives Manifest Destiny Territory-slot eligibility and physical Overlay cards attached-snap eligibility', () => {
    const save: any = {
      ObjectStates: [{
        Name: 'Bag',
        GUID: 'starter',
        ContainedObjects: [
          { Name: 'CardCustom', Nickname: 'Manifest Destiny', GMNotes: 'gauntlet:playable-card:neutral-manifest-destiny', GUID: 'manifest', Transform: {} },
          { Name: 'CardCustom', Nickname: 'Bombardment', GMNotes: 'gauntlet:playable-card:neutral-bombardment', GUID: 'bombardment', Transform: {} },
        ],
      }],
      Note: '', Rules: '', Turns: {},
    };

    applyTableLayout(Object.assign(save, TEST_ENVIRONMENT));
    const [manifest, bombardment] = save.ObjectStates.find((object: any) => object.GUID === 'starter').ContainedObjects;
    expect(manifest.Tags).toContain('gauntlet-territory');
    expect(manifest.Tags).toContain('gauntlet-faction-zone');
    expect(bombardment.Tags).toContain('gauntlet-territory-overlay');
    expect(bombardment.Tags).toContain('gauntlet-faction-zone');
  });

  it('removes the obsolete generated seat-camera script when reapplying the layout', () => {
    const save: any = {
      ObjectStates: [],
      Note: '',
      Rules: '',
      LuaScript: 'function gauntletSeatCamera(color)\nend',
      LuaScriptState: 'old camera state',
      Turns: {},
    };

    applyTableLayout(Object.assign(save, TEST_ENVIRONMENT));
    expect(save.LuaScript).toBe('');
    expect(save.LuaScriptState).toBe('');
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

    applyTableLayout(Object.assign(save, TEST_ENVIRONMENT));
    const territory = save.ObjectStates.find((object: any) => object.GUID === 'starter').ContainedObjects[0];
    expect(territory.CustomDeck).toEqual(originalCustomDeck);
    expect(territory.SidewaysCard).toBe(true);
    expect(territory.Transform.rotY).toBe(180);
    expect(String(territory.LuaScript || '')).toBe('');
    expect(String(territory.LuaScript || '')).not.toContain('tryRotate');
    expect(String(territory.LuaScript || '')).not.toContain('use_rotation_value_flip');
    expect(territory.AttachedSnapPoints).toEqual([{
      Position: { x: 0, y: 0.25, z: 0 },
      Rotation: { x: 0, y: 0, z: 0 },
      Tags: ['gauntlet-territory-overlay'],
    }]);
  });
});
