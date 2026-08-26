const CSS_CARD_WIDTH = 240;
const CSS_CARD_HEIGHT = 336;
const PHYSICAL_CARD_WIDTH = 2.5;
const PHYSICAL_CARD_HEIGHT = 3.5;
const CSS_PX_PER_IN = CSS_CARD_HEIGHT / PHYSICAL_CARD_HEIGHT;

function round(value, places = 5) {
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
  if (!component.renderSource?.componentId) {
    throw new Error(`Ready tracker ${component.id} has no production component id.`);
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
      snapRegistration: 'renderer-derived',
    },
  };
}

export async function captureProductionTracker(page, baseUrl, record, outputPath) {
  const componentId = String(record.renderSource?.componentId || '').trim();
  if (!componentId) throw new Error(`Tracker ${record.id} has no production component id.`);

  await page.goto(`${baseUrl}/card-design/`, { waitUntil: 'load' });

  const selector = `.sliding-tracker-card[data-component-id="${componentId}"]`;
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
      return {
        value,
        // This is the actual rendered distance the covering card must move so
        // its bottom edge lands on this line. Do not reconstruct it from
        // value/max or spread registrations over the card height later.
        rendererTravelPx: rect.bottom - lineRect.top,
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
  if (!geometry.marks.length || geometry.marks.some((mark) => !Number.isInteger(mark.value) || !(mark.rendererTravelPx > 0))) {
    throw new Error(`Production tracker ${record.id} did not expose valid registration lines.`);
  }

  const values = geometry.marks.map((mark) => mark.value);
  const expectedValues = Array.from({ length: Math.max(...values) }, (_, index) => index + 1);
  if (values.length !== expectedValues.length || values.some((value, index) => value !== expectedValues[index])) {
    throw new Error(`Production tracker ${record.id} registration values are not consecutive from 1: ${values.join(', ')}.`);
  }

  const snapPoints = [
    { value: 0, rendererTravelPx: 0, offset: 0 },
    ...geometry.marks.map((mark) => ({
      value: mark.value,
      rendererTravelPx: round(mark.rendererTravelPx),
      // Retain the physical offset as diagnostic manifest data, but TTS snap
      // generation consumes rendererTravelPx directly so no later code can
      // redistribute the registrations across the whole card.
      offset: round(mark.rendererTravelPx / CSS_PX_PER_IN),
    })),
  ];
  for (let index = 1; index < snapPoints.length; index += 1) {
    if (!(snapPoints[index].rendererTravelPx > snapPoints[index - 1].rendererTravelPx)) {
      throw new Error(`Production tracker ${record.id} renderer registration positions are not strictly increasing.`);
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
      maximumTravel: snapPoints.at(-1).offset,
    },
    snapPoints,
  };
}
