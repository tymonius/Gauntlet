import { loadRenderGame } from './render-context.mjs';
import { resolveFaceSpec } from './face-spec.mjs';
import { rendererForTemplate } from './face-template-registry.mjs';
import {
  attachArtwork,
  fitGenericCard,
  fitTerritory,
  fitTracker,
  loadParchment,
  loadProductionFonts,
} from './face-preparation.mjs';

function faceIdFromLocation() {
  const query = new URLSearchParams(window.location.search);
  const id = String(query.get('id') || '').trim();
  if (!id) throw new Error('Canonical face renderer requires an id query parameter.');
  return id;
}

function applySurface(spec, target) {
  const width = `${spec.surface.widthIn}in`;
  const height = `${spec.surface.heightIn}in`;
  for (const node of [document.documentElement, document.body, target]) {
    node.style.width = width;
    node.style.height = height;
    node.style.minWidth = '0';
    node.style.minHeight = '0';
  }
  document.body.dataset.renderOrientation = spec.orientation;
}

function loadStylesheet(href) {
  const absolute = new URL(href, window.location.href).href;
  const existing = [...document.styleSheets].find(sheet => sheet.href === absolute);
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.faceStyle = href;
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', () => reject(new Error(`Face stylesheet failed to load: ${href}`)), { once: true });
    document.head.append(link);
  });
}

function loadClassicScript(src, ready) {
  if (ready()) return Promise.resolve();
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error(`Face runtime failed to load: ${src}`)), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.addEventListener('load', () => ready() ? resolve() : reject(new Error(`Face runtime did not initialize: ${src}`)), { once: true });
    script.addEventListener('error', () => reject(new Error(`Face runtime failed to load: ${src}`)), { once: true });
    document.head.append(script);
  });
}

async function waitForImages(root) {
  const images = [...root.querySelectorAll('img')];
  await Promise.all(images.map(image => {
    if (image.complete) return Promise.resolve();
    return new Promise(resolve => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    });
  }));
  const failed = images.filter(image => !image.hidden && (image.naturalWidth <= 0 || image.naturalHeight <= 0));
  if (failed.length) throw new Error(`${failed.length} rendered image(s) failed to load.`);
}

async function applyCanonicalArtwork(spec, result) {
  const artwork = spec.artwork;
  if (!artwork || artwork.role === 'template') return;

  if (artwork.role === 'full-face') {
    if (result.artworkImage) await attachArtwork(result.artworkImage, artwork.source);
    return;
  }

  if (artwork.role !== 'crop') throw new Error(`Unsupported artwork role ${artwork.role} for ${spec.id}.`);
  if (!result.artworkImage) throw new Error(`Face ${spec.id} has crop artwork but its template exposes no artwork image.`);

  const source = await attachArtwork(result.artworkImage, artwork.source);
  await loadClassicScript('/card-design/artwork-crop.js', () => Boolean(window.GauntletArtworkCrop?.apply));
  const crop = window.GauntletArtworkCrop.apply(
    result.artworkImage,
    artwork.composition.direction,
    { id: artwork.composition.id, label: spec.label },
  );
  if (!crop) throw new Error(`Canonical artwork composition failed for ${spec.id}.`);
  result.element.dataset.artDirectionApplied = artwork.composition.id;
  result.element.dataset.artworkSource = source;
}

const FITTERS = Object.freeze({
  none: () => {},
  generic: fitGenericCard,
  territory: fitTerritory,
  tracker: fitTracker,
});

async function prepareFace(spec, result) {
  const element = result.element;
  const preparation = result.preparation || { parchment: false, fit: 'none' };

  if (preparation.parchment) {
    const parchmentFaction = preparation.parchment === 'neutral' ? 'neutral' : spec.faction;
    await loadParchment(element, parchmentFaction);
  }

  await applyCanonicalArtwork(spec, result);
  await waitForImages(element);
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const fitter = FITTERS[preparation.fit || 'none'];
  if (!fitter) throw new Error(`Face ${spec.id} requested unknown fit contract ${preparation.fit}.`);
  fitter(element);

  if (element.classList.contains('fit-warning')) {
    throw new Error(`Face ${spec.id} does not fit its canonical production surface.`);
  }
}

function reportError(error) {
  const message = error?.stack || error?.message || String(error);
  console.error(error);
  document.body.dataset.renderReady = 'error';
  document.body.dataset.renderError = 'true';
  document.body.dataset.renderErrorMessage = message;
  const target = document.getElementById('renderTarget');
  if (target) {
    const pre = document.createElement('pre');
    pre.textContent = message;
    target.replaceChildren(pre);
  }
}

async function main() {
  const target = document.getElementById('renderTarget');
  if (!target) throw new Error('Canonical face renderer is missing #renderTarget.');

  const game = await loadRenderGame();
  const spec = resolveFaceSpec(game, faceIdFromLocation());

  document.body.dataset.faceId = spec.id;
  document.body.dataset.faceTemplate = spec.template;
  document.body.dataset.gameplayAuthority = spec.provenance.gameplay;
  document.body.dataset.visualAuthority = spec.provenance.visual;
  document.body.dataset.faceProductionReady = String(spec.readiness.productionReady);

  if (!spec.readiness.productionReady) {
    throw new Error(`Face ${spec.id} is not ready for the clean renderer: ${spec.readiness.issues.join(', ')}.`);
  }

  applySurface(spec, target);
  await Promise.all(spec.dependencies.styles.map(loadStylesheet));
  await loadProductionFonts();

  const template = rendererForTemplate(spec.template);
  const result = await template.render(spec);
  if (!(result?.element instanceof HTMLElement)) {
    throw new Error(`Template ${spec.template} returned no physical face element for ${spec.id}.`);
  }

  result.element.style.width = `${spec.surface.widthIn}in`;
  result.element.style.height = `${spec.surface.heightIn}in`;
  target.replaceChildren(result.element);

  await prepareFace(spec, result);
  document.body.dataset.renderReady = 'true';
}

main().catch(reportError);
