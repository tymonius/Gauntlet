const SNAP_Y = 0.12;

export const STANDARD_CARD_SHORT_EDGE = 2.5;
export const STANDARD_CARD_LONG_EDGE = 3.5;

// Representation geometry only. The card-matched Custom_Tile is deliberately
// scaled to the same tabletop footprint as a normal TTS card. Registration
// spacing does NOT come from this number; every snap fraction comes directly
// from the actual rendered line on the tracker face.
export const CARD_MATCHED_TRACKER_WORLD_LONG_EDGE = 3.06;
export const CUSTOM_TILE_CARD_LINEAR_SCALE = 1.5;
export const TRACKER_LOCAL_LONG_EDGE = CARD_MATCHED_TRACKER_WORLD_LONG_EDGE / CUSTOM_TILE_CARD_LINEAR_SCALE;
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
  if (Number(points[0]?.value) !== 0 || Number(points[0]?.registrationFraction) !== 0) {
    throw new Error(`Sliding tracker ${component.id} must begin with the fully covered value-0 renderer registration.`);
  }

  let previous = -Infinity;
  return points.map(point => {
    const registrationFraction = Number(point.registrationFraction);
    if (!Number.isFinite(registrationFraction)
      || registrationFraction < 0
      || registrationFraction >= 1
      || registrationFraction < previous) {
      throw new Error(`Sliding tracker ${component.id} has invalid renderer line fraction ${point.registrationFraction}.`);
    }
    previous = registrationFraction;

    // The cover card begins centered on the tracker at value 0. Moving that
    // center by the exact bottom-to-line fraction moves the cover's bottom edge
    // by the same fraction, landing it on the printed registration line.
    const localZ = -(registrationFraction * TRACKER_LOCAL_LONG_EDGE);
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
