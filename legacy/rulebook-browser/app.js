import { renderMarkdown } from './markdown.js';
import { loadCurrentGame } from '../game-data/current-game.mjs';

const RELEASE_MANIFEST_URL = '../releases/v0.7.2/Gauntlet_v0.7.2_Manifest.json';
const PUBLISHED_VERSION = 'v0.7.2';
const FALLBACK_PUBLISHED_SOURCE_URL = '../releases/v0.7.2/Gauntlet_v0.7.2_Player_Guide.md';
const FALLBACK_PDF_URL = '../releases/v0.7.2/Gauntlet_v0.7.2_Player_Guide_Booklet.pdf';
const RELEASED_MODE = 'released';
const CANDIDATE_MODE = 'candidate';
const DEFAULT_CANDIDATE_DOCUMENT = 'player-guide';
const CANDIDATE_BOOKLET_BASE_URL = './booklets/v0.7.2/';

const CANDIDATE_DOCUMENTS = new Map([
  ['player-guide', {
    label: "Player's Guide",
    title: "Player's Guide",
    sourceUrl: './sources/player-guide.md',
    bookletFilename: 'Gauntlet_v0.7.2_Player_Guide_Booklet.pdf',
    marker: 'RULES-SURFACE:player-guide',
    lede: "Learn Gauntlet's shared game before adding the operating rules for your chosen faction.",
    tocLevels: new Set([2]),
  }],
  ['military', {
    label: 'Military Guide',
    title: 'Military Guide',
    sourceUrl: './sources/factions/military.md',
    bookletFilename: 'Gauntlet_v0.7.2_Military_Guide_Booklet.pdf',
    marker: 'RULES-FACTION:military',
    lede: 'The operating guide for Command, Orders, Military Leaders, and first-game priorities.',
    tocLevels: new Set([2]),
  }],
  ['diplomats', {
    label: 'Diplomats Guide',
    title: 'Diplomats Guide',
    sourceUrl: './sources/factions/diplomats.md',
    bookletFilename: 'Gauntlet_v0.7.2_Diplomats_Guide_Booklet.pdf',
    marker: 'RULES-FACTION:diplomats',
    lede: 'The operating guide for Influence, Proposals, Diplomat Leaders, and diplomatic victory play.',
    tocLevels: new Set([2]),
  }],
  ['financiers', {
    label: 'Financiers Guide',
    title: 'Financiers Guide',
    sourceUrl: './sources/factions/financiers.md',
    bookletFilename: 'Gauntlet_v0.7.2_Financiers_Guide_Booklet.pdf',
    marker: 'RULES-FACTION:financiers',
    lede: 'The operating guide for Capital, Deeds, Financier Leaders, and economic control of the Gauntlet.',
    tocLevels: new Set([2]),
  }],
  ['intelligence', {
    label: 'Intelligence Guide',
    title: 'Intelligence Guide',
    sourceUrl: './sources/factions/intelligence.md',
    bookletFilename: 'Gauntlet_v0.7.2_Intelligence_Guide_Booklet.pdf',
    marker: 'RULES-FACTION:intelligence',
    lede: 'The operating guide for Intel, Operations, Intelligence Leaders, and covert progress.',
    tocLevels: new Set([2]),
  }],
  ['mystics', {
    label: 'Mystics Guide',
    title: 'Mystics Guide',
    sourceUrl: './sources/factions/mystics.md',
    bookletFilename: 'Gauntlet_v0.7.2_Mystics_Guide_Booklet.pdf',
    marker: 'RULES-FACTION:mystics',
    lede: 'The operating guide for Rites, Rituals, Mystic Leaders, and Arcane play.',
    tocLevels: new Set([2]),
  }],
  ['inquisition', {
    label: 'Inquisition Guide',
    title: 'Inquisition Guide',
    sourceUrl: './sources/factions/inquisition.md',
    bookletFilename: 'Gauntlet_v0.7.2_Inquisition_Guide_Booklet.pdf',
    marker: 'RULES-FACTION:inquisition',
    lede: 'The operating guide for Conviction, Purges, Inquisition Leaders, and doctrinal control.',
    tocLevels: new Set([2]),
  }],
  ['complete-rules', {
    label: 'Complete Rules',
    title: 'Complete Rules',
    sourceUrl: './sources/complete-rules.md',
    bookletFilename: 'Gauntlet_v0.7.2_Complete_Rules_Booklet.pdf',
    marker: 'RULES-SURFACE:comprehensive-rules',
    lede: 'The complete player-facing technical rules reference for exact procedures, timing, interactions, and edge cases.',
    tocLevels: new Set([2, 3]),
  }],
]);

const content = document.querySelector('[data-rulebook-content]');
const toc = document.querySelector('[data-rulebook-toc]');
const status = document.querySelector('[data-rulebook-status]');
const searchForm = document.querySelector('[data-rulebook-search]');
const searchInput = searchForm?.querySelector('input[type="search"]');
const searchStatus = document.querySelector('[data-search-status]');
const tocToggle = document.querySelector('[data-toc-toggle]');
const sidebar = document.querySelector('[data-rulebook-sidebar]');
const eyebrow = document.querySelector('[data-rulebook-eyebrow]');
const heroTitle = document.querySelector('[data-rulebook-title]');
const heroLede = document.querySelector('[data-rulebook-lede]');
const candidateNote = document.querySelector('[data-candidate-rules-note]');
const rulesetSwitch = document.querySelector('[data-ruleset-switch]');
const candidateVersionLabel = document.querySelector('[data-candidate-version]');
const candidateDocumentSwitch = document.querySelector('[data-candidate-document-switch]');
const candidateDocumentSelect = document.querySelector('[data-candidate-document]');
const footerVersion = document.querySelector('[data-rulebook-footer-version]');
const printHeading = document.querySelector('[data-rulebook-print-heading]');
const printNote = document.querySelector('[data-rulebook-print-note]');
const rulesAssistantButton = document.querySelector('[data-open-rules-assistant]');
const rulesetButtons = [...document.querySelectorAll('[data-ruleset]')];
const rulebookBookletLinks = [...document.querySelectorAll('[data-rulebook-booklet]')];

const publishedSourcePromises = new Map();
let releaseManifestPromise = null;
const candidateSourcePromises = new Map();
let publishedSourceUrl = FALLBACK_PUBLISHED_SOURCE_URL;
let pdfUrl = FALLBACK_PDF_URL;
let activeMode = RELEASED_MODE;
let activeCandidateDocument = DEFAULT_CANDIDATE_DOCUMENT;
let sectionObserver = null;

const FACTIONS = new Map([
  ['Military', { color: '#8f1f25', symbol: "url('/images/faction-symbols/military.svg')" }],
  ['Diplomats', { color: '#244b8f', symbol: "url('/images/faction-symbols/diplomats.svg')" }],
  ['Financiers', { color: '#276744', symbol: "url('/images/faction-symbols/financiers.svg')" }],
  ['Intelligence', { color: '#34373b', symbol: "url('/images/faction-symbols/intelligence.svg')" }],
  ['Mystics', { color: '#603d78', symbol: "url('/images/faction-symbols/mystics.svg')" }],
  ['Inquisition', { color: '#a67a27', symbol: "url('/images/faction-symbols/inquisition.svg')" }],
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

function buildToc(headings, mode = activeMode, documentId = activeCandidateDocument) {
  if (!toc) return;
  const candidateDocument = CANDIDATE_DOCUMENTS.get(documentId) || CANDIDATE_DOCUMENTS.get(DEFAULT_CANDIDATE_DOCUMENT);
  const visibleHeadings = headings.filter(({ id, level }) => {
    if (id === 'gauntlet' || id === 'official-rulebook') return false;
    return candidateDocument.tocLevels.has(level);
  });

  const fragment = document.createDocumentFragment();
  visibleHeadings.forEach(({ id, level, label }) => {
    const link = document.createElement('a');
    const chapterLabel = cleanChapterLabel(label);
    link.href = `#${id}`;
    link.textContent = label;
    link.dataset.tocId = id;
    link.className = level === 2 ? 'toc-primary' : 'toc-secondary';
    const faction = FACTIONS.get(chapterLabel);
    if (faction) {
      link.classList.add('toc-faction');
      link.dataset.faction = chapterLabel;
      link.style.setProperty('--toc-accent', faction.color);
      link.style.setProperty('--faction-symbol', faction.symbol);
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
          const faction = FACTIONS.get(activeFaction);
          heading.classList.add('faction-heading');
          heading.dataset.faction = activeFaction;
          heading.style.setProperty('--faction-symbol', faction.symbol);
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
  sectionObserver?.disconnect();
  sectionObserver = null;
  if (!('IntersectionObserver' in window)) return;

  const links = new Map(
    [...toc.querySelectorAll('[data-toc-id]')].map((link) => [link.dataset.tocId, link])
  );

  sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!visible) return;

    links.forEach((link) => link.removeAttribute('aria-current'));
    links.get(visible.target.id)?.setAttribute('aria-current', 'location');
  }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

  content.querySelectorAll('h1[id], h2[id], h3[id]').forEach((heading) => sectionObserver.observe(heading));
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

function modeFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get('rules') === CANDIDATE_MODE ? CANDIDATE_MODE : RELEASED_MODE;
}

function documentFromUrl() {
  const url = new URL(window.location.href);
  const requested = url.searchParams.get('doc') || DEFAULT_CANDIDATE_DOCUMENT;
  return CANDIDATE_DOCUMENTS.has(requested) ? requested : DEFAULT_CANDIDATE_DOCUMENT;
}

function writeModeToUrl(mode, replace = false, documentId = activeCandidateDocument) {
  const url = new URL(window.location.href);
  const normalizedDocument = CANDIDATE_DOCUMENTS.has(documentId) ? documentId : DEFAULT_CANDIDATE_DOCUMENT;
  if (mode === CANDIDATE_MODE) url.searchParams.set('rules', CANDIDATE_MODE);
  else url.searchParams.delete('rules');
  if (normalizedDocument === DEFAULT_CANDIDATE_DOCUMENT) url.searchParams.delete('doc');
  else url.searchParams.set('doc', normalizedDocument);
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ ruleset: mode, document: normalizedDocument }, '', url);
}

function candidateBookletUrl(documentId = activeCandidateDocument) {
  const documentConfig = CANDIDATE_DOCUMENTS.get(documentId) || CANDIDATE_DOCUMENTS.get(DEFAULT_CANDIDATE_DOCUMENT);
  return `${CANDIDATE_BOOKLET_BASE_URL}${documentConfig.bookletFilename}`;
}

function updateBookletLinks(mode, documentId = activeCandidateDocument) {
  const href = mode === CANDIDATE_MODE ? candidateBookletUrl(documentId) : pdfUrl;
  rulebookBookletLinks.forEach((link) => {
    link.hidden = false;
    link.href = href;
  });
}

function setRulesetUi(mode, currentGame = null, distinctCandidate = false, documentId = activeCandidateDocument) {
  const candidate = mode === CANDIDATE_MODE && distinctCandidate;
  const candidateLabel = currentGame?.displayVersion || currentGame?.version || 'current development';
  const documentConfig = CANDIDATE_DOCUMENTS.get(documentId) || CANDIDATE_DOCUMENTS.get(DEFAULT_CANDIDATE_DOCUMENT);
  if (rulesetSwitch) rulesetSwitch.hidden = !distinctCandidate;
  if (candidateVersionLabel) candidateVersionLabel.textContent = candidateLabel;
  if (candidateDocumentSwitch) candidateDocumentSwitch.hidden = false;
  if (candidateDocumentSelect) candidateDocumentSelect.value = documentId;
  document.body.dataset.rulesetMode = mode;
  document.body.dataset.candidateDocument = documentId;
  rulesetButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.ruleset === mode));
  });
  updateBookletLinks(candidate ? CANDIDATE_MODE : RELEASED_MODE, documentId);

  if (rulesAssistantButton) rulesAssistantButton.hidden = candidate;
  if (candidateNote) {
    candidateNote.hidden = !candidate;
    candidateNote.textContent = candidate
      ? `Candidate view: ${documentConfig.label} from ${candidateLabel}. The Chief Justice remains bound to released ${PUBLISHED_VERSION}.`
      : '';
  }

  if (candidate) {
    if (eyebrow) eyebrow.textContent = `Release candidate rules · ${candidateLabel}`;
    if (footerVersion) footerVersion.innerHTML = `<strong>Gauntlet ${candidateLabel}</strong> · ${documentConfig.label}.`;
    document.title = `${documentConfig.title} — Gauntlet ${candidateLabel}`;
  } else {
    if (eyebrow) eyebrow.textContent = `Canonical rules · ${PUBLISHED_VERSION}`;
    if (footerVersion) footerVersion.innerHTML = `<strong>Gauntlet ${PUBLISHED_VERSION}</strong> · ${documentConfig.label} · current canonical playtest edition.`;
    document.title = `Gauntlet ${PUBLISHED_VERSION} Browser Rulebook — ${documentConfig.title}`;
  }
  if (heroTitle) heroTitle.textContent = documentConfig.title;
  if (heroLede) heroLede.textContent = documentConfig.lede;
  if (printHeading) printHeading.textContent = `${documentConfig.label} booklet`;
  if (printNote) printNote.textContent = 'Print double-sided, flip on the short edge, then fold and saddle stitch.';
}

function scrollToLocationHash() {
  const rawHash = window.location.hash.replace(/^#/, '');
  if (!rawHash) return false;

  let targetId = rawHash;
  try {
    targetId = decodeURIComponent(rawHash);
  } catch {
    // Leave malformed fragments untouched; getElementById will simply fail.
  }

  const target = document.getElementById(targetId);
  if (!target) return false;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  });
  return true;
}

function initializeControls() {
  rulesAssistantButton?.addEventListener('click', () => {
    document.querySelector('.ga-rules-launcher')?.click();
  });

  rulesetButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const mode = button.dataset.ruleset === CANDIDATE_MODE ? CANDIDATE_MODE : RELEASED_MODE;
      if (mode === activeMode) return;
      writeModeToUrl(mode, false, activeCandidateDocument);
      await renderRulebook(mode);
    });
  });

  candidateDocumentSelect?.addEventListener('change', async () => {
    const requested = candidateDocumentSelect.value;
    activeCandidateDocument = CANDIDATE_DOCUMENTS.has(requested) ? requested : DEFAULT_CANDIDATE_DOCUMENT;
    writeModeToUrl(activeMode, false, activeCandidateDocument);
    await renderRulebook(activeMode);
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

  window.addEventListener('popstate', () => {
    activeCandidateDocument = documentFromUrl();
    renderRulebook(modeFromUrl());
  });

  window.addEventListener('hashchange', () => {
    scrollToLocationHash();
  });
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function releasePackagePath(manifest, path) {
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  if (normalizedPath.startsWith('releases/')) return normalizedPath;

  const packagePath = String(manifest?.current_package_path || `releases/${PUBLISHED_VERSION}/`)
    .replace(/^\/+|\/+$/g, '');
  return `${packagePath}/${normalizedPath}`;
}

function releaseAssetUrl(path) {
  return `../${String(path || '').replace(/^\/+/, '')}`;
}

async function loadReleaseManifest() {
  if (!releaseManifestPromise) {
    releaseManifestPromise = fetch(RELEASE_MANIFEST_URL, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Release manifest returned ${response.status}`);
        const manifest = await response.json();
        if (manifest?.release_version !== PUBLISHED_VERSION || manifest?.status !== 'current') {
          throw new Error(`Release manifest identity mismatch: ${manifest?.release_version || 'missing'} / ${manifest?.status || 'missing'}`);
        }
        const documents = manifest?.modular_rules?.documents;
        if (!Array.isArray(documents) || documents.length !== CANDIDATE_DOCUMENTS.size) {
          throw new Error('Release manifest is missing the complete modular rules publication.');
        }
        return manifest;
      })
      .catch((error) => {
        releaseManifestPromise = null;
        throw error;
      });
  }
  return releaseManifestPromise;
}

function publishedDocument(manifest, documentId = activeCandidateDocument) {
  const normalized = CANDIDATE_DOCUMENTS.has(documentId) ? documentId : DEFAULT_CANDIDATE_DOCUMENT;
  const document = manifest?.modular_rules?.documents?.find((entry) => entry?.id === normalized);
  const booklet = manifest?.pdf_outputs?.find((entry) => entry?.key === `${normalized}-booklet`);
  if (!document?.source?.path || !/^[a-f0-9]{64}$/i.test(document?.source?.sha256 || '')) {
    throw new Error(`Release manifest is missing a valid ${normalized} source binding.`);
  }
  if (!booklet?.path || !/^[a-f0-9]{64}$/i.test(booklet?.sha256 || '')) {
    throw new Error(`Release manifest is missing a valid ${normalized} booklet binding.`);
  }
  return { normalized, document, booklet };
}

async function loadVerifiedReleasedSource(documentId = activeCandidateDocument) {
  const normalized = CANDIDATE_DOCUMENTS.has(documentId) ? documentId : DEFAULT_CANDIDATE_DOCUMENT;
  const manifest = await loadReleaseManifest();
  const { document, booklet } = publishedDocument(manifest, normalized);
  publishedSourceUrl = releaseAssetUrl(releasePackagePath(manifest, document.source.path));
  pdfUrl = `${releaseAssetUrl(releasePackagePath(manifest, booklet.path))}?rev=${booklet.sha256.slice(0, 8)}`;
  if (activeMode === RELEASED_MODE && activeCandidateDocument === normalized) {
    updateBookletLinks(RELEASED_MODE, normalized);
  }

  if (!publishedSourcePromises.has(normalized)) {
    const sourceUrl = publishedSourceUrl;
    const promise = (async () => {
      const response = await fetch(sourceUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${normalized} source returned ${response.status}`);
      const bytes = await response.arrayBuffer();
      const actualHash = await sha256(bytes);
      if (actualHash !== document.source.sha256) {
        throw new Error(`${normalized} source hash mismatch: expected ${document.source.sha256}, received ${actualHash}`);
      }
      return new TextDecoder().decode(bytes);
    })().catch((error) => {
      publishedSourcePromises.delete(normalized);
      throw error;
    });
    publishedSourcePromises.set(normalized, promise);
  }
  return publishedSourcePromises.get(normalized);
}

async function loadCandidateDocumentSource(documentId) {
  const documentConfig = CANDIDATE_DOCUMENTS.get(documentId);
  if (!documentConfig) throw new Error(`Unknown candidate rules document: ${documentId}`);
  if (!candidateSourcePromises.has(documentId)) {
    const promise = fetch(documentConfig.sourceUrl, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`${documentConfig.label} source returned ${response.status}`);
        const markdown = await response.text();
        if (!markdown.includes(documentConfig.marker)) {
          throw new Error(`${documentConfig.label} source is missing its publication marker.`);
        }
        if (!markdown.includes('AUTHORITY:game-data/current-game.json')) {
          throw new Error(`${documentConfig.label} source is not bound to current gameplay authority.`);
        }
        return markdown;
      })
      .catch((error) => {
        candidateSourcePromises.delete(documentId);
        throw error;
      });
    candidateSourcePromises.set(documentId, promise);
  }
  return candidateSourcePromises.get(documentId);
}

async function renderRulebook(mode) {
  const requestedMode = mode === CANDIDATE_MODE ? CANDIDATE_MODE : RELEASED_MODE;
  let currentGame = null;
  try {
    currentGame = await loadCurrentGame();
  } catch (error) {
    console.warn('Current-game authority unavailable for candidate detection.', error);
  }
  const candidateVersion = currentGame?.displayVersion || currentGame?.version || '';
  const candidateBaseVersion = String(currentGame?.version || candidateVersion).replace(/-candidate$/, '');
  const distinctCandidate = Boolean(candidateBaseVersion && candidateBaseVersion !== PUBLISHED_VERSION);
  activeMode = requestedMode === CANDIDATE_MODE && distinctCandidate ? CANDIDATE_MODE : RELEASED_MODE;
  activeCandidateDocument = documentFromUrl();
  if (requestedMode !== activeMode) writeModeToUrl(activeMode, true, activeCandidateDocument);

  const documentConfig = CANDIDATE_DOCUMENTS.get(activeCandidateDocument) || CANDIDATE_DOCUMENTS.get(DEFAULT_CANDIDATE_DOCUMENT);
  content.setAttribute('aria-busy', 'true');
  clearSearchMarks();
  if (searchInput) searchInput.value = '';
  if (searchStatus) searchStatus.textContent = '';
  status.textContent = `Loading ${documentConfig.label}…`;

  try {
    const markdown = activeMode === CANDIDATE_MODE
      ? await loadCandidateDocumentSource(activeCandidateDocument)
      : await loadVerifiedReleasedSource(activeCandidateDocument);

    const rendered = renderMarkdown(markdown);
    content.innerHTML = rendered.html;
    content.removeAttribute('aria-busy');
    buildToc(rendered.headings, activeMode, activeCandidateDocument);
    decoratePublication();
    decorateHeadings();
    observeSections();
    setRulesetUi(activeMode, currentGame, distinctCandidate, activeCandidateDocument);
    document.dispatchEvent(new CustomEvent('gauntlet:rulebook-rendered', {
      detail: { mode: activeMode, document: activeCandidateDocument },
    }));
    scrollToLocationHash();

    const sectionCount = Math.max(
      0,
      rendered.headings.filter(({ level, id }) => {
        if (id === 'gauntlet' || id === 'official-rulebook') return false;
        return documentConfig.tocLevels.has(level);
      }).length
    );
    status.textContent = activeMode === CANDIDATE_MODE
      ? `Release candidate ${candidateVersion || 'current development'} · ${documentConfig.label} · ${sectionCount} sections · rules loaded`
      : `Canonical ${PUBLISHED_VERSION} · ${documentConfig.label} · ${sectionCount} sections · rules loaded`;
  } catch (error) {
    console.error(error);
    content.removeAttribute('aria-busy');
    content.innerHTML = `
      <section class="load-error" role="alert">
        <h1>The browser rulebook could not be loaded.</h1>
        <p>${activeMode === CANDIDATE_MODE
          ? 'The selected release-candidate document is temporarily unavailable.'
          : `Use the <a href="${pdfUrl}">printable booklet</a> or <a href="${publishedSourceUrl}">canonical Markdown source</a>.`}</p>
      </section>
    `;
    status.textContent = 'Rulebook unavailable';
    setRulesetUi(activeMode, currentGame, distinctCandidate, activeCandidateDocument);
  }
}

async function loadRulebook() {
  initializeControls();
  activeMode = modeFromUrl();
  activeCandidateDocument = documentFromUrl();
  await renderRulebook(activeMode);
}

loadRulebook();
