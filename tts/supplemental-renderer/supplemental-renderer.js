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

function renderReference(record, sideName, gameVersion) {
  if (!record.faces?.[sideName]) throw new Error(`Reference card ${record.id} has no ${sideName} face.`);
  target.innerHTML = referenceCardMarkup(record, sideName, { version: gameVersion });
  const card = target.querySelector('.reference-card');
  if (!card) throw new Error(`Production reference renderer did not create ${record.id} ${sideName}.`);
  card.classList.add('supplemental-card');
  card.dataset.renderer = record.renderer;

  requestAnimationFrame(async () => {
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const result = fitReferenceCard(card);
      if (result.overflow) {
        throw new Error(`Reference content cannot fit ${record.id} ${sideName} at the production readability floor.`);
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
