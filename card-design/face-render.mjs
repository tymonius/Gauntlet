import { resolveFaceSpec } from './face-spec.mjs';

const FAMILY_MODULES = Object.freeze({
  leader: './face-families/leader.mjs',
  'card-back': './face-families/card-back.mjs',
});

function params() {
  const query = new URLSearchParams(window.location.search);
  const kind = String(query.get('kind') || (query.has('faction') ? 'back' : '')).trim().toLowerCase();
  const id = String(query.get('id') || query.get('faction') || '').trim();
  const side = String(query.get('side') || (kind === 'back' ? 'back' : 'front')).trim().toLowerCase();
  return { kind, id, side };
}

function reportError(error) {
  const message = error?.stack || error?.message || String(error);
  console.error(error);
  document.body.dataset.renderError = 'true';
  document.body.dataset.renderErrorMessage = message;
  document.body.dataset.renderReady = 'error';
  const target = document.getElementById('renderTarget');
  if (target) {
    const pre = document.createElement('pre');
    pre.textContent = message;
    target.replaceChildren(pre);
  }
}

function applySurface(spec, target) {
  for (const node of [document.documentElement, document.body, target]) {
    node.style.width = spec.surface.width;
    node.style.height = spec.surface.height;
  }
  document.body.dataset.renderOrientation = spec.orientation;
}

function loadStylesheet(href) {
  const absolute = new URL(href, document.baseURI).href;
  const existing = [...document.styleSheets].find(sheet => sheet.href === absolute);
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.faceRenderStyle = href;
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
      if (ready()) return resolve();
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
  const failed = images.filter(image => image.naturalWidth <= 0 || image.naturalHeight <= 0);
  if (failed.length) throw new Error(`${failed.length} face image(s) failed to load.`);
}

async function prepareCard(spec, card) {
  await Promise.all([
    loadClassicScript('/card-design/card-design.js', () => Boolean(window.GauntletCardDesign?.prepareCard)),
    loadClassicScript('/card-design/artwork-crop.js', () => Boolean(window.GauntletArtworkCrop?.apply)),
  ]);

  await window.GauntletCardDesign.prepareCard(card);

  if (spec.artwork) {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const image = card.querySelector('.card-art img:not([hidden])');
    if (!image) throw new Error(`Face ${spec.id} declares artwork but rendered no artwork image.`);
    const result = window.GauntletArtworkCrop.apply(
      image,
      spec.artwork.direction,
      { id: spec.artwork.id, label: spec.label },
    );
    if (!result) throw new Error(`Face ${spec.id} failed to apply canonical artwork composition.`);
    card.dataset.artDirectionApplied = spec.artwork.id;
  }

  if (card.classList.contains('fit-warning')) {
    throw new Error(`Face ${spec.id} does not fit its canonical production surface.`);
  }
}

async function main() {
  const target = document.getElementById('renderTarget');
  if (!target) throw new Error('Canonical face renderer is missing its render target.');

  const spec = await resolveFaceSpec(params());
  document.body.dataset.faceSpecId = spec.id;
  document.body.dataset.faceSpecKind = spec.kind;
  document.body.dataset.gameplayAuthority = spec.gameplayAuthorityUrl;
  document.body.dataset.visualAuthority = spec.visualAuthorityUrl;
  applySurface(spec, target);

  await Promise.all(spec.styles.map(loadStylesheet));

  const moduleUrl = FAMILY_MODULES[spec.template];
  if (!moduleUrl) throw new Error(`No renderer module is registered for FaceSpec template ${spec.template}.`);
  const family = await import(moduleUrl);
  if (typeof family.mountFace !== 'function') throw new Error(`Face family ${spec.template} does not implement mountFace().`);

  const face = family.mountFace(target, spec);
  if (!(face instanceof HTMLElement)) throw new Error(`Face family ${spec.template} did not return a mounted element.`);

  await waitForImages(face);
  if (face.classList.contains('gauntlet-card') && spec.template !== 'card-back') {
    await prepareCard(spec, face);
  }

  face.style.width = spec.surface.width;
  face.style.height = spec.surface.height;
  document.body.dataset.renderReady = 'true';
}

main().catch(reportError);
