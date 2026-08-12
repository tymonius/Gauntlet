import { renderMarkdown } from './markdown.js';

const SOURCE_URL = '../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md';
const PDF_URL = '../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.pdf';
const content = document.querySelector('[data-rulebook-content]');
const toc = document.querySelector('[data-rulebook-toc]');
const status = document.querySelector('[data-rulebook-status]');
const searchForm = document.querySelector('[data-rulebook-search]');
const searchInput = searchForm?.querySelector('input[type="search"]');
const searchStatus = document.querySelector('[data-search-status]');
const tocToggle = document.querySelector('[data-toc-toggle]');
const sidebar = document.querySelector('[data-rulebook-sidebar]');

const FACTIONS = new Map([
  ['Military', '#8f1f25'],
  ['Diplomats', '#244b8f'],
  ['Financiers', '#276744'],
  ['Intelligence', '#34373b'],
  ['Mystics', '#603d78'],
  ['Inquisition', '#9a6e21'],
]);

const LEADERS = new Set([
  'General',
  'Commandant',
  'Ambassador',
  'Senator',
  'Banker',
  'Executive',
  'Ranger',
  'Spymaster',
  'Alchemist',
  'Spirit Walker',
  'Grand Inquisitor',
  'Witch Hunter',
]);

function cleanChapterLabel(label) {
  return label.replace(/^\d+\.\s*/, '').trim();
}

function buildToc(headings) {
  if (!toc) return;

  const visibleHeadings = headings.filter(({ id, level }) => {
    if (id === 'gauntlet' || id === 'official-rulebook') return false;
    return level <= 2;
  });

  const fragment = document.createDocumentFragment();
  visibleHeadings.forEach(({ id, level, label }) => {
    const link = document.createElement('a');
    const chapterLabel = cleanChapterLabel(label);
    link.href = `#${id}`;
    link.textContent = label;
    link.dataset.tocId = id;
    link.className = level === 1 ? 'toc-primary' : 'toc-secondary';
    if (/^Part\s+[IVX]+\b/.test(label)) link.classList.add('toc-part');
    if (/^\d+\.\s+/.test(label)) link.classList.add('toc-chapter');
    if (FACTIONS.has(chapterLabel)) {
      link.classList.add('toc-faction');
      link.style.setProperty('--toc-accent', FACTIONS.get(chapterLabel));
    }
    fragment.append(link);
  });
  toc.replaceChildren(fragment);
}

function decoratePublication() {
  let activeFaction = null;

  content.querySelectorAll('h1, h2, h3, h4').forEach((heading) => {
    const label = heading.textContent.trim();

    if (heading.tagName === 'H1') {
      const partMatch = label.match(/^Part\s+([IVX]+)\s+[—-]\s+(.+)$/);
      const chapterMatch = label.match(/^(\d+)\.\s+(.+)$/);

      if (partMatch) {
        activeFaction = null;
        heading.classList.add('part-heading');
        const partLabel = document.createElement('span');
        partLabel.className = 'part-label';
        partLabel.textContent = `Part ${partMatch[1]}`;
        const partTitle = document.createElement('span');
        partTitle.className = 'part-title';
        partTitle.textContent = partMatch[2];
        heading.replaceChildren(partLabel, partTitle);
      } else if (chapterMatch) {
        const chapterTitle = chapterMatch[2].trim();
        activeFaction = FACTIONS.has(chapterTitle) ? chapterTitle : null;
        heading.classList.add('chapter-heading');
        heading.dataset.chapterTitle = chapterTitle;
        if (activeFaction) {
          heading.classList.add('faction-heading');
          heading.dataset.faction = activeFaction;
        }

        const number = document.createElement('span');
        number.className = 'chapter-number';
        number.textContent = chapterMatch[1];
        const title = document.createElement('span');
        title.className = 'chapter-title';
        title.textContent = chapterTitle;
        heading.replaceChildren(number, title);
      } else {
        activeFaction = null;
      }
    }

    if (label === 'How it works') heading.classList.add('how-it-works-heading');
    if (label === 'Complete rules') heading.classList.add('complete-rules-heading');
    if (LEADERS.has(label)) {
      heading.classList.add('leader-heading');
      if (activeFaction) heading.dataset.faction = activeFaction;
    }
  });

  content.querySelectorAll('h2.how-it-works-heading').forEach((heading) => {
    const wrapper = document.createElement('section');
    wrapper.className = 'how-it-works-block';
    wrapper.setAttribute('aria-labelledby', heading.id);

    let next = heading.nextElementSibling;
    heading.before(wrapper);
    wrapper.append(heading);
    while (next && !['H1', 'H2'].includes(next.tagName)) {
      const following = next.nextElementSibling;
      wrapper.append(next);
      next = following;
    }
  });

  content.querySelectorAll('img').forEach((image) => {
    const alt = image.alt.toLocaleLowerCase();
    if ([...LEADERS].some((leader) => alt.includes(leader.toLocaleLowerCase()))) {
      image.classList.add('leader-portrait');
    }
  });
}

function decorateHeadings() {
  const headings = content.querySelectorAll('h1[id], h2[id], h3[id]');
  headings.forEach((heading) => {
    const label = heading.textContent.trim();
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = `#${heading.id}`;
    anchor.setAttribute('aria-label', `Link to ${label}`);
    anchor.textContent = '#';
    heading.append(anchor);
  });
}

function observeSections() {
  if (!('IntersectionObserver' in window)) return;

  const links = new Map(
    [...toc.querySelectorAll('[data-toc-id]')].map((link) => [link.dataset.tocId, link])
  );

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!visible) return;

    links.forEach((link) => link.removeAttribute('aria-current'));
    links.get(visible.target.id)?.setAttribute('aria-current', 'location');
  }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

  content.querySelectorAll('h1[id], h2[id]').forEach((heading) => observer.observe(heading));
}

function clearSearchMarks() {
  content.querySelectorAll('mark[data-rulebook-match]').forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent || ''));
  });
  content.normalize();
}

function highlightSearch(query) {
  clearSearchMarks();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    if (searchStatus) searchStatus.textContent = '';
    return;
  }

  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      if (parent.closest('script, style, .heading-anchor, mark')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  let matches = 0;
  let firstMatch = null;
  const limit = 250;

  nodes.forEach((node) => {
    if (matches >= limit) return;
    const original = node.nodeValue || '';
    const lower = original.toLocaleLowerCase();
    let cursor = 0;
    let found = lower.indexOf(normalizedQuery, cursor);
    if (found === -1) return;

    const fragment = document.createDocumentFragment();
    while (found !== -1 && matches < limit) {
      fragment.append(document.createTextNode(original.slice(cursor, found)));
      const mark = document.createElement('mark');
      mark.dataset.rulebookMatch = '';
      mark.textContent = original.slice(found, found + normalizedQuery.length);
      fragment.append(mark);
      firstMatch ||= mark;
      matches += 1;
      cursor = found + normalizedQuery.length;
      found = lower.indexOf(normalizedQuery, cursor);
    }
    fragment.append(document.createTextNode(original.slice(cursor)));
    node.replaceWith(fragment);
  });

  if (searchStatus) {
    searchStatus.textContent = matches === 0
      ? 'No matches'
      : `${matches}${matches === limit ? '+' : ''} match${matches === 1 ? '' : 'es'}`;
  }
  firstMatch?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function initializeControls() {
  document.querySelector('[data-print-rulebook]')?.addEventListener('click', () => window.print());
  document.querySelector('[data-open-rules-assistant]')?.addEventListener('click', () => {
    document.querySelector('.ga-rules-launcher')?.click();
  });

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    highlightSearch(searchInput?.value || '');
  });

  searchInput?.addEventListener('search', () => {
    if (!searchInput.value) highlightSearch('');
  });

  tocToggle?.addEventListener('click', () => {
    const expanded = tocToggle.getAttribute('aria-expanded') === 'true';
    tocToggle.setAttribute('aria-expanded', String(!expanded));
    sidebar?.classList.toggle('is-open', !expanded);
  });

  toc?.addEventListener('click', () => {
    if (window.matchMedia('(max-width: 900px)').matches) {
      tocToggle?.setAttribute('aria-expanded', 'false');
      sidebar?.classList.remove('is-open');
    }
  });
}

async function loadRulebook() {
  initializeControls();

  try {
    const response = await fetch(SOURCE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Rulebook source returned ${response.status}`);
    const markdown = await response.text();
    const rendered = renderMarkdown(markdown);

    content.innerHTML = rendered.html;
    content.removeAttribute('aria-busy');
    buildToc(rendered.headings);
    decoratePublication();
    decorateHeadings();
    observeSections();

    const sectionCount = Math.max(
      0,
      rendered.headings.filter(({ level, id }) => level === 1 && id !== 'gauntlet' && id !== 'official-rulebook').length
    );
    status.textContent = `Canonical v0.6.3 · ${sectionCount} sections · rendered from the official Markdown source`;
  } catch (error) {
    console.error(error);
    content.removeAttribute('aria-busy');
    content.innerHTML = `
      <section class="load-error" role="alert">
        <h1>The browser rulebook could not be loaded.</h1>
        <p>Use the <a href="${PDF_URL}">official PDF</a> or <a href="${SOURCE_URL}">canonical Markdown source</a>.</p>
      </section>
    `;
    status.textContent = 'Rulebook unavailable';
  }
}

loadRulebook();