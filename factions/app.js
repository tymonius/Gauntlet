import { renderMarkdown } from '../rulebook/markdown.js';

const AUTHORITY_SET_ID = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';

const FACTIONS = {
  military: {
    label: 'Military',
    sourceTitle: 'Military',
    authorityDir: 'military',
    file: 'Gauntlet_v0.6.3_Military_Faction_Guide.md',
    sha256: '23a4260f793ebf5c09d6a62fc2d36d51290ca9ca28c03e3bfe349170eae1c91c',
  },
  diplomats: {
    label: 'Diplomats',
    sourceTitle: 'Diplomat',
    authorityDir: 'diplomat',
    file: 'Gauntlet_v0.6.3_Diplomat_Faction_Guide.md',
    sha256: '99788e5aead16a06e8fc026929e3b362930ebba91a55d40881890a85ae8d4412',
  },
  financiers: {
    label: 'Financiers',
    sourceTitle: 'Financier',
    authorityDir: 'financier',
    file: 'Gauntlet_v0.6.3_Financier_Faction_Guide.md',
    sha256: 'f5d07550bdc76db7c2ba6c5243e5539dadef1c27986250d6b89f4cdec6700f6b',
  },
  intelligence: {
    label: 'Intelligence',
    sourceTitle: 'Intelligence',
    authorityDir: 'intelligence',
    file: 'Gauntlet_v0.6.3_Intelligence_Faction_Guide.md',
    sha256: '103d5bd4a6758ef3127fa71f19694b5ba428216b1d6c28b9db74fdb8e86d2328',
  },
  mystics: {
    label: 'Mystics',
    sourceTitle: 'Mystics',
    authorityDir: 'mystics',
    file: 'Gauntlet_v0.6.3_Mystics_Faction_Guide.md',
    sha256: 'b47623ba7a7537e0df5326ccd69967dee4bb7016b2a3b5c2a8d05d1c899e5f1a',
  },
  inquisition: {
    label: 'Inquisition',
    sourceTitle: 'Inquisition',
    authorityDir: 'inquisition',
    file: 'Gauntlet_v0.6.3_Inquisition_Faction_Guide.md',
    sha256: 'a489e08ec1daf094e521bc45acc43e119c137fe566cfd8bef2f4d2455e38e3bd',
  },
};

const factionKey = document.body.dataset.faction;
const faction = FACTIONS[factionKey];
const content = document.querySelector('[data-faction-content]');
const toc = document.querySelector('[data-faction-toc]');
const status = document.querySelector('[data-faction-status]');
const sourceLinks = document.querySelectorAll('[data-faction-source]');
const searchForm = document.querySelector('[data-faction-search]');
const searchInput = searchForm?.querySelector('input[type="search"]');
const searchStatus = document.querySelector('[data-search-status]');
const tocToggle = document.querySelector('[data-toc-toggle]');
const sidebar = document.querySelector('[data-faction-sidebar]');

if (!faction) {
  throw new Error(`Unknown clean faction-page route: ${factionKey || 'missing'}`);
}

const SOURCE_URL = `/artifacts/reconstruction/clean-v0.6.3/faction-guides/${faction.authorityDir}/${faction.file}`;
const PUBLISHED_SOURCE_URL = `../releases/v0.6.3-reconstructed/faction-guides/${factionKey}/${faction.file}`;
sourceLinks.forEach((link) => { link.href = PUBLISHED_SOURCE_URL; });

function buildToc(headings) {
  if (!toc) return;

  const visible = headings.filter(({ level, label }) => {
    if (level > 2) return false;
    if (/^Gauntlet v0\.6\.3 .* Faction Guide$/.test(label)) return false;
    return true;
  });

  const fragment = document.createDocumentFragment();
  visible.forEach(({ id, level, label }) => {
    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = label;
    link.dataset.tocId = id;
    link.className = level === 1 ? 'toc-primary' : 'toc-secondary';
    if (/^\d+\.\s+/.test(label)) link.classList.add('toc-chapter');
    fragment.append(link);
  });
  toc.replaceChildren(fragment);
}

function decoratePublication() {
  content.querySelectorAll('h1, h2, h3, h4').forEach((heading) => {
    const label = heading.textContent.trim();
    if (/^Gauntlet v0\.6\.3 .* Faction Guide$/.test(label)) heading.classList.add('source-title');
    if (/^\d+\.\s+/.test(label)) heading.classList.add('chapter-heading');
    if (label === 'How it works') heading.classList.add('how-it-works-heading');
    if (label === 'Complete rules') heading.classList.add('complete-rules-heading');
  });

  content.querySelectorAll('blockquote').forEach((quote) => {
    const text = quote.textContent.trim();
    if (text.startsWith('Clean v0.6.3') || text.includes('Card-text boundary.')) {
      quote.classList.add('authority-note');
    }
  });
}

function decorateHeadings() {
  content.querySelectorAll('h1[id], h2[id], h3[id]').forEach((heading) => {
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
  if (!('IntersectionObserver' in window) || !toc) return;
  const links = new Map([...toc.querySelectorAll('[data-toc-id]')].map((link) => [link.dataset.tocId, link]));
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
  content.querySelectorAll('mark[data-faction-match]').forEach((mark) => {
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
      mark.dataset.factionMatch = '';
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
  document.querySelector('[data-print-faction]')?.addEventListener('click', () => window.print());
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

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function loadGuide() {
  initializeControls();

  try {
    const response = await fetch(SOURCE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Guide request failed with ${response.status}.`);

    const bytes = await response.arrayBuffer();
    const actualHash = await sha256(bytes);
    if (actualHash !== faction.sha256) {
      throw new Error(`Certified ${faction.label} guide hash mismatch: ${actualHash}`);
    }

    const source = new TextDecoder().decode(bytes);
    const expectedTitle = `# Gauntlet v0.6.3 ${faction.sourceTitle} Faction Guide`;
    if (!source.startsWith(expectedTitle)) {
      throw new Error(`Certified ${faction.label} guide title mismatch.`);
    }

    const publishedSource = source.replace(/^> \*\*Clean v0\.6\.3[^\n]*\n\n/m, '');
    const rendered = renderMarkdown(publishedSource);
    content.innerHTML = rendered.html;
    content.removeAttribute('aria-busy');
    buildToc(rendered.headings);
    decoratePublication();
    decorateHeadings();
    observeSections();
    status.textContent = `Canonical v0.6.3 ${faction.label} guide loaded · SHA-256 ${actualHash.slice(0, 12)}… · authority ${AUTHORITY_SET_ID.slice(0, 12)}…`;
  } catch (error) {
    console.error(error);
    content.removeAttribute('aria-busy');
    content.innerHTML = `<div class="error-card"><strong>Certified guide unavailable.</strong><p>${String(error.message || error)}</p><p><a href="${SOURCE_URL}">Open the source Markdown directly.</a></p></div>`;
    status.textContent = `Unable to verify the canonical v0.6.3 ${faction.label} guide.`;
  }
}

loadGuide();
