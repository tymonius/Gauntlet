import vm from 'node:vm';

export const ART_DIRECTION_HEADER = `// Canonical artwork composition authority.
// Smart focal analysis may be used while authoring, but approved production
// directions should materialize the result as explicit fit/focus/zoom data with
// smart:false. Legacy partial values remain readable for migration tooling.
//
// Supported properties:
//   focus: [x, y]       legacy shorthand focal point
//   focusX / focusY     canonical focal point by axis
//   zoom                 1.0..1.8; scales around the chosen focal point
//   fit                  "cover" or "contain"
//   smart                false disables runtime focal analysis
`;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

export function validateArtDirectionId(value) {
  const id = String(value ?? '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)) {
    throw new Error(`Invalid art-direction id: ${id || '(empty)'}`);
  }
  return id;
}

function normalizeFocus(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return undefined;
  return round(clamp(number > 1 ? number / 100 : number, 0, 1), 4);
}

export function normalizeArtDirection(value) {
  const source = value && typeof value === 'object' ? value : {};
  const direction = {};
  const focus = Array.isArray(source.focus) ? source.focus : [];
  const focusX = normalizeFocus(source.focusX ?? source.focus_x ?? source.x ?? focus[0]);
  const focusY = normalizeFocus(source.focusY ?? source.focus_y ?? source.y ?? focus[1]);
  const zoom = Number.parseFloat(source.zoom);
  const completeExplicit = source.smart === false
    && (source.fit === 'cover' || source.fit === 'contain')
    && focusX !== undefined
    && focusY !== undefined
    && Number.isFinite(zoom);

  if (completeExplicit) {
    return {
      fit: source.fit,
      focusX,
      focusY,
      smart: false,
      zoom: round(clamp(zoom, 1, 1.8), 4),
    };
  }

  if (focusX !== undefined && focusY !== undefined) direction.focus = [focusX, focusY];
  else if (focusX !== undefined) direction.focusX = focusX;
  else if (focusY !== undefined) direction.focusY = focusY;

  if (Number.isFinite(zoom)) {
    const normalizedZoom = round(clamp(zoom, 1, 1.8), 2);
    if (Math.abs(normalizedZoom - 1) > 0.0001) direction.zoom = normalizedZoom;
  }

  if (source.fit === 'contain') direction.fit = 'contain';
  if (source.smart === false) direction.smart = false;
  return direction;
}

export function parseArtDirectionSource(source) {
  const sandbox = { window: {} };
  vm.runInNewContext(String(source), sandbox, { timeout: 250 });
  const raw = sandbox.window.GAUNTLET_ART_DIRECTION;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result = {};
  for (const [id, direction] of Object.entries(raw)) {
    result[validateArtDirectionId(id)] = normalizeArtDirection(direction);
  }
  return result;
}

function serializeValue(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `[${value.map(serializeValue).join(', ')}]`;
  throw new Error(`Unsupported art-direction value: ${String(value)}`);
}

function serializeDirection(direction) {
  const normalized = normalizeArtDirection(direction);
  const properties = [];
  if (normalized.focus) properties.push(`focus: ${serializeValue(normalized.focus)}`);
  if (normalized.focusX !== undefined) properties.push(`focusX: ${serializeValue(normalized.focusX)}`);
  if (normalized.focusY !== undefined) properties.push(`focusY: ${serializeValue(normalized.focusY)}`);
  if (normalized.zoom !== undefined) properties.push(`zoom: ${serializeValue(normalized.zoom)}`);
  if (normalized.fit !== undefined) properties.push(`fit: ${serializeValue(normalized.fit)}`);
  if (normalized.smart !== undefined) properties.push(`smart: ${serializeValue(normalized.smart)}`);
  return `{ ${properties.join(', ')} }`;
}

export function serializeArtDirectionMap(map) {
  const entries = Object.entries(map || {})
    .map(([id, direction]) => [validateArtDirectionId(id), normalizeArtDirection(direction)])
    .filter(([, direction]) => Object.keys(direction).length > 0)
    .sort(([left], [right]) => left.localeCompare(right));

  const body = entries.length
    ? `${entries.map(([id, direction]) => `  ${JSON.stringify(id)}: ${serializeDirection(direction)},`).join('\n')}\n`
    : '';
  return `${ART_DIRECTION_HEADER}window.GAUNTLET_ART_DIRECTION = Object.freeze({\n${body}});\n`;
}

export function updateArtDirectionMap(map, idValue, directionValue) {
  const id = validateArtDirectionId(idValue);
  const result = { ...(map || {}) };
  const direction = normalizeArtDirection(directionValue);
  if (Object.keys(direction).length) result[id] = direction;
  else delete result[id];
  return result;
}
