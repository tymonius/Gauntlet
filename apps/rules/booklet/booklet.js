import { renderMarkdown } from './markdown.js';

const PUBLICATIONS = Object.freeze({
  'player-guide': Object.freeze({
    title: "Player's Guide",
    description: 'Learn the shared game, set up the table, understand the turn, and get from a starter Deck to the first decisive contests.',
    accent: '#8f1f25',
    hero: 1,
    coverFlavor: 'Learn the field before you command it',
  }),
  military: Object.freeze({
    title: 'Military Guide', name: 'Military', claim: 'Command the advance.', accent: '#8f1f25', symbol: '/images/faction-symbols/military.svg', hero: 2,
    description: 'The operating guide for Command, Orders, Military Leaders, and the Military path through the Gauntlet.',
    leaders: [['General', '/images/woodcuts/general.png'], ['Commandant', '/images/woodcuts/commandant.png']],
  }),
  diplomats: Object.freeze({
    title: 'Diplomats Guide', name: 'Diplomats', claim: 'Make the enemy agree.', accent: '#244b8f', symbol: '/images/faction-symbols/diplomats.svg', hero: 3,
    description: 'The operating guide for Influence, Proposals, Diplomat Leaders, and the diplomatic path through the Gauntlet.',
    leaders: [['Ambassador', '/images/woodcuts/ambassador.png'], ['Senator', '/images/woodcuts/senator.png']],
  }),
  financiers: Object.freeze({
    title: 'Financiers Guide', name: 'Financiers', claim: 'Own what others contest.', accent: '#276744', symbol: '/images/faction-symbols/financiers.svg', hero: 4,
    description: 'The operating guide for Capital, Deeds, Financier Leaders, and economic control of the Gauntlet.',
    leaders: [['Banker', '/images/woodcuts/banker.png'], ['Executive', '/images/woodcuts/executive.png']],
  }),
  intelligence: Object.freeze({
    title: 'Intelligence Guide', name: 'Intelligence', claim: 'Know before they act.', accent: '#34373b', symbol: '/images/faction-symbols/intelligence.svg', hero: 1,
    description: 'The operating guide for Intel, Operations, Intelligence Leaders, and covert progress through the Gauntlet.',
    leaders: [['Ranger', '/images/woodcuts/ranger.png'], ['Spymaster', '/images/woodcuts/spymaster.png']],
  }),
  mystics: Object.freeze({
    title: 'Mystics Guide', name: 'Mystics', claim: 'Transform the hidden world.', accent: '#603d78', symbol: '/images/faction-symbols/mystics.svg', hero: 2,
    description: 'The operating guide for Rites, Rituals, Mystic Leaders, and Arcane play in the Gauntlet.',
    leaders: [['Alchemist', '/images/woodcuts/alchemist.png'], ['Spirit Walker', '/images/woodcuts/spirit-walker.png']],
  }),
  inquisition: Object.freeze({
    title: 'Inquisition Guide', name: 'Inquisition', claim: 'Condemn what cannot endure.', accent: '#9a6e21', symbol: '/images/faction-symbols/inquisition.svg', hero: 3,
    description: 'The operating guide for Conviction, Purges, Inquisition Leaders, and doctrinal control of the Gauntlet.',
    leaders: [['Grand Inquisitor', '/images/woodcuts/grand-inquisitor.png'], ['Witch Hunter', '/images/woodcuts/witch-hunter.png']],
  }),
  'complete-rules': Object.freeze({
    title: 'Complete Rules',
    description: 'The complete technical rules reference for exact procedures, timing, interactions, definitions, and edge cases.',
    accent: '#8f1f25',
    hero: 4,
    coverFlavor: 'Exact language for difficult interactions',
  }),
});

const FACTION_DECORATION = Object.freeze({
  'Military —': ['#8f1f25', '/images/faction-symbols/military.svg'],
  'Diplomats —': ['#244b8f', '/images/faction-symbols/diplomats.svg'],
  'Financiers —': ['#276744', '/images/faction-symbols/financiers.svg'],
  'Intelligence —': ['#34373b', '/images/faction-symbols/intelligence.svg'],
  'Mystics —': ['#603d78', '/images/faction-symbols/mystics.svg'],
  'Inquisition —': ['#9a6e21', '/images/faction-symbols/inquisition.svg'],
});

const pagesRoot = document.querySelector('[data-booklet-pages]');
const sourceRoot = document.querySelector('[data-booklet-source]');
const pages = [];
const anchors = new Map();

function selectedPublication() {
  const requested = new URL(window.location.href).searchParams.get('doc') || 'player-guide';
  return [requested, PUBLICATIONS[requested] || PUBLICATIONS['player-guide']];
}

function numberedHeading(label) {
  const match = label.trim().match(/^(\d+)\.\s+(.+)$/);
  return match ? { number: match[1], title: match[2] } : null;
}

function partHeading(label) {
  const match = label.trim().match(/^Part\s+([IVXLCDM]+)\s+[—-]\s+(.+)$/i);
  return match ? { numeral: match[1], title: match[2] } : null;
}

function pageFurniture(number, label) {
  const side = number % 2 === 0 ? 'left' : 'right';
  const folioLabel = `<span class="folio-label">${label}</span>`;
  const folioNumber = `<span class="folio-number">${number}</span>`;
  const folio = side === 'left' ? `${folioNumber}${folioLabel}` : `${folioLabel}${folioNumber}`;
  return `<div class="footer-rule"></div><div class="folio">${folio}</div>`;
}

function createPage({ className = '', runningLeft = '', runningRight = '', label = 'GAUNTLET · V0.7.2', furniture = true } = {}) {
  const number = pages.length + 1;
  const side = number % 2 === 0 ? 'left' : 'right';
  const page = document.createElement('section');
  page.className = `page ${side} ${className}`.trim();
  page.dataset.page = String(number);
  page.innerHTML = `<div class="page-inner">${runningLeft || runningRight ? `<div class="running-head"><span>${runningLeft}</span><span>${runningRight}</span></div>` : ''}<div class="page-flow"></div></div>${furniture ? pageFurniture(number, label) : ''}`;
  pagesRoot.append(page);
  pages.push(page);
  return page;
}

function flowOf(page) { return page.querySelector('.page-flow'); }
function overflows(page) {
  const flow = flowOf(page);
  return Boolean(flow && flow.scrollHeight > flow.clientHeight + 1);
}
function hasBodyContent(page) {
  const flow = flowOf(page);
  return Boolean(flow && [...flow.children].some(node => !node.classList.contains('continuation-label')));
}

function createCover(publication) {
  const page = createPage({ className: `cover front-cover${publication.name ? ' faction-cover' : ''}`, furniture: false });
  page.style.setProperty('--page-accent', publication.accent);
  const flow = flowOf(page);
  flow.outerHTML = `
    <div class="cover-rule"></div>
    <p class="cover-flavor">${publication.coverFlavor || 'A field guide to institutional power'}</p>
    <img class="cover-wordmark" src="/images/Gauntlet.svg" alt="Gauntlet" />
    <div class="cover-publication-row">
      <div>
        <h1 class="cover-publication-title candidate-document-title">${publication.title}</h1>
        <p class="cover-subtitle">Modular Rules Publication</p>
        <p class="cover-version">Version 0.7.2 · 2026</p>
      </div>
      ${publication.symbol ? `<span class="cover-faction-symbol" style="--booklet-symbol:url(&quot;${publication.symbol}&quot;)" aria-hidden="true"></span>` : ''}
    </div>
    <div class="cover-art"><img src="/images/woodcuts/hero compositions/hero ${publication.hero}.png" alt="" /></div>
    <div class="cover-bottom"><span>Tactical card-and-territory game</span><span>gauntlet.run</span></div>`;
}

function createContentsPage(publication, headings) {
  const page = createPage({ className: 'contents-page', runningLeft: publication.title, runningRight: 'Contents', label: `${publication.title.toUpperCase()} · V0.7.2` });
  page.style.setProperty('--page-accent', publication.accent);
  const flow = flowOf(page);
  flow.innerHTML = '<p class="flavor-overline">Begin here</p><h2 class="page-title">Contents</h2><div class="contents-grid"><div class="contents-column"></div><div class="contents-column"></div></div><div class="reading-guide"><strong>Reading guide.</strong> Start with the opening sections, then use chapter headings to find the procedure you need. Exact edge cases belong in the Complete Rules.</div>';
  const columns = [...flow.querySelectorAll('.contents-column')];
  const entries = headings.filter(({ level }) => level === 2);
  entries.forEach((entry, index) => {
    const numbered = numberedHeading(entry.label);
    const part = partHeading(entry.label);
    const row = document.createElement('div');
    row.className = 'contents-entry';
    row.dataset.target = entry.id;
    row.innerHTML = `<span class="contents-number">${numbered?.number || part?.numeral || '·'}</span><span class="contents-title">${numbered?.title || part?.title || entry.label}</span><span class="toc-page">—</span>`;
    columns[index < Math.ceil(entries.length / 2) ? 0 : 1].append(row);
  });
  return page;
}

function createBackCover(publication) {
  const page = createPage({ className: 'back-cover', furniture: false });
  page.style.setProperty('--page-accent', publication.accent);
  const flow = flowOf(page);
  flow.outerHTML = `
    <p class="back-flavor">Run the Gauntlet</p>
    <h2>Build. Advance. Contend. Capture.</h2>
    <p class="back-copy">${publication.description}</p>
    <div class="back-url">GAUNTLET.RUN</div>
    <div class="back-accounting">
      <img src="/images/branding/tds-games-mark.svg" alt="TDS Games" />
      <div><strong>Gauntlet v0.7.2 · ${publication.title}</strong><span>Published by TDS Games, an imprint of Misty Hollow Enterprises.</span><span>Copyright © 2026 Tymon Scott. All rights reserved.</span></div>
    </div>`;
}

function createWoodcutPage(publication, index) {
  const page = createPage({ className: 'woodcut-page', furniture: false });
  page.style.setProperty('--page-accent', publication.accent);
  const hero = ((index % 4) + 1);
  flowOf(page).outerHTML = `<img src="/images/woodcuts/hero compositions/hero ${hero}.png" alt="" /><div class="woodcut-mark">Gauntlet</div>`;
}

function newContinuationPage(context) {
  const page = createPage({
    className: 'continuation-page',
    runningLeft: context.runningLeft,
    runningRight: context.runningRight,
    label: context.label,
  });
  page.style.setProperty('--page-accent', context.accent);
  flowOf(page).innerHTML = `<div class="continuation-label">${context.runningRight} · continued</div>`;
  return page;
}

function splitSections(content) {
  const sections = [];
  let prelude = [];
  let current = null;
  for (const child of [...content.children]) {
    if (child.tagName === 'H1') continue;
    if (child.tagName === 'BLOCKQUOTE' && sections.length === 0 && !current && prelude.length === 0) continue;
    if (child.tagName === 'H2') {
      if (current) sections.push(current);
      current = { heading: child, nodes: [] };
    } else if (current) {
      current.nodes.push(child);
    } else {
      prelude.push(child);
    }
  }
  if (current) sections.push(current);
  return { prelude, sections };
}

function cloneNode(node) {
  const clone = node.cloneNode(true);
  clone.querySelectorAll?.('img[loading="lazy"]').forEach(image => { image.loading = 'eager'; });
  return clone;
}

function appendListAcrossPages(node, page, context) {
  const ordered = node.tagName === 'OL';
  let current = page;
  let list = document.createElement(ordered ? 'ol' : 'ul');
  flowOf(current).append(list);
  for (const item of [...node.children]) {
    const clone = item.cloneNode(true);
    list.append(clone);
    if (!overflows(current)) continue;
    clone.remove();
    if (list.children.length === 0) list.remove();
    current = newContinuationPage(context);
    list = document.createElement(ordered ? 'ol' : 'ul');
    flowOf(current).append(list);
    list.append(clone);
  }
  return current;
}

function newTableShell(headers) {
  const shell = document.createElement('div');
  shell.className = 'table-scroll';
  const table = document.createElement('table');
  if (headers) table.append(headers.cloneNode(true));
  const tbody = document.createElement('tbody');
  table.append(tbody);
  shell.append(table);
  return { shell, tbody };
}

function appendTableAcrossPages(wrapper, page, context) {
  const table = wrapper.querySelector('table');
  if (!table) return appendNodeAcrossPages(wrapper, page, context);
  const headers = table.querySelector('thead')?.cloneNode(true);
  const rows = [...table.querySelectorAll('tbody > tr')];
  let current = page;
  let tableParts = newTableShell(headers);
  flowOf(current).append(tableParts.shell);

  for (const row of rows) {
    const clone = row.cloneNode(true);
    tableParts.tbody.append(clone);
    if (!overflows(current)) continue;

    clone.remove();
    if (!tableParts.tbody.children.length) tableParts.shell.remove();
    current = newContinuationPage(context);
    tableParts = newTableShell(headers);
    flowOf(current).append(tableParts.shell);
    tableParts.tbody.append(clone);
  }
  return current;
}

function appendParagraphAcrossPages(node, page, context) {
  const clone = cloneNode(node);
  flowOf(page).append(clone);
  if (!overflows(page)) return page;
  clone.remove();
  if (hasBodyContent(page)) {
    const next = newContinuationPage(context);
    flowOf(next).append(clone);
    if (!overflows(next)) return next;
    clone.remove();
    page = next;
  }
  const words = (node.textContent || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    flowOf(page).append(clone);
    return page;
  }
  let current = page;
  let start = 0;
  while (start < words.length) {
    const paragraph = document.createElement('p');
    flowOf(current).append(paragraph);
    let end = start;
    while (end < words.length) {
      paragraph.textContent = words.slice(start, end + 1).join(' ');
      if (overflows(current)) break;
      end += 1;
    }
    if (end === start) {
      paragraph.textContent = words[start];
      end += 1;
    } else if (end < words.length) {
      paragraph.textContent = words.slice(start, end).join(' ');
    }
    start = end;
    if (start < words.length) current = newContinuationPage(context);
  }
  return current;
}

function appendNodeAcrossPages(node, page, context) {
  if (node.matches?.('ul, ol')) return appendListAcrossPages(node, page, context);
  if (node.classList?.contains('table-scroll')) return appendTableAcrossPages(node, page, context);
  if (node.tagName === 'P') return appendParagraphAcrossPages(node, page, context);

  let current = page;
  const clone = cloneNode(node);
  const flow = flowOf(current);
  if (/^H[34]$/.test(clone.tagName) && flow.clientHeight - flow.scrollHeight < 80) {
    current = newContinuationPage(context);
  }
  flowOf(current).append(clone);
  if (!overflows(current)) return current;
  clone.remove();
  if (hasBodyContent(current)) current = newContinuationPage(context);
  flowOf(current).append(clone);
  return current;
}

function digitalToolsGrid(tableWrapper) {
  const grid = document.createElement('div');
  grid.className = 'digital-tools-grid';
  const cells = [...tableWrapper.querySelectorAll('tbody td')];
  for (const cell of cells) {
    const card = document.createElement('article');
    card.className = 'digital-tool';
    const image = cell.querySelector('img')?.cloneNode(true);
    if (image) { image.loading = 'eager'; card.append(image); }
    const copy = document.createElement('div');
    copy.className = 'digital-tool-copy';
    const clone = cell.cloneNode(true);
    clone.querySelector('img')?.remove();
    copy.innerHTML = clone.innerHTML;
    card.append(copy);
    grid.append(card);
  }
  return grid;
}

function leaderGallery(publication) {
  if (!publication.leaders?.length) return null;
  const gallery = document.createElement('section');
  gallery.className = 'candidate-featured-leaders';
  gallery.setAttribute('aria-label', `${publication.name} Leaders`);
  publication.leaders.forEach(([name, src]) => {
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    image.className = 'leader-portrait';
    image.src = src;
    image.alt = `${name} Leader woodcut`;
    image.loading = 'eager';
    const caption = document.createElement('figcaption');
    caption.textContent = name;
    figure.append(image, caption);
    gallery.append(figure);
  });
  return gallery;
}

function decorateFactionOverviewHeading(node) {
  const label = node.textContent.trim();
  const entry = Object.entries(FACTION_DECORATION).find(([prefix]) => label.startsWith(prefix));
  if (!entry) return node;
  const [, [accent, symbol]] = entry;
  const clone = cloneNode(node);
  clone.classList.add('faction-overview-heading');
  clone.style.setProperty('--overview-accent', accent);
  clone.style.setProperty('--overview-symbol', `url("${symbol}")`);
  return clone;
}

function createSectionPage(section, publication, documentId) {
  const label = section.heading.textContent.trim();
  const numbered = numberedHeading(label);
  const part = partHeading(label);
  const isFactionOpener = Boolean(publication.name && /^Meet the /i.test(label));
  const runningRight = numbered?.title || part?.title || label;
  const context = {
    runningLeft: publication.title,
    runningRight,
    label: numbered ? `CHAPTER ${numbered.number}` : part ? `PART ${part.numeral}` : publication.title.toUpperCase(),
    accent: publication.accent,
  };
  const page = createPage({
    className: `${part ? 'part-page' : ''} ${isFactionOpener ? 'faction-opener' : ''}`.trim(),
    runningLeft: context.runningLeft,
    runningRight: context.runningRight,
    label: context.label,
  });
  page.style.setProperty('--page-accent', publication.accent);
  const flow = flowOf(page);

  if (section.heading.id) anchors.set(section.heading.id, page);
  if (part) {
    flow.innerHTML = `<div class="part-rule"></div><div class="part-label">PART ${part.numeral}</div><h2 id="${section.heading.id}" class="part-title">${part.title}</h2>`;
  } else if (isFactionOpener) {
    flow.innerHTML = `<div class="faction-rule"></div><span class="faction-symbol-large" style="--booklet-symbol:url(&quot;${publication.symbol}&quot;)" aria-hidden="true"></span><div class="faction-name">${publication.name}</div><h2 id="${section.heading.id}" class="faction-claim">${publication.claim}</h2>`;
  } else if (numbered) {
    flow.innerHTML = `<div class="chapter-title-row"><div class="chapter-number">${numbered.number}</div><h2 id="${section.heading.id}">${numbered.title}</h2></div>`;
  } else {
    flow.innerHTML = `<p class="flavor-overline">${documentId === 'complete-rules' ? 'Reference' : 'At the table'}</p><h2 id="${section.heading.id}" class="page-title">${label}</h2>`;
  }
  return { page, context };
}

function paginateSection(section, publication, documentId) {
  let { page, context } = createSectionPage(section, publication, documentId);
  const sectionLabel = section.heading.textContent.trim();

  if (publication.leaders && /Your Leaders$/i.test(sectionLabel.replace(/^\d+\.\s*/, ''))) {
    const gallery = leaderGallery(publication);
    if (gallery) {
      flowOf(page).append(gallery);
      if (overflows(page)) {
        gallery.remove();
        page = newContinuationPage(context);
        flowOf(page).append(gallery);
      }
    }
  }

  for (const original of section.nodes) {
    let node = original;
    if (documentId === 'player-guide' && sectionLabel === '9. The Six Factions' && original.tagName === 'H3') {
      node = decorateFactionOverviewHeading(original);
    }
    if (sectionLabel === 'At the Table: Digital Tools' && original.classList?.contains('table-scroll')) {
      const grid = digitalToolsGrid(original);
      page.classList.add('digital-tools-page');
      page = appendNodeAcrossPages(grid, page, context);
      continue;
    }
    page = appendNodeAcrossPages(node, page, context);
  }
}

function fillContents() {
  pagesRoot.querySelectorAll('.contents-entry').forEach(entry => {
    const target = anchors.get(entry.dataset.target);
    entry.querySelector('.toc-page').textContent = target?.dataset.page || '—';
  });
}

async function waitForImages() {
  const images = [...pagesRoot.querySelectorAll('img')];
  await Promise.all(images.map(image => image.complete && image.naturalWidth > 0
    ? image.decode?.().catch(() => undefined)
    : new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      })));
}

async function main() {
  const [documentId, publication] = selectedPublication();
  document.documentElement.style.setProperty('--booklet-accent', publication.accent);
  document.body.dataset.bookletDocument = documentId;
  document.body.dataset.rulesetMode = 'candidate';
  document.body.dataset.candidateDocument = documentId;

  const sourcePath = documentId === 'complete-rules'
    ? 'complete-rules'
    : documentId === 'player-guide'
      ? 'player-guide'
      : `factions/${documentId}`;
  const response = await fetch(`../sources/${encodeURIComponent(sourcePath)}.md`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load ${publication.title}: HTTP ${response.status}`);
  const rendered = renderMarkdown(await response.text());
  sourceRoot.innerHTML = rendered.html;

  await Promise.race([
    document.fonts?.ready || Promise.resolve(),
    new Promise(resolve => setTimeout(resolve, 10000)),
  ]);

  createCover(publication);
  createContentsPage(publication, rendered.headings);
  const { prelude, sections } = splitSections(sourceRoot);
  if (prelude.length) {
    const synthetic = document.createElement('h2');
    synthetic.id = 'introduction';
    synthetic.textContent = 'Introduction';
    paginateSection({ heading: synthetic, nodes: prelude }, publication, documentId);
  }
  sections.forEach(section => paginateSection(section, publication, documentId));

  const fillerCount = (4 - ((pages.length + 1) % 4)) % 4;
  for (let index = 0; index < fillerCount; index += 1) createWoodcutPage(publication, index);
  createBackCover(publication);
  fillContents();
  await waitForImages();

  document.title = `${publication.title} — Gauntlet v0.7.2`;
  document.body.dataset.bookletReady = 'true';
}

main().catch(error => {
  document.body.dataset.bookletReady = 'error';
  document.body.dataset.bookletError = error.message;
  throw error;
});
