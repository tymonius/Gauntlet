const CSS_PIXELS_PER_INCH = 96;
const CSS_PIXELS_PER_POINT = CSS_PIXELS_PER_INCH / 72;
const HEIGHT_STEP = 1;
const TITLE_STEP = 0.05 * CSS_PIXELS_PER_POINT;
const RULE_SCALE_STEP = 0.01;
const DEFAULT_MINIMUM_TITLE_SIZE = 8 * CSS_PIXELS_PER_POINT;
const DEFAULT_MINIMUM_OVERLAY_TITLE_SIZE = 12.1 * CSS_PIXELS_PER_POINT;
const DEFAULT_MINIMUM_RULE_SCALE = 0.93;
const LEGACY_DEFAULT_ART_MAX = 1.72;
const DEFAULT_ART_MAX = 1.88;
const TERRITORY_EFFECT_STEP = 0.01;
const TERRITORY_MINIMUM_TITLE_SIZE = 8 * CSS_PIXELS_PER_POINT;
const TERRITORY_MINIMUM_ART_HEIGHT = 0.55 * CSS_PIXELS_PER_INCH;
const TERRITORY_MINIMUM_EFFECT_SCALE = 0.68;

const PARCHMENT_SOURCES = Object.freeze({
  neutral: '/images/artwork/card-backgrounds/neutral-parchment-v2.png',
  military: '/images/artwork/card-backgrounds/military-parchment-v2.png',
  diplomats: '/images/artwork/card-backgrounds/diplomats-parchment-v2.png',
  financiers: '/images/artwork/card-backgrounds/financiers-parchment-v2.png',
  intelligence: '/images/artwork/card-backgrounds/intelligence-parchment-v2.png',
  mystics: '/images/artwork/card-backgrounds/mystics-parchment-v2.png',
  inquisition: '/images/artwork/card-backgrounds/inquisition-parchment-v2.png',
});

const PRODUCTION_FONT_REQUESTS = Object.freeze([
  ['400 12px "p22-1722-pro"', 'Gauntlet'],
  ['400 12px "adobe-caslon-pro"', 'Gauntlet rules text'],
  ['700 12px "adobe-caslon-pro"', 'Gauntlet rules text'],
  ['italic 400 12px "adobe-caslon-pro"', 'Gauntlet reminder text'],
  ['400 12px "Inter"', 'Gauntlet interface label'],
  ['600 12px "Inter"', 'Gauntlet interface label'],
  ['700 12px "Inter"', 'Gauntlet interface label'],
  ['800 12px "Inter"', 'Gauntlet interface label'],
]);

function forceLayout(element) {
  if (element) void element.offsetHeight;
}

function imageLoad(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    image.addEventListener('load', () => finish(resolve, image), { once: true });
    image.addEventListener('error', () => finish(reject, new Error(`Image failed to load: ${source}`)), { once: true });
    image.src = source;
    if (image.complete) {
      if (image.naturalWidth > 0) finish(resolve, image);
      else finish(reject, new Error(`Image failed to load: ${source}`));
    }
  });
}

export async function loadProductionFonts() {
  if (!document.fonts?.load) throw new Error('CSS Font Loading API unavailable.');
  const loaded = await Promise.all(PRODUCTION_FONT_REQUESTS.map(([font, sample]) => document.fonts.load(font, sample)));
  await document.fonts.ready;
  const missing = PRODUCTION_FONT_REQUESTS
    .filter((_, index) => !loaded[index].length)
    .map(([font]) => font);
  if (missing.length) throw new Error(`Missing production fonts: ${missing.join('; ')}`);
}

export async function loadParchment(element, faction = 'neutral') {
  if (!(element instanceof HTMLElement)) return;
  const normalized = String(faction || 'neutral').toLowerCase();
  const source = PARCHMENT_SOURCES[normalized] || PARCHMENT_SOURCES.neutral;
  await imageLoad(source);
  element.style.setProperty('--parchment-image', `url("${source}")`);
  element.dataset.parchmentLoaded = 'true';
  element.dataset.parchmentSource = normalized in PARCHMENT_SOURCES ? normalized : 'neutral';
  element.dataset.parchmentFallback = 'false';
}

export async function resolveArtworkSource(source) {
  if (!source || source.mode === 'generated') return null;
  if (source.mode === 'exact') {
    if (!source.src) return null;
    await imageLoad(source.src);
    return source.src;
  }
  if (source.mode === 'first-existing') {
    for (const candidate of source.candidates || []) {
      try {
        await imageLoad(candidate);
        return candidate;
      } catch {
        // Try the next canonical candidate.
      }
    }
    return null;
  }
  throw new Error(`Unsupported artwork source mode: ${source.mode || '(missing)'}.`);
}

export async function attachArtwork(image, source) {
  if (!(image instanceof HTMLImageElement)) {
    if (source) throw new Error('FaceSpec declares artwork but the template exposes no artwork image.');
    return null;
  }
  const resolved = await resolveArtworkSource(source);
  if (!resolved) throw new Error('Canonical artwork source could not be resolved.');

  image.src = resolved;
  image.hidden = false;
  const figure = image.closest('figure');
  if (figure) {
    figure.classList.add('has-image');
    figure.classList.remove('pending-art', 'proposal-art-pending');
    figure.querySelector('.pending-label')?.remove();
    for (const span of figure.querySelectorAll(':scope > span')) {
      if (/artwork pending/i.test(span.textContent || '')) span.remove();
    }
  }
  if (image.decode) await image.decode().catch(() => {});
  return resolved;
}

function elementOverflows(element) {
  return Boolean(element)
    && (element.scrollWidth > element.clientWidth + 0.5
      || element.scrollHeight > element.clientHeight + 0.5);
}

function cardOverflows(card) {
  const interior = card.querySelector('.card-interior');
  const rules = card.querySelector('.card-rules');
  const footer = card.querySelector('.card-footer');
  const overlayTitle = card.querySelector('.overlay-title');
  if (!interior || !rules || !footer) return false;
  const interiorRect = interior.getBoundingClientRect();
  const footerRect = footer.getBoundingClientRect();
  return footerRect.bottom > interiorRect.bottom + 0.5
    || rules.scrollHeight > rules.clientHeight + 0.5
    || interior.scrollHeight > interior.clientHeight + 0.5
    || elementOverflows(overlayTitle);
}

function fitTitle(card) {
  const title = card.querySelector('.card-title');
  if (!title) return true;
  title.style.removeProperty('font-size');
  forceLayout(title);
  let size = Number.parseFloat(getComputedStyle(title).fontSize);
  const minimum = Number(card.dataset.titleMin || DEFAULT_MINIMUM_TITLE_SIZE / CSS_PIXELS_PER_POINT) * CSS_PIXELS_PER_POINT;
  while (title.scrollWidth > title.clientWidth + 0.5 && size > minimum) {
    size = Math.max(minimum, size - TITLE_STEP);
    title.style.fontSize = `${size}px`;
    forceLayout(title);
  }
  const fits = title.scrollWidth <= title.clientWidth + 0.5;
  card.classList.toggle('title-fit-warning', !fits);
  card.dataset.titleFit = fits ? 'true' : 'false';
  return fits;
}

function fitOverlayTitle(card) {
  const title = card.querySelector('.overlay-title');
  if (!title) return true;
  title.style.removeProperty('font-size');
  forceLayout(title);
  let size = Number.parseFloat(getComputedStyle(title).fontSize);
  const minimum = Number(card.dataset.overlayTitleMin || DEFAULT_MINIMUM_OVERLAY_TITLE_SIZE / CSS_PIXELS_PER_POINT) * CSS_PIXELS_PER_POINT;
  while (elementOverflows(title) && size > minimum) {
    size = Math.max(minimum, size - TITLE_STEP);
    title.style.fontSize = `${size}px`;
    forceLayout(title);
  }
  const fits = !elementOverflows(title);
  card.classList.toggle('overlay-title-fit-warning', !fits);
  card.dataset.overlayTitleFit = fits ? 'true' : 'false';
  return fits;
}

export function fitGenericCard(card) {
  const interior = card?.querySelector('.card-interior');
  const art = card?.querySelector('.card-art');
  if (!interior || !art || !card.matches('[data-art-max]')) return;

  card.classList.remove('fit-warning');
  const titleFits = fitTitle(card);
  const overlayFits = fitOverlayTitle(card);
  const declaredMaximum = Number.parseFloat(card.dataset.artMax);
  const maximumInches = Number.isFinite(declaredMaximum)
    ? (Math.abs(declaredMaximum - LEGACY_DEFAULT_ART_MAX) < 0.001 ? DEFAULT_ART_MAX : declaredMaximum)
    : DEFAULT_ART_MAX;
  const minimum = Number(card.dataset.artMin || 0.62) * CSS_PIXELS_PER_INCH;
  let height = maximumInches * CSS_PIXELS_PER_INCH;
  let ruleScale = 1;

  card.style.setProperty('--rules-scale', String(ruleScale));
  interior.style.setProperty('--art-height', `${height}px`);
  forceLayout(interior);

  while (cardOverflows(card) && height > minimum) {
    height = Math.max(minimum, height - HEIGHT_STEP);
    interior.style.setProperty('--art-height', `${height}px`);
    forceLayout(interior);
  }

  const declaredMinimumScale = Number.parseFloat(getComputedStyle(card).getPropertyValue('--minimum-rules-scale'));
  const minimumScale = Number.isFinite(declaredMinimumScale)
    ? Math.max(declaredMinimumScale, DEFAULT_MINIMUM_RULE_SCALE)
    : DEFAULT_MINIMUM_RULE_SCALE;

  while (cardOverflows(card) && ruleScale > minimumScale) {
    ruleScale = Math.max(minimumScale, ruleScale - RULE_SCALE_STEP);
    card.style.setProperty('--rules-scale', String(Number(ruleScale.toFixed(2))));
    forceLayout(interior);
  }

  const fits = titleFits && overlayFits && !cardOverflows(card);
  card.classList.toggle('fit-warning', !fits);
  card.dataset.productionFit = fits ? 'fit' : 'warning';
}

function territoryBodyOverflows(body, art, effect) {
  if (!body || !art || !effect) return true;
  const bodyRect = body.getBoundingClientRect();
  const artRect = art.getBoundingClientRect();
  const effectRect = effect.getBoundingClientRect();
  const style = getComputedStyle(body);
  const gap = Number.parseFloat(style.rowGap || style.gap || '0') || 0;
  return artRect.height < TERRITORY_MINIMUM_ART_HEIGHT - 0.5
    || effectRect.bottom + gap > bodyRect.bottom + 0.5
    || effect.scrollHeight > effect.clientHeight + 0.5;
}

export function fitTerritory(card) {
  const title = card?.querySelector('.territory-title');
  const body = card?.querySelector('.territory-body');
  const art = card?.querySelector('.territory-art');
  const effect = card?.querySelector('.territory-effect');
  const footer = card?.querySelector('.territory-footer');
  const interior = card?.querySelector('.territory-interior');
  if (!title || !body || !art || !effect || !footer || !interior) throw new Error('Territory template is missing fit structure.');

  let titleSize = Number.parseFloat(getComputedStyle(title).fontSize);
  while (title.scrollWidth > title.clientWidth + 0.5 && titleSize > TERRITORY_MINIMUM_TITLE_SIZE) {
    titleSize = Math.max(TERRITORY_MINIMUM_TITLE_SIZE, titleSize - TITLE_STEP);
    title.style.fontSize = `${titleSize}px`;
    forceLayout(card);
  }

  let effectScale = 1;
  if (territoryBodyOverflows(body, art, effect)) {
    card.classList.add('compact');
    forceLayout(card);
  }
  while (territoryBodyOverflows(body, art, effect) && effectScale > 0.78) {
    effectScale = Math.max(0.78, effectScale - TERRITORY_EFFECT_STEP);
    card.style.setProperty('--effect-scale', effectScale.toFixed(2));
    forceLayout(card);
  }
  if (territoryBodyOverflows(body, art, effect)) {
    art.style.minHeight = `${TERRITORY_MINIMUM_ART_HEIGHT}px`;
    forceLayout(card);
  }
  while (territoryBodyOverflows(body, art, effect) && effectScale > TERRITORY_MINIMUM_EFFECT_SCALE) {
    effectScale = Math.max(TERRITORY_MINIMUM_EFFECT_SCALE, effectScale - TERRITORY_EFFECT_STEP);
    card.style.setProperty('--effect-scale', effectScale.toFixed(2));
    forceLayout(card);
  }

  const bodyRect = body.getBoundingClientRect();
  const artRect = art.getBoundingClientRect();
  const footerRect = footer.getBoundingClientRect();
  const interiorRect = interior.getBoundingClientRect();
  const artSpansBody = Math.abs(artRect.left - bodyRect.left) <= 0.75
    && Math.abs(artRect.right - bodyRect.right) <= 0.75;
  const footerFits = footerRect.bottom <= interiorRect.bottom + 0.5
    && footer.scrollHeight <= footer.clientHeight + 0.5;
  const fits = !territoryBodyOverflows(body, art, effect)
    && title.scrollWidth <= title.clientWidth + 0.5
    && footerFits
    && Boolean(effect.textContent.trim())
    && artRect.height >= TERRITORY_MINIMUM_ART_HEIGHT - 0.5
    && artSpansBody;

  card.dataset.titleFit = title.scrollWidth <= title.clientWidth + 0.5 ? 'true' : 'false';
  card.dataset.effectScale = effectScale.toFixed(2);
  card.dataset.artHeight = artRect.height.toFixed(2);
  card.dataset.artWidth = artRect.width.toFixed(2);
  card.dataset.artSpansBody = String(artSpansBody);
  card.classList.toggle('fit-warning', !fits);
  card.dataset.productionFit = fits ? 'fit' : 'warning';
}
