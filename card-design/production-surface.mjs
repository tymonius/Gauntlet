export const CSS_PIXELS_PER_INCH = 96;

export const PRODUCTION_SURFACES = Object.freeze({
  portrait: Object.freeze({
    orientation: 'portrait',
    widthIn: 2.5,
    heightIn: 3.5,
    widthCssPx: 240,
    heightCssPx: 336,
    widthRasterPx: 400,
    heightRasterPx: 560,
  }),
  landscape: Object.freeze({
    orientation: 'landscape',
    widthIn: 3.5,
    heightIn: 2.5,
    widthCssPx: 336,
    heightCssPx: 240,
    widthRasterPx: 560,
    heightRasterPx: 400,
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

export function surfaceCssPixels(orientation = 'portrait') {
  const surface = productionSurface(orientation);
  return Object.freeze({
    width: surface.widthCssPx,
    height: surface.heightCssPx,
  });
}

export function surfaceRasterPixels(orientation = 'portrait') {
  const surface = productionSurface(orientation);
  return Object.freeze({
    width: surface.widthRasterPx,
    height: surface.heightRasterPx,
  });
}

export function surfaceDeviceScale(orientation = 'portrait') {
  const surface = productionSurface(orientation);
  const widthScale = surface.widthRasterPx / surface.widthCssPx;
  const heightScale = surface.heightRasterPx / surface.heightCssPx;
  if (Math.abs(widthScale - heightScale) > 1e-9) {
    throw new Error(`Production ${orientation} raster and CSS geometry use inconsistent scale factors.`);
  }
  return widthScale;
}
