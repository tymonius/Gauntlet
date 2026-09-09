import { renderMarkdown } from '../markdown.js';
import { loadCurrentGame } from '../../game-data/current-game.mjs';

const SOURCE_URL = '../player-guide/player-guide.md';
const content = document.querySelector('[data-review-content]');
const toc = document.querySelector('[data-review-toc]');
const status = document.querySelector('[data-review-status]');
const searchForm = document.querySelector('[data-review-search]');
const searchInput = searchForm?.querySelector('input[type="search"]');
const searchStatus = document.querySelector('[data-search-status]');
const tocToggle = document.querySelector('[data-toc-toggle]');
const sidebar = document.querySelector('[data-review-sidebar]');
const versionBadges = [...document.querySelectorAll('[data-current-version]')];

function cleanChapterLabel(label) {
  return label.replace(/^\d+\.\s*/, '').trim();
}

function buildToc(headings) {
  if (!toc) return;
  const fragment = document.createDocumentFragment();

  headings
    .filter(({ level, label }) => level === 2 && label !== "Gauntlet Player's Guide")
    .forEach(({ id, label }) => {
      const link = document.createElement('a');
      link.href = `#${id}`;
      link.textContent = label;
      link.dataset.tocId = id;
      link.className = 'toc-secondary toc-chapter';
      if (!/^\d+\.\s+/.test(label)) link.classList.add('toc-part');
      link.dataset.chapterTitle = cleanChapterLabel(label);
      fragment.append(link);
    });

  toc.replaceChildren(fragment);
}

function decorateHeadings() {
  content.querySelectorAll('h1[id], h2[id], h3[id]').forEach((heading) => {
    if (heading.tagName === 'H1' && heading.textContent.trim() === "Gauntlet Player's Guide") {
      heading.classList.add('review-source-title');
      return;
    }

    const label = heading.textContent.trim();
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = `#${heading.id}`;
    anchor.setAttribute('aria-label', `Link to ${label}`);
    anchor.textContent = '#';
    heading.append(anchor);
  });
}

function clearSearchMarks() {
  content.querySelectorAll('mark[data-review-match]').forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent || ''));
  });
  content.normalize();
}

function highlightSearch(query) {
  clearSearchMarks();
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) {
    if (searchStatus) searchStatus.textContent = '';
    return;
  }

  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      if (parent.closest('script, style, .heading-anchor, mark')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  let matches = 0;
  let firstMatch = null;
  const limit = 250;

  for (const node of nodes) {
    if (matches >= limit) break;
    const original = node.nodeValue || '';
    const lower = original.toLocaleLowerCase();
    let cursor = 0;
    let found = lower.indexOf(normalized, cursor);
    if (found === -1) continue;

    const fragment = document.createDocumentFragment();
    while (found !== -1 && matches < limit) {
      fragment.append(document.createTextNode(original.slice(cursor, found)));
      const mark = document.createElement('mark');
      mark.dataset.reviewMatch = '';
      mark.textContent = original.slice(found, found + normalized.length);
      fragment.append(mark);
      firstMatch ||= mark;
      matches += 1;
      cursor = found + normalized.length;
      found = lower.indexOf(normalized, cursor);
    }
    fragment.append(document.createTextNode(original.slice(cursor)));
    node.replaceWith(fragment);
  }

  if (searchStatus) {
    searchStatus.textContent = matches === 0
      ? 'No matches'
      : `${matches}${matches === limit ? '+' : ''} match${matches === 1 ? '' : 'es'}`;
  }
  firstMatch?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function scrollToHash() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return;
  let id = raw;
  try { id = decodeURIComponent(raw); } catch { /* use raw fragment */ }
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
}

async function renderGuide() {
  try {
    const [sourceResponse, currentGame] = await Promise.all([
      fetch(SOURCE_URL, { cache: 'no-store' }),
      loadCurrentGame(),
    ]);
    if (!sourceResponse.ok) throw new Error(`Player's Guide request failed: HTTP ${sourceResponse.status}.`);

    const source = await sourceResponse.text();
    const rendered = renderMarkdown(source);
    content.innerHTML = rendered.html;
    content.setAttribute('aria-busy', 'false');
    buildToc(rendered.headings);
    decorateHeadings();

    const version = currentGame.displayVersion || currentGame.version || 'current development';
    versionBadges.forEach((badge) => { badge.textContent = version; });
    if (status) status.textContent = `Draft source loaded · authority ${version} · temporary review page`;
    scrollToHash();
  } catch (error) {
    console.error(error);
    content.setAttribute('aria-busy', 'false');
    content.innerHTML = `
      <div class="loading-card error-card" role="alert">
        <div><strong>Could not load the draft Player's Guide.</strong><p>${String(error.message || error)}</p></div>
      </div>`;
    if (status) status.textContent = 'Draft source unavailable.';
  }
}

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
window.addEventListener('hashchange', scrollToHash);

renderGuide();
