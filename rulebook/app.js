import { renderMarkdown } from './markdown.js';

const SOURCE_URL = '../releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.md';
const content = document.querySelector('[data-rulebook-content]');
const toc = document.querySelector('[data-rulebook-toc]');
const status = document.querySelector('[data-rulebook-status]');
const searchForm = document.querySelector('[data-rulebook-search]');
const searchInput = searchForm?.querySelector('input[type="search"]');
const searchStatus = document.querySelector('[data-search-status]');
const tocToggle = document.querySelector('[data-toc-toggle]');
const sidebar = document.querySelector('[data-rulebook-sidebar]');

function buildToc(headings) {
  if (!toc) return;

  const visibleHeadings = headings.filter(({ id, level }) => {
    if (id === 'gauntlet' || id === 'official-rulebook') return false;
    return level <= 2;
  });

  const fragment = document.createDocumentFragment();
  visibleHeadings.forEach(({ id, level, label }) => {
    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = label;
    link.dataset.tocId = id;
    link.className = level === 1 ? 'toc-primary' : 'toc-secondary';
    fragment.append(link);
  });
  toc.replaceChildren(fragment);
}

function decorateHeadings() {
  const headings = content.querySelectorAll('h1[id], h2[id], h3[id]');
  headings.forEach((heading) => {
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = `#${heading.id}`;
    anchor.setAttribute('aria-label', `Link to ${heading.textContent.trim()}`);
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
    decorateHeadings();
    observeSections();

    const sectionCount = rendered.headings.filter(({ level }) => level === 1).length - 1;
    status.textContent = `Canonical v0.6.0 · ${sectionCount} sections · rendered from the official Markdown source`;
  } catch (error) {
    console.error(error);
    content.removeAttribute('aria-busy');
    content.innerHTML = `
      <section class="load-error" role="alert">
        <h1>The browser rulebook could not be loaded.</h1>
        <p>Use the <a href="../releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.pdf">official PDF</a> or <a href="${SOURCE_URL}">canonical Markdown source</a>.</p>
      </section>
    `;
    status.textContent = 'Rulebook unavailable';
  }
}

loadRulebook();
