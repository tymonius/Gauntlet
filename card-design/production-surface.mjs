export const CSS_PIXELS_PER_INCH = 96;

export const PRODUCTION_SURFACES = Object.freeze({
  portrait: Object.freeze({
    orientation: 'portrait',
    widthIn: 2.5,
    heightIn: 3.5,
    widthCssPx: 240,
    heightCssPx: 336,
  }),
  landscape: Object.freeze({
    orientation: 'landscape',
    widthIn: 3.5,
    heightIn: 2.5,
    widthCssPx: 336,
    heightCssPx: 240,
  }),
});

export function productionSurface(orientation = 'portrait') {
  const surface = PRODUCTION_SURFACES[orientation];
  if (!surface) throw new Error(`Unknown production card orientation: ${orientation}.`);
  return surface;
}

export function surfaceCssSize(orientation = 'portrait') {
  const surface = productionSurface(orientation);
  return Object.freeze({
    width: `${surface.widthIn}in`,
    height: `${surface.heightIn}in`,
  });
}
