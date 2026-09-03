import { productionSurface } from '../card-design/production-surface.mjs';

const SNAP_Y = 0.12;
const PORTRAIT_SURFACE = productionSurface('portrait');

export const STANDARD_CARD_SHORT_EDGE = PORTRAIT_SURFACE.widthIn;
export const STANDARD_CARD_LONG_EDGE = PORTRAIT_SURFACE.heightIn;
export const CUSTOM_TILE_CARD_LINEAR_SCALE = 1.5;
export const ROUNDED_RECTANGLE_TILE_TYPE = 3;
export const LANDSCAPE_TTS_CELL_ROTATION_DEGREES = 90;

function validateRegistrationPoints(component) {
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
    return {
      value: Number(point.value),
      registrationFraction,
      tag,
    };
  });
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

export function trackerRegistrations(component) {
  return validateRegistrationPoints(component);
}

export function makeTrackerLuaScript(component) {
  const registrations = validateRegistrationPoints(component);
  const tag = registrations[0].tag;
  const fractions = registrations.map(({ value, registrationFraction }) => (
    `  { value = ${value}, fraction = ${registrationFraction} },`
  ));

  return [
    '-- Printed registration lines are the geometry authority.',
    '-- At load, map each rendered bottom-to-line fraction onto this tile\'s',
    '-- actual TTS collider length. No card-length calibration or value/max',
    '-- distribution is involved.',
    'local gauntletTrackerRegistrations = {',
    ...fractions,
    '}',
    '',
    'local function gauntletTrackerBounds()',
    '  local bounds = self.getBoundsNormalized()',
    '  local scale = self.getScale()',
    '  if bounds == nil or bounds.size == nil or scale == nil then return nil end',
    '  local scaleZ = math.abs(scale.z)',
    '  if scaleZ < 0.0001 or math.abs(bounds.size.z) < 0.0001 then return nil end',
    '  return bounds, scaleZ',
    'end',
    '',
    'function gauntletTrackerBoundsReady()',
    '  return gauntletTrackerBounds() ~= nil',
    'end',
    '',
    'function registerGauntletTrackerSnaps()',
    '  local bounds, scaleZ = gauntletTrackerBounds()',
    '  if bounds == nil then return end',
    '  local localLength = bounds.size.z / scaleZ',
    '  local points = {}',
    '  for _, registration in ipairs(gauntletTrackerRegistrations) do',
    '    table.insert(points, {',
    '      position = {0, ' + SNAP_Y + ', -localLength * registration.fraction},',
    '      rotation = {0, 0, 0},',
    '      rotation_snap = true,',
    `      tags = {${JSON.stringify(tag)}}`,
    '    })',
    '  end',
    '  self.setSnapPoints(points)',
    'end',
    '',
    'function onLoad()',
    '  Wait.condition(',
    '    registerGauntletTrackerSnaps,',
    '    gauntletTrackerBoundsReady,',
    '    3',
    '  )',
    'end',
  ].join('\n');
}

export function trackerPresentation(component) {
  assertCardSizedTracker(component);
  const registrations = trackerRegistrations(component);
  return {
    widthScale: STANDARD_CARD_SHORT_EDGE,
    transformScale: CUSTOM_TILE_CARD_LINEAR_SCALE,
    tileType: ROUNDED_RECTANGLE_TILE_TYPE,
    stretch: true,
    registrations,
    luaScript: makeTrackerLuaScript(component),
  };
}
