import {
  fitReferenceCard,
  referenceCardMarkup,
} from '/card-design/reference-card.js';

const params = new URLSearchParams(window.location.search);
const componentId = params.get('component') || '';
const side = params.get('side') || 'front';
const target = document.querySelector('#renderTarget');

const riteSymbols = Object.freeze({
  'mystics-rite-echoes': '◉',
  'mystics-rite-blood': '◆',
  'mystics-rite-crossing': '✦',
});

// Reference components that need a literal image instead of the ordinary
// faction-symbol mask declare that image here. The Universal Reference uses the
// canonical Gauntlet wordmark itself and clips its left-hand G inside the
// standard emblem slot. This keeps the generated pixels dependent on an actual
// loaded <img>, not CSS masking/background behavior.
const referenceEmblemImages = Object.freeze({
  'universal-reference': '/images/Gauntlet.svg',
});

function element(tag, className, text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function reportRenderError(error) {
  const message = error?.stack || error?.message || String(error);
  console.error(error);
  document.body.dataset.renderErrorMessage = message;
  document.body.dataset.renderError = 'true';
}

function riteHeader(record, kicker) {
  const header = element('header', 'rite-header');
  header.append(
    element('p', 'rite-kicker', kicker),
    element('h1', 'rite-title', record.name),
    element('div', 'rite-symbol', riteSymbols[record.id] || '✦'),
  );
  return header;
}

function renderBlock(block, className = 'rite-block') {
  const wrapper = element('div', className);

  if (block.type === 'subheading') {
    wrapper.append(element('h3', 'reference-inline-heading', block.text || ''));
    return wrapper;
  }

  if (block.label) {
    const paragraph = document.createElement('p');
    const label = document.createElement('strong');
    label.textContent = `${block.label}: `;
    paragraph.append(label, document.createTextNode(block.text || ''));
    wrapper.append(paragraph);
    return wrapper;
  }

  if (block.type === 'list') {
    const list = document.createElement(block.ordered ? 'ol' : 'ul');
    for (const item of block.items || []) list.append(element('li', '', item));
    wrapper.append(list);
    return wrapper;
  }

  if (block.type === 'table') {
    const table = element('table', 'reference-table');
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const header of block.headers || []) headRow.append(element('th', '', header));
    head.append(headRow);
    table.append(head);

    const body = document.createElement('tbody');
    for (const row of block.rows || []) {
      const tr = document.createElement('tr');
      for (const cell of row) tr.append(element('td', '', cell));
      body.append(tr);
    }
    table.append(body);
    wrapper.append(table);
    return wrapper;
  }

  wrapper.append(element('p', '', block.text || ''));
  return wrapper;
}

function renderRiteFront(record) {
  const card = element('article', 'supplemental-card rite-card');
  card.dataset.componentId = record.id;
  card.dataset.renderer = record.renderer;

  const rules = element('section', 'rite-rules');
  for (const block of record.front?.blocks || []) rules.append(renderBlock(block));

  card.append(
    riteHeader(record, 'Incomplete Rite'),
    rules,
    element('div', 'rite-source-note', `${record.name} • incomplete side`),
  );
  target.replaceChildren(card);
  document.body.dataset.renderReady = 'true';
}

function renderRiteReverse(record) {
  const card = element('article', 'supplemental-card completed-card');
  card.dataset.componentId = record.id;
  card.dataset.renderer = record.renderer;

  const art = element('div', 'completed-art');
  const image = document.createElement('img');
  image.alt = `${record.name} completed graphic`;
  image.addEventListener('load', () => {
    document.body.dataset.renderReady = 'true';
  }, { once: true });
  image.addEventListener('error', () => {
    reportRenderError(new Error(`Failed to load reverse artwork for ${record.id}: ${record.reverseArtwork}`));
  }, { once: true });
  image.src = `/${String(record.reverseArtwork || '').replace(/^\/+/, '')}`;
  art.append(image);

  card.append(
    riteHeader(record, 'Rite Completed'),
    art,
    element('div', 'rite-source-note', `${record.name} • completed side`),
  );
  target.replaceChildren(card);
}

function referenceFitDiagnostics(card, result) {
  const body = card.querySelector('.reference-body');
  const bodyMetrics = body ? `${body.scrollHeight}/${body.clientHeight}px` : 'missing';
  const panelMetrics = Array.from(card.querySelectorAll('.reference-panel')).map((panel, index) => {
    const title = panel.querySelector('.reference-panel-heading')?.textContent?.trim() || `panel-${index + 1}`;
    return `${title}:${panel.scrollHeight}/${panel.clientHeight}px`;
  }).join(', ');
  return `scale=${Number(result.scale).toFixed(3)} gap=${Number(result.sectionGap).toFixed(3)}in body=${bodyMetrics} panels=[${panelMetrics}]`;
}

function waitForImage(image, label) {
  if (image.complete) {
    if (image.naturalWidth > 0 && image.naturalHeight > 0) return Promise.resolve();
    return Promise.reject(new Error(`${label} completed without drawable image data.`));
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label} timed out while loading.`)), 15000);
    image.addEventListener('load', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    image.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error(`${label} failed to load.`));
    }, { once: true });
  });
}

function assertLeftCropHasPixels(image, label) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error(`${label} could not create a pixel-validation canvas.`);

  // The stylized G occupies the leftmost portion of the canonical wordmark.
  // Validate that the exact source region being clipped into the emblem slot
  // actually contains rendered pixels before the screenshot is declared ready.
  const cropWidth = Math.max(1, image.naturalWidth * 0.25);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    0,
    0,
    cropWidth,
    image.naturalHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let visiblePixels = 0;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] > 8) visiblePixels += 1;
  }
  if (visiblePixels < 16) throw new Error(`${label} loaded but its clipped source region contains no visible emblem pixels.`);
}

async function materializeReferenceEmblem(card, record) {
  const src = referenceEmblemImages[record.id];
  if (!src) return;

  const slot = card.querySelector('.reference-faction-emblem');
  if (!slot) throw new Error(`Reference card ${record.id} has no emblem slot.`);

  slot.replaceChildren();
  slot.classList.add('reference-faction-emblem--image');
  const image = document.createElement('img');
  image.className = 'reference-faction-emblem-image';
  image.alt = '';
  image.setAttribute('aria-hidden', 'true');
  image.src = src;
  slot.append(image);

  await waitForImage(image, `${record.id} emblem`);
  assertLeftCropHasPixels(image, `${record.id} emblem`);

  const slotRect = slot.getBoundingClientRect();
  const imageRect = image.getBoundingClientRect();
  if (!(slotRect.width > 0 && slotRect.height > 0 && imageRect.width > slotRect.width && imageRect.height > 0)) {
    throw new Error(`Reference card ${record.id} emblem image does not occupy the clipped emblem slot.`);
  }
}

function renderReference(record, sideName, gameVersion) {
  if (!record.faces?.[sideName]) throw new Error(`Reference card ${record.id} has no ${sideName} face.`);
  target.innerHTML = referenceCardMarkup(record, sideName, { version: gameVersion });
  const card = target.querySelector('.reference-card');
  if (!card) throw new Error(`Production reference renderer did not create ${record.id} ${sideName}.`);
  card.classList.add('supplemental-card');
  card.dataset.renderer = record.renderer;
  card.dataset.referenceUsage = 'Public supplemental reference · no card value · not part of the Deck';

  requestAnimationFrame(async () => {
    try {
      await materializeReferenceEmblem(card, record);
      if (document.fonts?.ready) await document.fonts.ready;
      const result = fitReferenceCard(card);
      if (result.overflow) {
        throw new Error(`Reference content cannot fit ${record.id} ${sideName} at the production readability floor (${referenceFitDiagnostics(card, result)}).`);
      }
      document.body.dataset.renderReady = 'true';
    } catch (error) {
      reportRenderError(error);
    }
  });
}

async function main() {
  const response = await fetch('/tts/generated/current/supplemental-catalog.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Supplemental catalog request failed: ${response.status}`);
  const catalog = await response.json();
  const record = (catalog.ready || []).find(item => item.id === componentId);
  if (!record) throw new Error(`Unknown ready supplemental component: ${componentId || 'missing'}`);

  // TTS supplemental records predate the bespoke-copy flag. Infer it from the
  // dedicated player-aid source path so reference-card presentation selectors
  // cannot re-filter approved bespoke copy through the old guide-derived map.
  if (record.renderer === 'reference-card' && String(record.source || '').includes('/reference-copy/')) {
    record.copyMode = 'bespoke';
  }

  if (record.renderer === 'rite-card') {
    if (side === 'front') renderRiteFront(record);
    else if (side === 'reverse') renderRiteReverse(record);
    else throw new Error(`Unsupported supplemental side: ${side}`);
    return;
  }

  if (record.renderer === 'reference-card') {
    if (side !== 'front' && side !== 'reverse') throw new Error(`Unsupported supplemental side: ${side}`);
    renderReference(record, side, catalog.gameVersion || 'Reference');
    return;
  }

  throw new Error(`Unsupported supplemental renderer ${record.renderer} for ${record.id}.`);
}

main().catch(error => {
  const message = error?.stack || error?.message || String(error);
  target.replaceChildren(element('pre', 'render-error', message));
  reportRenderError(error);
});
