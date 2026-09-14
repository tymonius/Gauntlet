import { renderMarkdown } from '/rulebook/markdown.js';
import { loadCurrentGame } from '/game-data/current-game.mjs';

const page = document.body;
const sourceUrl = page.dataset.rulesSource;
const surface = page.dataset.rulesSurface || 'rules';
const content = document.querySelector('[data-rules-content]');
const toc = document.querySelector('[data-rules-toc]');
const status = document.querySelector('[data-rules-status]');
const searchForm = document.querySelector('[data-rules-search]');
const searchInput = searchForm?.querySelector('input[type="search"]');
const searchStatus = document.querySelector('[data-search-status]');
const tocToggle = document.querySelector('[data-toc-toggle]');
const sidebar = document.querySelector('[data-rules-sidebar]');
const versionBadges = [...document.querySelectorAll('[data-current-version]')];

function buildToc(headings) {
  if (!toc) return;
  const fragment = document.createDocumentFragment();
  const levels = surface === 'comprehensive-rules' ? new Set([2, 3]) : new Set([2]);

  headings.filter(({ level }) => levels.has(level)).forEach(({ id, label, level }) => {
    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = label;
    link.className = level === 2 ? 'toc-primary' : 'toc-secondary';
    fragment.append(link);
  });

  toc.replaceChildren(fragment);
}

function decorateHeadings() {
  content?.querySelectorAll('h1[id], h2[id], h3[id]').forEach((heading) => {
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
  content?.querySelectorAll('mark[data-rules-match]').forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent || ''));
  });
  content?.normalize();
}

function highlightSearch(query) {
  clearSearchMarks();
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized || !content) {
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
  const limit = 300;

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
      mark.dataset.rulesMatch = '';
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
  try { id = decodeURIComponent(raw); } catch { /* keep raw fragment */ }
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
}

async function renderRules() {
  if (!sourceUrl || !content) return;
  try {
    const [sourceResponse, currentGame] = await Promise.all([
      fetch(sourceUrl, { cache: 'no-store' }),
      loadCurrentGame(),
    ]);
    if (!sourceResponse.ok) throw new Error(`Rules source request failed: HTTP ${sourceResponse.status}.`);

    const rendered = renderMarkdown(await sourceResponse.text());
    content.innerHTML = rendered.html;
    content.setAttribute('aria-busy', 'false');
    buildToc(rendered.headings);
    decorateHeadings();
    document.dispatchEvent(new CustomEvent('gauntlet:rulebook-rendered', { detail: { surface } }));

    const version = currentGame.displayVersion || currentGame.version || 'current development';
    versionBadges.forEach((badge) => { badge.textContent = version; });
    if (status) {
      status.textContent = surface === 'comprehensive-rules'
        ? `Active technical rules · direct projection of authority ${version}`
        : `Active Player's Guide · reviewed teaching surface · authority ${version}`;
    }
    scrollToHash();
  } catch (error) {
    console.error(error);
    content.setAttribute('aria-busy', 'false');
    content.innerHTML = `<div class="rules-reader-error" role="alert"><strong>Could not load this rules surface.</strong><p>${String(error.message || error)}</p></div>`;
    if (status) status.textContent = 'Rules source unavailable.';
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

renderRules();
