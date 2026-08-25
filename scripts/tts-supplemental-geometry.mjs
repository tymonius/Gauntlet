const SNAP_Y = 0.12;

export const STANDARD_CARD_SHORT_EDGE = 2.5;
export const STANDARD_CARD_LONG_EDGE = 3.5;

// Tabletop Simulator's Custom_Tile and CardCustom objects use different native
// tabletop footprints. This is the single physical conversion used when a
// card-sized printed tracker is represented as a Custom_Tile. It is part of the
// object representation contract, not a post-generation correction.
export const CUSTOM_TILE_CARD_LINEAR_SCALE = 1.5;
export const ROUNDED_RECTANGLE_TILE_TYPE = 3;

function vector(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

export function assertCardSizedTracker(component) {
  const width = Number(component.tts?.widthScale || component.physicalScale?.cardWidth || 0);
  const height = Number(component.tts?.heightScale || component.physicalScale?.cardHeight || 0);
  if (Math.abs(width - STANDARD_CARD_SHORT_EDGE) > 0.001 || Math.abs(height - STANDARD_CARD_LONG_EDGE) > 0.001) {
    throw new Error(
      `Sliding tracker ${component.id} declares ${width || '?'} x ${height || '?'} sizing; `
      + `expected ${STANDARD_CARD_SHORT_EDGE} x ${STANDARD_CARD_LONG_EDGE}.`,
    );
  }
}

export function makeTrackerSnapPoints(component) {
  const tag = String(component.tts?.snapTag || '').trim();
  const points = component.tts?.snapPoints;
  if (!tag || !Array.isArray(points) || points.length < 2) {
    throw new Error(`Sliding tracker ${component.id} cannot register snaps without a snap tag and renderer-derived positions.`);
  }
  if (Number(points[0]?.value) !== 0 || Number(points[0]?.offset) !== 0) {
    throw new Error(`Sliding tracker ${component.id} must begin with the fully covered value-0 registration.`);
  }

  let previous = -Infinity;
  return points.map(point => {
    const physicalTravel = Number(point.offset);
    if (!Number.isFinite(physicalTravel) || physicalTravel < 0 || physicalTravel < previous) {
      throw new Error(`Sliding tracker ${component.id} has invalid renderer travel ${point.offset}.`);
    }
    previous = physicalTravel;

    // Renderer offsets are physical-card inches measured upward from the fully
    // covered position. Attached snap positions are local to the uniformly
    // enlarged Custom_Tile, so convert physical travel exactly once here.
    const localZ = -(physicalTravel / CUSTOM_TILE_CARD_LINEAR_SCALE);
    return {
      Position: vector(0, SNAP_Y, Number(localZ.toFixed(6))),
      Rotation: vector(0, 0, 0),
      RotationSnap: true,
      Tags: [tag],
    };
  });
}

export function makeTrackerLuaScript(component) {
  const points = makeTrackerSnapPoints(component);
  const lines = ['function registerGauntletTrackerSnaps()', '  self.setSnapPoints({'];
  for (const point of points) {
    lines.push(
      `    { position = {${point.Position.x}, ${point.Position.y}, ${point.Position.z}}, `
      + `rotation = {0, 0, 0}, rotation_snap = true, tags = {${JSON.stringify(point.Tags[0])}} },`,
    );
  }
  lines.push(
    '  })',
    'end',
    '',
    'function onLoad()',
    '  registerGauntletTrackerSnaps()',
    'end',
  );
  return lines.join('\n');
}

export function trackerPresentation(component) {
  assertCardSizedTracker(component);
  return {
    widthScale: STANDARD_CARD_SHORT_EDGE,
    transformScale: CUSTOM_TILE_CARD_LINEAR_SCALE,
    tileType: ROUNDED_RECTANGLE_TILE_TYPE,
    stretch: true,
    snapPoints: makeTrackerSnapPoints(component),
    luaScript: makeTrackerLuaScript(component),
  };
}
