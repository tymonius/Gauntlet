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
  const text = String(source || '');
  const match = text.match(/window\.GAUNTLET_ART_DIRECTION\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);?/);
  if (!match) return {};
  const body = match[1].trim();
  if (!body) return {};

  // The canonical serializer emits JSON-quoted card ids and a deliberately tiny
  // JavaScript object vocabulary. Quote only that known property vocabulary so
  // the payload can be parsed as JSON without evaluating repository code.
  const jsonBody = body
    .replace(/,\s*$/u, '')
    .replace(/([,{]\s*)(focus|focusX|focusY|zoom|fit|smart)\s*:/gu, '$1"$2":');
  const raw = JSON.parse(`{${jsonBody}}`);
  const result = {};
  for (const [id, direction] of Object.entries(raw)) {
    result[validateArtDirectionId(id)] = normalizeArtDirection(direction);
  }
  return result;
}

export function serializeArtDirectionMap(map) {
  const entries = Object.entries(map || {})
    .map(([id, direction]) => [validateArtDirectionId(id), normalizeArtDirection(direction)])
    .filter(([, direction]) => Object.keys(direction).length > 0)
    .sort(([left], [right]) => left.localeCompare(right));

  const body = entries.length
    ? `${entries.map(([id, direction]) => `  ${JSON.stringify(id)}: ${JSON.stringify(direction)},`).join('\n')}\n`
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
