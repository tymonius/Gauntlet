import {
  productionSurface,
  surfaceCssPixels,
} from '../card-design/production-surface.mjs';

const PORTRAIT_SURFACE = productionSurface('portrait');
const { width: CSS_CARD_WIDTH, height: CSS_CARD_HEIGHT } = surfaceCssPixels('portrait');
const PHYSICAL_CARD_WIDTH = PORTRAIT_SURFACE.widthIn;
const PHYSICAL_CARD_HEIGHT = PORTRAIT_SURFACE.heightIn;

function round(value, places = 6) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function buildReadyTrackerRecord(component, renderer = 'sliding-tracker') {
  if (!component.cardLike || component.tts?.representation !== 'sliding-tracker') {
    throw new Error(`Ready tracker ${component.id} must be a card-like sliding-tracker representation.`);
  }
  if (component.backPolicy !== 'standardBack') {
    throw new Error(`Ready tracker ${component.id} must use standardBack; found ${component.backPolicy || 'missing'}.`);
  }
  if (component.tts.snapPositions !== 'renderer-derived') {
    throw new Error(`Ready tracker ${component.id} must derive snap registration from the production renderer.`);
  }
  return {
    id: component.id,
    name: component.name,
    faction: component.faction,
    family: component.family,
    quantity: component.quantity,
    productionStatus: component.productionStatus,
    backPolicy: component.backPolicy,
    representation: component.tts.representation,
    source: component.source,
    trackedValue: component.trackedValue,
    renderSource: component.renderSource,
    cover: component.cover,
    renderer,
    tracker: {
      assembly: component.tts.assembly,
      axis: component.tts.axis,
      layer: component.tts.layer,
      snapTag: component.tts.snapTag,
      stackable: component.tts.stackable,
      snapRegistration: 'renderer-line-fraction',
    },
  };
}

export async function captureProductionTracker(page, baseUrl, record, outputPath, displayVersion = '') {
  void displayVersion;
  const url = new URL('/card-design/face-render.html', baseUrl);
  url.searchParams.set('id', `component:${record.id}:front`);
  await page.goto(url.toString(), { waitUntil: 'load' });
  await page.waitForFunction(() => (
    document.body.dataset.renderReady === 'true'
    || document.body.dataset.renderError === 'true'
  ));

  const state = await page.evaluate(() => ({
    error: document.body.dataset.renderError === 'true',
    message: document.body.dataset.renderErrorMessage || '',
  }));
  if (state.error) {
    throw new Error(`Card-design production renderer failed for tracker ${record.id}: ${state.message || 'unspecified renderer error'}`);
  }

  const selector = '#renderTarget > .sliding-tracker-card';
  await page.waitForSelector(selector);
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });

  const locator = page.locator(selector);
  const count = await locator.count();
  if (count !== 1) {
    throw new Error(`Production tracker ${record.id} expected exactly one ${selector}; found ${count}.`);
  }

  const geometry = await locator.evaluate((card) => {
    const rect = card.getBoundingClientRect();
    const marks = [...card.querySelectorAll('.tracker-mark')].map((mark) => {
      const line = mark.querySelector('.tracker-registration-line');
      const label = mark.querySelector('.tracker-band-label');
      if (!line || !label) return null;
      const lineRect = line.getBoundingClientRect();
      const value = Number.parseInt(String(label.textContent || '').trim(), 10);
      const rendererTravelPx = rect.bottom - lineRect.top;
      return {
        value,
        rendererTravelPx,
        // This is the authoritative registration geometry: how far the cover
        // card must move from the fully covered position for its bottom edge to
        // land on this exact printed line. It is measured from the rendered
        // card, not inferred from value/max and not converted through inches.
        registrationFraction: rendererTravelPx / rect.height,
      };
    }).filter(Boolean);
    return {
      width: rect.width,
      height: rect.height,
      marks,
    };
  });

  if (Math.abs(geometry.width - CSS_CARD_WIDTH) > 0.25 || Math.abs(geometry.height - CSS_CARD_HEIGHT) > 0.25) {
    throw new Error(`Unexpected production tracker geometry for ${record.id}: ${geometry.width} × ${geometry.height}.`);
  }
  if (!geometry.marks.length || geometry.marks.some((mark) => !Number.isInteger(mark.value)
    || !(mark.rendererTravelPx > 0)
    || !(mark.registrationFraction > 0 && mark.registrationFraction < 1))) {
    throw new Error(`Production tracker ${record.id} did not expose valid registration lines.`);
  }

  const values = geometry.marks.map((mark) => mark.value);
  const expectedValues = Array.from({ length: Math.max(...values) }, (_, index) => index + 1);
  if (values.length !== expectedValues.length || values.some((value, index) => value !== expectedValues[index])) {
    throw new Error(`Production tracker ${record.id} registration values are not consecutive from 1: ${values.join(', ')}.`);
  }

  const snapPoints = [
    { value: 0, rendererTravelPx: 0, registrationFraction: 0 },
    ...geometry.marks.map((mark) => ({
      value: mark.value,
      rendererTravelPx: round(mark.rendererTravelPx),
      registrationFraction: round(mark.registrationFraction, 8),
    })),
  ];
  for (let index = 1; index < snapPoints.length; index += 1) {
    if (!(snapPoints[index].registrationFraction > snapPoints[index - 1].registrationFraction)) {
      throw new Error(`Production tracker ${record.id} registration lines are not strictly increasing from the covered position.`);
    }
  }

  await locator.evaluate((card) => {
    for (const other of document.querySelectorAll('.sliding-tracker-card')) {
      if (other !== card) other.style.display = 'none';
    }
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
    card.style.position = 'fixed';
    card.style.left = '0';
    card.style.top = '0';
    card.style.margin = '0';
    card.style.zIndex = '2147483647';
  });

  await page.screenshot({
    path: outputPath,
    omitBackground: true,
    clip: {
      x: 0,
      y: 0,
      width: CSS_CARD_WIDTH,
      height: CSS_CARD_HEIGHT,
    },
  });
  return {
    physicalScale: {
      minimum: 0,
      maximum: Math.max(...values),
      cardWidth: PHYSICAL_CARD_WIDTH,
      cardHeight: PHYSICAL_CARD_HEIGHT,
      maximumRegistrationFraction: snapPoints.at(-1).registrationFraction,
    },
    snapPoints,
  };
}
