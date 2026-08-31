const readerRoot = document.querySelector('#reader-root');
const bookletRoot = document.querySelector('#booklet-root');
const data = JSON.parse(document.querySelector('#rulebook-data').textContent);
const { tokens, metadata } = data;
const mode = new URLSearchParams(location.search).get('mode') === 'booklet' ? 'booklet' : 'reader';
document.body.dataset.mode = mode;

const consumed = new Set();
const anchors = new Map();
const pages = [];
let currentPart = 'Front Matter';
let currentFaction = null;

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function sourceAttr(token) {
  return token ? ` data-source-id="${escapeHtml(token.id)}"` : '';
}

function running(left, right) {
  return `<div class="running-head"><span>${escapeHtml(left)}</span><span>${escapeHtml(right)}</span></div>`;
}

function pageFurniture(number, label, side) {
  const folioLabel = `<span class="folio-label">${escapeHtml(label || 'GAUNTLET V0.6.1')}</span>`;
  const folioNumber = `<span class="folio-number">${number}</span>`;
  const content = side === 'left' ? `${folioNumber}${folioLabel}` : `${folioLabel}${folioNumber}`;
  return `<div class="footer-rule"></div><div class="folio">${content}</div>`;
}

function createPage({ className = '', label = '', runningLeft = '', runningRight = '', faction = null, anchor = null, furniture = true } = {}) {
  const number = pages.length + 1;
  const side = number % 2 === 0 ? 'left' : 'right';
  const page = document.createElement('section');
  page.className = `page ${side} ${className}`.trim();
  page.dataset.page = String(number);
  if (faction) page.dataset.faction = faction;
  page.innerHTML = `<div class="page-inner">${runningLeft || runningRight ? running(runningLeft, runningRight) : ''}<div class="production-flow"></div></div>${furniture ? pageFurniture(number, label, side) : ''}`;
  readerRoot.append(page);
  pages.push(page);
  if (anchor) registerAnchor(anchor, page);
  return page;
}

function appendApprovedTemplate(id, anchor = null) {
  const template = document.querySelector(id);
  const page = template.content.firstElementChild.cloneNode(true);
  readerRoot.append(page);
  pages.push(page);
  if (anchor) registerAnchor(anchor, page);
  return page;
}

function registerAnchor(key, page) {
  if (!anchors.has(key)) anchors.set(key, page);
  page.dataset.anchor = key;
}

function intentionalBlank(reason = 'Section begins on the following recto') {
  const page = createPage({ className: 'intentional-blank', furniture: false });
  page.querySelector('.production-flow').outerHTML = `<div class="blank-mark"></div><div class="blank-note">${escapeHtml(reason)}</div>`;
  return page;
}

function ensureRecto(reason) {
  if ((pages.length + 1) % 2 === 0) intentionalBlank(reason);
}

function splitH1Sections(sourceTokens) {
  const sections = [];
  let current = { heading: null, tokens: [] };
  for (const token of sourceTokens) {
    if (token.kind === 'heading' && token.level === 1) {
      if (current.heading || current.tokens.length) sections.push(current);
      current = { heading: token, tokens: [] };
    } else {
      current.tokens.push(token);
    }
  }
  if (current.heading || current.tokens.length) sections.push(current);
  return sections;
}

const sections = splitH1Sections(tokens);
const sectionByTitle = new Map(sections.filter(section => section.heading).map(section => [section.heading.title, section]));

function makeTokenElement(token, { headingOffset = 0 } = {}) {
  let element;
  if (token.kind === 'paragraph') {
    element = document.createElement('p');
    element.innerHTML = token.html;
  } else if (token.kind === 'heading') {
    const level = Math.min(5, Math.max(2, token.level + headingOffset));
    element = document.createElement(`h${level}`);
    element.innerHTML = token.html;
  } else if (token.kind === 'list') {
    element = document.createElement(token.ordered ? 'ol' : 'ul');
    for (const item of token.items) {
      const li = document.createElement('li');
      li.innerHTML = item;
      element.append(li);
    }
  } else if (token.kind === 'table') {
    element = document.createElement('table');
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const header of token.headers) {
      const th = document.createElement('th');
      th.innerHTML = header;
      headRow.append(th);
    }
    thead.append(headRow);
    const tbody = document.createElement('tbody');
    for (const row of token.rows) {
      const tr = document.createElement('tr');
      for (const cell of row) {
        const td = document.createElement('td');
        td.innerHTML = cell;
        tr.append(td);
      }
      tbody.append(tr);
    }
    element.append(thead, tbody);
  } else if (token.kind === 'quote') {
    element = document.createElement('blockquote');
    for (const paragraph of token.paragraphs) {
      const p = document.createElement('p');
      p.innerHTML = paragraph;
      element.append(p);
    }
  } else if (token.kind === 'image') {
    element = document.createElement('img');
    element.className = 'print-image';
    element.src = token.src;
    element.alt = token.alt;
  } else if (token.kind === 'divider') {
    element = document.createElement('div');
    element.className = 'source-divider';
  } else {
    element = document.createElement('div');
  }
  element.dataset.sourceId = token.id;
  return element;
}

function flowOf(page) {
  return page.querySelector('.production-flow');
}

function overflows(flow) {
  return flow.scrollHeight > flow.clientHeight + 1;
}

function hasRealContent(flow) {
  return [...flow.children].some(child => !child.classList.contains('continuation-label'));
}

function newContinuationPage(context) {
  const page = createPage({
    className: 'chapter-page continuation-page',
    label: context.label,
    runningLeft: context.runningLeft,
    runningRight: context.runningRight,
    faction: context.faction,
  });
  const flow = flowOf(page);
  const label = document.createElement('div');
  label.className = 'continuation-label';
  label.textContent = `${context.title} · continued`;
  flow.append(label);
  return page;
}

function fragmentToken(token, field, values) {
  return { ...token, [field]: values, fragment: true };
}

function sentenceFragments(token) {
  const text = token.plain || '';
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [text];
  if (sentences.length < 2) {
    const words = text.split(/\s+/);
    const midpoint = Math.ceil(words.length / 2);
    return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')].filter(Boolean);
  }
  return sentences.map(item => item.trim()).filter(Boolean);
}

function largestFittingCount(token, field, values, flow, render = makeTokenElement) {
  let low = 1;
  let high = values.length;
  let best = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = render(fragmentToken(token, field, values.slice(0, mid)));
    candidate.classList.add('split-fragment');
    flow.append(candidate);
    const fits = !overflows(flow);
    candidate.remove();
    if (fits) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

function splitAndAppend(token, page, context) {
  let current = page;
  let flow = flowOf(current);
  let field;
  let values;
  if (token.kind === 'list') {
    field = 'items'; values = token.items;
  } else if (token.kind === 'table') {
    field = 'rows'; values = token.rows;
  } else if (token.kind === 'quote') {
    field = 'paragraphs'; values = token.paragraphs;
  } else if (token.kind === 'paragraph') {
    field = 'html';
    values = sentenceFragments(token);
  } else {
    const element = makeTokenElement(token);
    flow.append(element);
    return current;
  }

  let remaining = [...values];
  while (remaining.length) {
    if (hasRealContent(flow)) {
      current = newContinuationPage(context);
      flow = flowOf(current);
    }
    let count;
    if (token.kind === 'paragraph') {
      const paragraphRenderer = fragment => {
        const element = document.createElement('p');
        element.dataset.sourceId = token.id;
        element.textContent = fragment.html.join(' ');
        return element;
      };
      count = largestFittingCount(token, field, remaining, flow, paragraphRenderer);
      if (count < 1) count = Math.min(remaining.length, 1);
      const element = document.createElement('p');
      element.dataset.sourceId = token.id;
      element.className = 'split-fragment';
      element.textContent = remaining.slice(0, count).join(' ');
      flow.append(element);
    } else {
      count = largestFittingCount(token, field, remaining, flow);
      if (count < 1) count = Math.min(remaining.length, 1);
      const element = makeTokenElement(fragmentToken(token, field, remaining.slice(0, count)));
      element.classList.add('split-fragment');
      flow.append(element);
    }
    remaining = remaining.slice(count);
    if (remaining.length) {
      current = newContinuationPage(context);
      flow = flowOf(current);
    }
  }
  return current;
}

function appendSingleToken(token, page, context) {
  let current = page;
  let flow = flowOf(current);
  const element = makeTokenElement(token);
  flow.append(element);
  if (!overflows(flow)) return current;
  element.remove();

  if (hasRealContent(flow)) {
    current = newContinuationPage(context);
    flow = flowOf(current);
    flow.append(element);
    if (!overflows(flow)) return current;
    element.remove();
  }
  return splitAndAppend(token, current, context);
}

function paginateTokens(sourceTokens, context, firstPage = null) {
  let page = firstPage || newContinuationPage(context);
  for (let index = 0; index < sourceTokens.length; index += 1) {
    const token = sourceTokens[index];
    if (token.kind === 'divider') {
      consumed.add(token.id);
      continue;
    }
    if (token.kind === 'pagebreak') {
      consumed.add(token.id);
      if (hasRealContent(flowOf(page))) page = newContinuationPage(context);
      continue;
    }

    const next = sourceTokens[index + 1];
    if (token.kind === 'heading' && next && !['heading', 'pagebreak', 'divider'].includes(next.kind)) {
      const group = document.createElement('div');
      group.className = 'keep-group';
      group.append(makeTokenElement(token), makeTokenElement(next));
      const flow = flowOf(page);
      flow.append(group);
      if (overflows(flow)) {
        group.remove();
        if (hasRealContent(flow)) page = newContinuationPage(context);
        const target = flowOf(page);
        target.append(group);
        if (overflows(target)) {
          group.remove();
          page = appendSingleToken(token, page, context);
          page = appendSingleToken(next, page, context);
        }
      }
      index += 1;
      continue;
    }
    page = appendSingleToken(token, page, context);
  }
  return page;
}

function sectionContent(section) {
  return section ? section.tokens.filter(token => token.kind !== 'divider') : [];
}

function addSourceParagraph(container, token, className = '') {
  const p = document.createElement('p');
  p.dataset.sourceId = token.id;
  p.className = className;
  p.innerHTML = token.html;
  container.append(p);
  return p;
}

function markSectionConsumed(section) {
  if (section?.heading) consumed.add(section.heading.id);
  for (const token of section?.tokens || []) consumed.add(token.id);
}

function buildContentsPage() {
  const page = createPage({ className: 'production-toc', label: 'GAUNTLET V0.6.1', runningLeft: 'Official Rulebook', runningRight: 'Contents', anchor: 'Contents' });
  const flow = flowOf(page);
  flow.innerHTML = '<p class="flavor-overline">Begin here</p><h2 class="page-title">Contents</h2><div class="contents-grid"><div class="toc-column toc-column-a"></div><div class="toc-column toc-column-b"></div></div><div class="reading-guide"><strong>Reading guide.</strong> Read Part I from front to back. Consult Complete Shared Rules when timing, exceptions, or unusual interactions matter. Read only the faction chapters used in the current game.</div>';
  const columns = [flow.querySelector('.toc-column-a'), flow.querySelector('.toc-column-b')];
  const partEntries = Object.keys(metadata.parts).map((part, index) => ({ part, index }));
  partEntries.forEach(({ part, index }) => {
    const group = document.createElement('div');
    group.className = 'toc-group';
    const meta = metadata.parts[part];
    group.innerHTML = `<div class="toc-heading"><span class="toc-part">${meta.label}</span><span class="toc-title">${meta.title}</span><span class="toc-page" data-toc-target="${escapeHtml(part)}"></span></div>`;
    for (const chapter of metadata.chapters.filter(item => item.part === part && item.title !== 'Copyright and Playtest Use')) {
      const number = chapter.number ?? '';
      const row = document.createElement('div');
      row.className = 'toc-entry';
      row.innerHTML = `<span>${number}</span><span>${escapeHtml(chapter.title)}</span><span class="toc-page" data-toc-target="${escapeHtml(chapter.heading)}"></span>`;
      group.append(row);
    }
    columns[index < 2 ? 0 : 1].append(group);
  });
  return page;
}

function buildFrontMatter() {
  const welcome = sectionByTitle.get('Welcome to Gauntlet');
  const use = sectionByTitle.get('How to Use This Rulebook');
  const glance = sectionByTitle.get('Game at a Glance');
  const win = sectionByTitle.get('How to Win');
  const golden = sectionByTitle.get('Golden Rules');

  const page = createPage({ className: 'frontmatter-page', label: 'WELCOME', runningLeft: 'Official Rulebook', runningRight: 'Welcome', anchor: 'Welcome to Gauntlet' });
  const flow = flowOf(page);
  const welcomeHeading = document.createElement('h2');
  welcomeHeading.className = 'page-title';
  welcomeHeading.dataset.sourceId = welcome.heading.id;
  welcomeHeading.textContent = welcome.heading.title;
  flow.append(welcomeHeading);
  sectionContent(welcome).forEach((token, index) => {
    if (token.kind === 'paragraph') addSourceParagraph(flow, token, index === 0 ? 'frontmatter-lead' : '');
    else consumed.add(token.id);
  });
  const useHeading = document.createElement('h3');
  useHeading.className = 'subhead';
  useHeading.dataset.sourceId = use.heading.id;
  useHeading.textContent = use.heading.title;
  flow.append(useHeading);
  sectionContent(use).forEach(token => {
    if (token.kind === 'paragraph') addSourceParagraph(flow, token);
    else if (token.kind === 'list') flow.append(makeTokenElement(token));
    else consumed.add(token.id);
  });

  const glancePage = createPage({ className: 'frontmatter-page glance-page', label: 'WELCOME', runningLeft: 'Welcome', runningRight: 'Game at a Glance', anchor: 'Game at a Glance' });
  const glanceFlow = flowOf(glancePage);
  const glanceHeading = document.createElement('h2');
  glanceHeading.className = 'page-title';
  glanceHeading.dataset.sourceId = glance.heading.id;
  glanceHeading.textContent = glance.heading.title;
  glanceFlow.append(glanceHeading);
  const glanceTokens = sectionContent(glance).filter(token => token.kind === 'paragraph');
  const grid = document.createElement('div');
  grid.className = 'glance-grid';
  glanceTokens.forEach((token, index) => {
    const article = document.createElement('article');
    article.className = 'glance-step';
    article.dataset.sourceId = token.id;
    article.innerHTML = `<span class="step-label">${index + 1}</span><p>${token.html}</p>`;
    grid.append(article);
  });
  glanceFlow.append(grid);
  const winHeading = document.createElement('h3');
  winHeading.dataset.sourceId = win.heading.id;
  winHeading.textContent = win.heading.title;
  const victory = document.createElement('div');
  victory.className = 'victory-band';
  victory.append(winHeading);
  sectionContent(win).forEach(token => {
    if (token.kind === 'paragraph' || token.kind === 'list') victory.append(makeTokenElement(token));
    else consumed.add(token.id);
  });
  glanceFlow.append(victory);

  const goldenPage = createPage({ className: 'frontmatter-page', label: 'WELCOME', runningLeft: 'Welcome', runningRight: 'Golden Rules', anchor: 'Golden Rules' });
  const goldenFlow = flowOf(goldenPage);
  goldenFlow.innerHTML = '<p class="flavor-overline">Rules before exceptions</p>';
  const goldenHeading = document.createElement('h2');
  goldenHeading.className = 'page-title';
  goldenHeading.dataset.sourceId = golden.heading.id;
  goldenHeading.textContent = golden.heading.title;
  goldenFlow.append(goldenHeading);
  const goldenGrid = document.createElement('div');
  goldenGrid.className = 'golden-rules';
  for (const token of sectionContent(golden)) {
    if (token.kind === 'list') {
      token.items.forEach((item, index) => {
        const entry = document.createElement('div');
        entry.dataset.sourceId = token.id;
        entry.dataset.fragment = String(index + 1);
        entry.innerHTML = item;
        goldenGrid.append(entry);
      });
    } else {
      goldenGrid.append(makeTokenElement(token));
    }
  }
  goldenFlow.append(goldenGrid);
}

function partChapterEntries(partTitle) {
  return metadata.chapters.filter(chapter => chapter.part === partTitle && chapter.title !== 'Copyright and Playtest Use');
}

function buildPartOpener(section) {
  const title = section.heading.title;
  const meta = metadata.parts[title];
  ensureRecto(`${meta.label} begins on a recto`);
  const page = createPage({ className: 'part-opener', label: meta.label, runningLeft: meta.label, runningRight: meta.title, anchor: title });
  const flow = flowOf(page);
  flow.outerHTML = `<div class="part-label"${sourceAttr(section.heading)}>${meta.label}</div><p class="flavor-overline">${escapeHtml(meta.flavor)}</p><h2>${escapeHtml(meta.title)}</h2><p class="part-summary">${escapeHtml(meta.summary)}</p><div class="part-index"></div>`;
  const index = page.querySelector('.part-index');
  for (const chapter of partChapterEntries(title)) {
    const item = document.createElement('div');
    item.innerHTML = `<strong>${chapter.number ?? ''}</strong><span class="toc-page" data-toc-target="${escapeHtml(chapter.heading)}"></span><br />${escapeHtml(chapter.title)}`;
    index.append(item);
  }
  currentPart = title;
  return page;
}

function extractHowAndComplete(sectionTokens) {
  const howIndex = sectionTokens.findIndex(token => token.kind === 'heading' && token.level === 2 && token.title === 'How it works');
  const completeIndex = sectionTokens.findIndex(token => token.kind === 'heading' && token.level === 2 && token.title === 'Complete rules');
  const howHeading = howIndex >= 0 ? sectionTokens[howIndex] : null;
  const completeHeading = completeIndex >= 0 ? sectionTokens[completeIndex] : null;
  const howTokens = howIndex >= 0 ? sectionTokens.slice(howIndex + 1, completeIndex >= 0 ? completeIndex : sectionTokens.length) : [];
  const remaining = completeIndex >= 0 ? sectionTokens.slice(completeIndex + 1) : sectionTokens.filter((_, index) => index !== howIndex);
  return { howHeading, completeHeading, howTokens, remaining };
}

function chapterContext(number, title, faction = null) {
  return {
    title,
    label: number ? `CHAPTER ${number}` : 'REFERENCE',
    runningLeft: currentPart.replace(' — ', ' · '),
    runningRight: title,
    faction,
  };
}

function buildChapter(section, number, title) {
  const context = chapterContext(number, title);
  const { howHeading, completeHeading, howTokens, remaining } = extractHowAndComplete(section.tokens);
  const page = createPage({ className: 'chapter-page', label: context.label, runningLeft: context.runningLeft, runningRight: title, anchor: section.heading.title });
  const flow = flowOf(page);
  const titleRow = document.createElement('div');
  titleRow.className = 'chapter-title-row';
  titleRow.innerHTML = `<div class="chapter-number">${number}</div><h2${sourceAttr(section.heading)}>${escapeHtml(title)}</h2>`;
  flow.append(titleRow);
  if (howHeading) {
    const box = document.createElement('div');
    box.className = 'rule-box';
    box.innerHTML = `<span class="label"${sourceAttr(howHeading)}>How it works</span><div class="body-copy"></div>`;
    for (const token of howTokens) box.querySelector('.body-copy').append(makeTokenElement(token));
    flow.append(box);
  }
  if (completeHeading) {
    const label = document.createElement('div');
    label.className = 'complete-rules-label';
    label.dataset.sourceId = completeHeading.id;
    label.textContent = 'Complete rules';
    flow.append(label);
  }
  paginateTokens(remaining, context, page);
}

function firstTable(tokens) {
  return tokens.findIndex(token => token.kind === 'table');
}

function leaderSegments(tokens, leaders) {
  const indices = leaders.map(leader => tokens.findIndex(token => token.kind === 'heading' && token.level === 2 && token.title === leader));
  return indices.map((start, index) => {
    if (start < 0) return null;
    const next = indices[index + 1] >= 0 ? indices[index + 1] : tokens.length;
    return { leader: leaders[index], start, end: next, tokens: tokens.slice(start, next) };
  }).filter(Boolean);
}

function cleanPagebreakEdges(values) {
  const result = [...values];
  while (result[0]?.kind === 'pagebreak') { consumed.add(result.shift().id); }
  while (result.at(-1)?.kind === 'pagebreak') { consumed.add(result.pop().id); }
  return result;
}

function buildFactionOpener(section, number, faction, howHeading, howTokens, completeHeading, tableToken) {
  ensureRecto(`${faction} begins on a recto`);
  currentFaction = faction;
  const page = createPage({ className: 'faction-opener', label: `CHAPTER ${number}`, runningLeft: 'Part III · Factions', runningRight: faction, faction, anchor: section.heading.title });
  const flow = flowOf(page);
  const rule = document.createElement('div'); rule.className = 'faction-rule'; flow.append(rule);
  const name = document.createElement('div'); name.className = 'faction-name'; name.dataset.sourceId = section.heading.id; name.textContent = faction; flow.append(name);
  const claim = document.createElement('h2'); claim.className = 'faction-claim'; claim.textContent = metadata.factions[faction].claim; flow.append(claim);
  const grid = document.createElement('div'); grid.className = 'faction-summary-grid';
  const left = document.createElement('div');
  const box = document.createElement('div'); box.className = 'rule-box';
  box.innerHTML = `<span class="label"${sourceAttr(howHeading)}>How it works</span><div class="body-copy faction-overview"></div>`;
  howTokens.forEach(token => box.querySelector('.body-copy').append(makeTokenElement(token)));
  left.append(box);
  const stats = document.createElement('dl'); stats.className = 'faction-stats';
  if (tableToken) {
    tableToken.rows.forEach(row => {
      const wrapper = document.createElement('div');
      wrapper.dataset.sourceId = tableToken.id;
      wrapper.innerHTML = `<dt>${row[0] || ''}</dt><dd>${row.slice(1).join(' · ')}</dd>`;
      stats.append(wrapper);
    });
  }
  grid.append(left, stats); flow.append(grid);
  if (completeHeading) {
    const label = document.createElement('div'); label.className = 'complete-rules-label'; label.dataset.sourceId = completeHeading.id; label.textContent = 'Complete rules continue on the following pages'; flow.append(label);
  }
  return page;
}

function parseArchetypeAndMotto(token) {
  const host = document.createElement('div');
  host.innerHTML = token?.html || '';
  const text = host.textContent || '';
  const archetype = text.match(/Archetype:\s*(.*?)(?:Motto:|$)/)?.[1]?.trim() || '';
  const motto = text.match(/Motto:\s*(.*)$/)?.[1]?.trim() || '';
  return { archetype, motto };
}

function quoteTitleAndBody(token) {
  const host = document.createElement('div');
  host.innerHTML = token.paragraphs.join('<br />');
  const strong = host.querySelector('strong');
  const title = strong?.textContent?.replace(/:$/, '') || 'Leader ability';
  if (strong) strong.remove();
  return { title, body: host.innerHTML.replace(/^\s*[:—-]?\s*/, '') };
}

function buildLeaderPage(faction, segment) {
  const values = cleanPagebreakEdges(segment.tokens);
  const heading = values.shift();
  const imageIndex = values.findIndex(token => token.kind === 'image');
  const image = imageIndex >= 0 ? values.splice(imageIndex, 1)[0] : null;
  const identityIndex = values.findIndex(token => token.kind === 'paragraph' && /Archetype:/.test(token.plain));
  const identity = identityIndex >= 0 ? values.splice(identityIndex, 1)[0] : null;
  const abilityHeadingIndex = values.findIndex(token => token.kind === 'heading' && token.level === 3 && token.title === 'Orders');
  const abilityHeading = abilityHeadingIndex >= 0 ? values.splice(abilityHeadingIndex, 1)[0] : null;
  const quotes = values.filter(token => token.kind === 'quote');
  const notes = values.filter(token => !['quote', 'divider', 'pagebreak'].includes(token.kind));
  values.filter(token => ['divider', 'pagebreak'].includes(token.kind)).forEach(token => consumed.add(token.id));

  const page = createPage({ className: 'leader-page', label: segment.leader.toUpperCase(), runningLeft: faction, runningRight: 'Leader', faction, anchor: segment.leader });
  const flow = flowOf(page);
  const { archetype, motto } = parseArchetypeAndMotto(identity);
  flow.innerHTML = `<header class="leader-header"><p class="eyebrow">${escapeHtml(archetype)}</p><div class="leader-name"${sourceAttr(heading)}>${escapeHtml(segment.leader)}</div><p class="leader-motto">${escapeHtml(motto)}</p></header><div class="leader-grid"><div class="leader-portrait"></div><div class="leader-copy"><p>${escapeHtml(archetype)}</p><div class="callout orders-callout leader-ability"><span class="label">Leader identity</span><h3>${abilityHeading ? 'Orders' : 'Ability'}</h3><div class="ability-copy"></div></div></div></div><div class="order-list"></div><div class="leader-notes"></div>`;
  if (identity) consumed.add(identity.id);
  if (abilityHeading) page.querySelector('.leader-ability h3').dataset.sourceId = abilityHeading.id;
  if (image) {
    const img = document.createElement('img'); img.src = image.src; img.alt = image.alt; img.dataset.sourceId = image.id;
    page.querySelector('.leader-portrait').append(img);
  }
  const abilityCopy = page.querySelector('.ability-copy');
  const orderList = page.querySelector('.order-list');
  if (quotes.length === 1 && !abilityHeading) {
    const parsed = quoteTitleAndBody(quotes[0]);
    page.querySelector('.leader-ability h3').textContent = parsed.title;
    abilityCopy.dataset.sourceId = quotes[0].id;
    abilityCopy.innerHTML = parsed.body;
    orderList.remove();
  } else {
    abilityCopy.remove();
    quotes.forEach(token => {
      const parsed = quoteTitleAndBody(token);
      const article = document.createElement('article'); article.className = 'order'; article.dataset.sourceId = token.id;
      article.innerHTML = `<h4>${escapeHtml(parsed.title)}</h4><p>${parsed.body}</p>`;
      orderList.append(article);
    });
  }
  const notesHost = page.querySelector('.leader-notes');
  notes.forEach(token => notesHost.append(makeTokenElement(token)));
  if (page.scrollHeight > page.clientHeight + 1) page.classList.add('dense-leader');
}

function buildFaction(section, number, faction) {
  const { howHeading, completeHeading, howTokens, remaining } = extractHowAndComplete(section.tokens);
  const tableIndex = firstTable(remaining);
  const tableToken = tableIndex >= 0 ? remaining[tableIndex] : null;
  buildFactionOpener(section, number, faction, howHeading, howTokens, completeHeading, tableToken);

  const body = remaining.filter((_, index) => index !== tableIndex);
  const leaders = metadata.factions[faction].leaders;
  const segments = leaderSegments(body, leaders);
  const firstLeaderIndex = segments[0]?.start ?? body.length;
  const secondLeaderEnd = segments.at(-1)?.end ?? firstLeaderIndex;
  const before = cleanPagebreakEdges(body.slice(0, firstLeaderIndex));
  const after = cleanPagebreakEdges(body.slice(secondLeaderEnd));
  const context = chapterContext(number, faction, faction);
  if (before.length) paginateTokens(before, context);
  segments.forEach(segment => buildLeaderPage(faction, segment));
  if (after.length) paginateTokens(after, context);
}

function buildPartBody(section) {
  const body = cleanPagebreakEdges(section.tokens.filter(token => token.kind !== 'divider'));
  if (!body.length) return;
  const meta = metadata.parts[section.heading.title];
  const context = { title: meta.title, label: meta.label, runningLeft: meta.label, runningRight: meta.title, faction: null };
  paginateTokens(body, context);
}

function buildQuickReference(turnSection, battleSection) {
  const page = createPage({ className: 'quick-reference-page', label: 'QUICK REFERENCE', runningLeft: 'Part IV · Reference', runningRight: 'At the Table', anchor: turnSection.heading.title });
  registerAnchor(battleSection.heading.title, page);
  const flow = flowOf(page);
  flow.innerHTML = '<p class="flavor-overline">Keep play moving</p><h2 class="page-title">Quick Reference</h2><div class="reference-columns"><section class="turn-reference"><h3></h3></section><section class="battle-reference"><h3></h3></section></div><div class="destination-grid"><div><strong>Gambit</strong><span>Graveyard</span></div><div><strong>Tactic</strong><span>Discard Pile</span></div><div><strong>Reserve</strong><span>Discard Pile</span></div></div>';
  const renderList = (section, hostSelector) => {
    const host = flow.querySelector(hostSelector);
    const heading = host.querySelector('h3'); heading.dataset.sourceId = section.heading.id; heading.textContent = section.heading.title.replace('Quick ', '');
    const list = section.tokens.find(token => token.kind === 'list');
    if (!list) return;
    list.items.forEach((item, index) => {
      const wrapper = document.createElement('div'); wrapper.className = 'reference-step'; wrapper.dataset.sourceId = list.id; wrapper.dataset.fragment = String(index + 1);
      wrapper.innerHTML = `<span class="num">${index + 1}</span><div><p>${item}</p></div>`;
      host.append(wrapper);
    });
    section.tokens.filter(token => token !== list).forEach(token => consumed.add(token.id));
  };
  renderList(turnSection, '.turn-reference');
  renderList(battleSection, '.battle-reference');
}

function buildGlossary(section) {
  const page = createPage({ className: 'glossary-page', label: 'GLOSSARY', runningLeft: 'Part IV · Reference', runningRight: 'Glossary', anchor: section.heading.title });
  const flow = flowOf(page);
  flow.innerHTML = `<p class="eyebrow">Game terms</p><h2 class="page-title"${sourceAttr(section.heading)}>Glossary</h2><div class="glossary-grid"></div>`;
  const grid = flow.querySelector('.glossary-grid');
  for (const token of section.tokens) {
    if (token.kind !== 'paragraph') { consumed.add(token.id); continue; }
    const host = document.createElement('div'); host.innerHTML = token.html;
    const strong = host.querySelector('strong');
    const term = strong?.textContent?.replace(/:$/, '') || '';
    if (strong) strong.remove();
    const entry = document.createElement('div'); entry.className = 'glossary-entry'; entry.dataset.sourceId = token.id;
    entry.innerHTML = `<strong>${escapeHtml(term)}</strong>${host.innerHTML.replace(/^\s*:\s*/, '')}`;
    grid.append(entry);
  }
}

function deferCopyright(section) {
  return () => {
    while ((pages.length + 2) % 4 !== 0) intentionalBlank('Booklet pagination');
    const page = createPage({ className: 'colophon', label: 'PUBLICATION NOTES', runningLeft: 'Gauntlet v0.6.1', runningRight: 'Publication Notes', anchor: section.heading.title });
    const flow = flowOf(page);
    flow.outerHTML = `<div class="colophon-block"><p class="flavor-overline">For playtest tables and careful readers</p><h2${sourceAttr(section.heading)}>Copyright and Playtest Use</h2><div class="colophon-source"></div></div><div class="colophon-meta"><strong>Gauntlet v0.6.1 · First Playtest Revision</strong><br />gauntlet.run · github.com/tymonius/Gauntlet</div>`;
    const source = page.querySelector('.colophon-source');
    section.tokens.forEach(token => source.append(makeTokenElement(token)));

    const publisherMark = source.querySelector('img[alt="TDS Games publisher mark"]');
    const publisherParagraphs = [...source.children].filter(node => node.tagName === 'P').slice(0, 2);
    if (publisherMark && publisherParagraphs.length === 2) {
      const lockup = document.createElement('div');
      lockup.className = 'publication-lockup';
      const copy = document.createElement('div');
      copy.className = 'publication-lockup-copy';
      copy.append(...publisherParagraphs);
      source.insertBefore(lockup, publisherMark);
      lockup.append(publisherMark, copy);
    }

    appendApprovedTemplate('#approved-back-cover', 'Back Cover');
  };
}

function updatePageFurniture() {
  pages.forEach((page, index) => {
    const number = index + 1;
    page.dataset.page = String(number);
    page.classList.toggle('left', number % 2 === 0);
    page.classList.toggle('right', number % 2 === 1);
    const folio = page.querySelector('.folio');
    if (folio) {
      const label = folio.querySelector('.folio-label')?.textContent || 'GAUNTLET V0.6.1';
      folio.innerHTML = number % 2 === 0
        ? `<span class="folio-number">${number}</span><span class="folio-label">${escapeHtml(label)}</span>`
        : `<span class="folio-label">${escapeHtml(label)}</span><span class="folio-number">${number}</span>`;
    }
  });
}

function fillPageReferences() {
  document.querySelectorAll('[data-toc-target]').forEach(node => {
    const page = anchors.get(node.dataset.tocTarget);
    node.textContent = page?.dataset.page || '—';
  });
}

function buildImposition() {
  bookletRoot.replaceChildren();
  const total = pages.length;
  for (let sheet = 0; sheet < total / 4; sheet += 1) {
    const outside = [total - sheet * 2, 1 + sheet * 2];
    const inside = [2 + sheet * 2, total - 1 - sheet * 2];
    for (const [sideIndex, order] of [outside, inside].entries()) {
      const spread = document.createElement('section');
      spread.className = 'spread-sheet';
      spread.dataset.sheet = String(sheet + 1);
      spread.dataset.side = sideIndex === 0 ? 'outside' : 'inside';
      order.forEach(pageNumber => spread.append(pages[pageNumber - 1].cloneNode(true)));
      bookletRoot.append(spread);
    }
  }
}

function buildDocument() {
  const titleSection = sectionByTitle.get('GAUNTLET');
  markSectionConsumed(titleSection);
  appendApprovedTemplate('#approved-cover', 'Cover');
  buildContentsPage();
  buildFrontMatter();

  let deferredCopyright = null;
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    if (!section.heading) { section.tokens.forEach(token => consumed.add(token.id)); continue; }
    const title = section.heading.title;
    if (['GAUNTLET', 'Welcome to Gauntlet', 'How to Use This Rulebook', 'Game at a Glance', 'How to Win', 'Golden Rules'].includes(title)) continue;
    if (metadata.parts[title]) {
      buildPartOpener(section);
      buildPartBody(section);
      continue;
    }
    if (title === 'Quick Turn Reference') {
      const battle = sectionByTitle.get('Quick Battle Reference');
      buildQuickReference(section, battle);
      index = sections.indexOf(battle);
      continue;
    }
    if (title === 'Glossary') { buildGlossary(section); continue; }
    if (title === 'Copyright and Playtest Use') { deferredCopyright = deferCopyright(section); continue; }
    if (title === 'Quick Battle Reference') continue;

    const chapter = metadata.chapters.find(item => item.heading === title);
    if (!chapter) {
      const context = chapterContext(null, title);
      const page = createPage({ className: 'chapter-page', label: 'REFERENCE', runningLeft: context.runningLeft, runningRight: title, anchor: title });
      const heading = document.createElement('h2'); heading.className = 'page-title'; heading.dataset.sourceId = section.heading.id; heading.textContent = title; flowOf(page).append(heading);
      paginateTokens(section.tokens, context, page);
      continue;
    }
    const cleanTitle = chapter.title;
    if (metadata.factions[cleanTitle]) buildFaction(section, chapter.number, cleanTitle);
    else buildChapter(section, chapter.number, cleanTitle);
  }

  if (!deferredCopyright) throw new Error('Copyright section was not found.');
  deferredCopyright();
  updatePageFurniture();
  fillPageReferences();
  buildImposition();

  const rendered = new Set([...readerRoot.querySelectorAll('[data-source-id]')].map(node => node.dataset.sourceId));
  const structural = new Set(tokens.filter(token => ['divider', 'pagebreak'].includes(token.kind)).map(token => token.id));
  const missing = tokens.filter(token => !rendered.has(token.id) && !consumed.has(token.id) && !structural.has(token.id)).map(token => ({ id: token.id, kind: token.kind, plain: token.plain || token.title || '' }));
  const intentionalBlanks = pages.filter(page => page.classList.contains('intentional-blank')).length;
  window.__rulebookReport = {
    pageCount: pages.length,
    sheetSides: bookletRoot.querySelectorAll('.spread-sheet').length,
    sourceTokenCount: tokens.length,
    renderedSourceIds: rendered.size,
    consumedSourceIds: consumed.size,
    missing,
    intentionalBlanks,
    anchors: Object.fromEntries([...anchors].map(([key, page]) => [key, Number(page.dataset.page)])),
  };
}

await document.fonts?.ready;
buildDocument();
await Promise.all([...document.images].map(image => image.complete && image.naturalWidth > 0
  ? image.decode?.().catch(() => undefined)
  : new Promise((resolve, reject) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', () => reject(new Error(`Image failed: ${image.currentSrc || image.src}`)), { once: true });
    })));

if (mode === 'booklet') {
  const style = document.createElement('style');
  style.textContent = '@page{size:11in 8.5in;margin:0}';
  document.head.append(style);
}
document.documentElement.dataset.paginationReady = 'true';
