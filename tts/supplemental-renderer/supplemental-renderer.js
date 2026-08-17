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

function riteHeader(record, kicker) {
  const header = element('header', 'rite-header');
  header.append(
    element('p', 'rite-kicker', kicker),
    element('h1', 'rite-title', record.name),
    element('div', 'rite-symbol', riteSymbols[record.id] || '✦'),
  );
  return header;
}

function renderBlock(block) {
  const wrapper = element('div', 'rite-block');
  if (block.label) {
    const paragraph = document.createElement('p');
    const label = document.createElement('strong');
    label.textContent = `${block.label}: `;
    paragraph.append(label, document.createTextNode(block.text || ''));
    wrapper.append(paragraph);
    return wrapper;
  }
  if (block.type === 'list') {
    const list = document.createElement('ul');
    for (const item of block.items || []) list.append(element('li', '', item));
    wrapper.append(list);
    return wrapper;
  }
  wrapper.append(element('p', '', block.text || ''));
  return wrapper;
}

function renderFront(record) {
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

function renderReverse(record) {
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
    throw new Error(`Failed to load reverse artwork for ${record.id}: ${record.reverseArtwork}`);
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

async function main() {
  const response = await fetch('/tts/generated/current/supplemental-catalog.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Supplemental catalog request failed: ${response.status}`);
  const catalog = await response.json();
  const record = (catalog.ready || []).find((item) => item.id === componentId);
  if (!record) throw new Error(`Unknown ready supplemental component: ${componentId || 'missing'}`);
  if (record.renderer !== 'rite-card') throw new Error(`Unsupported supplemental renderer ${record.renderer} for ${record.id}.`);
  if (side === 'front') renderFront(record);
  else if (side === 'reverse') renderReverse(record);
  else throw new Error(`Unsupported supplemental side: ${side}`);
}

main().catch((error) => {
  console.error(error);
  target.replaceChildren(element('pre', 'render-error', error.stack || error.message || String(error)));
  document.body.dataset.renderError = 'true';
});
