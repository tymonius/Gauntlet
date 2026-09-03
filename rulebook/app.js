import { renderMarkdown } from './markdown.js';
import { loadCurrentGame } from '../game-data/current-game.mjs';

const RELEASE_MANIFEST_URL = '../releases/v0.7.1/Gauntlet_v0.7.1_Manifest.json';
const CURRENT_SOURCE_URL = './player-facing/current-rulebook.md';
const PUBLISHED_VERSION = 'v0.7.1';
const FALLBACK_PUBLISHED_SOURCE_URL = '../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md';
const FALLBACK_PDF_URL = '../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook_Booklet.pdf';
const RELEASED_MODE = 'released';
const CANDIDATE_MODE = 'candidate';
const content = document.querySelector('[data-rulebook-content]');
const toc = document.querySelector('[data-rulebook-toc]');
const status = document.querySelector('[data-rulebook-status]');
const searchForm = document.querySelector('[data-rulebook-search]');
const searchInput = searchForm?.querySelector('input[type="search"]');
const searchStatus = document.querySelector('[data-search-status]');
const tocToggle = document.querySelector('[data-toc-toggle]');
const sidebar = document.querySelector('[data-rulebook-sidebar]');
const eyebrow = document.querySelector('[data-rulebook-eyebrow]');
const candidateNote = document.querySelector('[data-candidate-rules-note]');
const rulesetSwitch = document.querySelector('[data-ruleset-switch]');
const candidateVersionLabel = document.querySelector('[data-candidate-version]');
const footerVersion = document.querySelector('[data-rulebook-footer-version]');
const printHeading = document.querySelector('[data-rulebook-print-heading]');
const printNote = document.querySelector('[data-rulebook-print-note]');
const rulesAssistantButton = document.querySelector('[data-open-rules-assistant]');
const rulesetButtons = [...document.querySelectorAll('[data-ruleset]')];
const publishedBookletLinks = [...document.querySelectorAll('[data-published-booklet]')];

let sourcePromise = null;
let releaseManifestPromise = null;
let currentSourcePromise = null;
let publishedSourceUrl = FALLBACK_PUBLISHED_SOURCE_URL;
let pdfUrl = FALLBACK_PDF_URL;
let activeMode = RELEASED_MODE;
let sectionObserver = null;

const FACTIONS = new Map([
  ['Military', { color: '#8f1f25', symbol: "url('/images/faction-symbols/military.svg')" }],
  ['Diplomats', { color: '#244b8f', symbol: "url('/images/faction-symbols/diplomats.svg')" }],
  ['Financiers', { color: '#276744', symbol: "url('/images/faction-symbols/financiers.svg')" }],
  ['Intelligence', { color: '#34373b', symbol: "url('/images/faction-symbols/intelligence.svg')" }],
  ['Mystics', { color: '#603d78', symbol: "url('/images/faction-symbols/mystics.svg')" }],
  ['Inquisition', { color: '#9a6e21', symbol: "url('/images/faction-symbols/inquisition.svg')" }],
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

  content.querySelectorAll('h1[id], h2[id]').forEach((heading) => sectionObserver.observe(heading));
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

function writeModeToUrl(mode, replace = false) {
  const url = new URL(window.location.href);
  if (mode === CANDIDATE_MODE) url.searchParams.set('rules', CANDIDATE_MODE);
  else url.searchParams.delete('rules');
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ ruleset: mode }, '', url);
}

function setRulesetUi(mode, currentGame = null, distinctCandidate = false) {
  const candidate = mode === CANDIDATE_MODE && distinctCandidate;
  const candidateLabel = currentGame?.displayVersion || currentGame?.version || 'current development';
  if (rulesetSwitch) rulesetSwitch.hidden = !distinctCandidate;
  if (candidateVersionLabel) candidateVersionLabel.textContent = candidateLabel;
  document.body.dataset.rulesetMode = mode;
  rulesetButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.ruleset === mode));
  });
  publishedBookletLinks.forEach((link) => { link.hidden = candidate; });
  if (rulesAssistantButton) rulesAssistantButton.hidden = candidate;
  if (candidateNote) {
    candidateNote.hidden = !candidate;
    candidateNote.textContent = candidate
      ? 'Candidate view: current-development rules from the maintained current Rulebook source. The Rules Arbiter currently follows released v0.7.1 and is hidden in this view.'
      : '';
  }

  if (candidate) {
    if (eyebrow) eyebrow.textContent = `Release candidate rules · ${candidateLabel}`;
    if (footerVersion) footerVersion.innerHTML = `<strong>Gauntlet ${candidateLabel}</strong> · Current release-candidate rules view.`;
    if (printHeading) printHeading.textContent = 'Release candidate rules';
    if (printNote) printNote.textContent = `The ${candidateLabel} Rulebook is the current development authority. Switch to Released ${PUBLISHED_VERSION} for the published printable booklet.`;
    document.title = `Gauntlet ${candidateLabel} Browser Rulebook`;
  } else {
    if (eyebrow) eyebrow.textContent = `Canonical rules · version ${PUBLISHED_VERSION}`;
    if (footerVersion) footerVersion.innerHTML = '<strong>Gauntlet v0.7.1</strong> · Current canonical playtest edition.';
    if (printHeading) printHeading.textContent = 'Print the released rulebook';
    if (printNote) printNote.textContent = 'Print double-sided, flip on the short edge, then fold and saddle stitch.';
    document.title = 'Gauntlet v0.7.1 Browser Rulebook';
  }
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
      writeModeToUrl(mode);
      await renderRulebook(mode);
    });
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
        if (manifest?.release_version !== PUBLISHED_VERSION) {
          throw new Error(`Release manifest version mismatch: ${manifest?.release_version || 'missing'}`);
        }

        const rulebook = manifest?.binding_sources?.rulebook;
        if (!rulebook?.path || !/^[a-f0-9]{64}$/i.test(rulebook?.sha256 || '')) {
          throw new Error('Release manifest is missing a valid Rulebook binding.');
        }

        const booklet = manifest?.pdf_outputs?.find((entry) => entry?.key === 'rulebook-booklet');
        if (!booklet?.path || !/^[a-f0-9]{64}$/i.test(booklet?.sha256 || '')) {
          throw new Error('Release manifest is missing a valid Rulebook booklet binding.');
        }

        publishedSourceUrl = releaseAssetUrl(releasePackagePath(manifest, rulebook.path));
        pdfUrl = `${releaseAssetUrl(releasePackagePath(manifest, booklet.path))}?rev=${booklet.sha256.slice(0, 8)}`;
        publishedBookletLinks.forEach((link) => { link.href = pdfUrl; });

        return { manifest, rulebook, sourceUrl: publishedSourceUrl };
      })
      .catch((error) => {
        releaseManifestPromise = null;
        throw error;
      });
  }
  return releaseManifestPromise;
}

async function loadVerifiedReleasedSource() {
  if (!sourcePromise) {
    sourcePromise = (async () => {
      const { rulebook, sourceUrl } = await loadReleaseManifest();
      const response = await fetch(sourceUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Rulebook source returned ${response.status}`);

      const bytes = await response.arrayBuffer();
      const actualHash = await sha256(bytes);
      if (actualHash !== rulebook.sha256) {
        throw new Error(`Rulebook source hash mismatch: expected ${rulebook.sha256}, received ${actualHash}`);
      }

      return new TextDecoder().decode(bytes);
    })().catch((error) => {
      sourcePromise = null;
      throw error;
    });
  }
  return sourcePromise;
}

function candidateRulebookVersionMarker(currentGame) {
  const match = String(currentGame?.version || '').match(/^v(\d+\.\d+\.\d+)-candidate$/i);
  return match ? `**Version ${match[1]} Candidate**` : null;
}

async function loadCurrentRulebookSource(currentGame) {
  if (!currentSourcePromise) {
    currentSourcePromise = fetch(CURRENT_SOURCE_URL, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Current Rulebook source returned ${response.status}`);
        const markdown = await response.text();
        const expectedMarker = candidateRulebookVersionMarker(currentGame);
        if (!expectedMarker || !markdown.includes(expectedMarker)) {
          throw new Error(`Current Rulebook source does not match current-game authority (${expectedMarker || 'no candidate version'}).`);
        }
        if (!markdown.includes('# 5. Actions, Faction Features, Leader Abilities, and Assets')) throw new Error('Current Rulebook source is missing the Faction Feature chapter.');
        if (!markdown.includes('## Card anatomy')) throw new Error('Current Rulebook source is missing Card anatomy.');
        if (/\bFaction Actions?\b|\bFaction Abilit(?:y|ies)\b|\bfaction procedure\b/iu.test(markdown)) {
          throw new Error('Current Rulebook source contains retired faction terminology.');
        }
        return markdown;
      })
      .catch((error) => {
        currentSourcePromise = null;
        throw error;
      });
  }
  return currentSourcePromise;
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
  const distinctCandidate = Boolean(candidateVersion && candidateVersion !== PUBLISHED_VERSION);
  activeMode = requestedMode === CANDIDATE_MODE && distinctCandidate ? CANDIDATE_MODE : RELEASED_MODE;
  if (requestedMode !== activeMode) writeModeToUrl(activeMode, true);
  content.setAttribute('aria-busy', 'true');
  clearSearchMarks();
  if (searchInput) searchInput.value = '';
  if (searchStatus) searchStatus.textContent = '';
  status.textContent = activeMode === CANDIDATE_MODE
    ? 'Loading the release-candidate rules…'
    : 'Loading the canonical rulebook…';

  try {
    let markdown = null;
    if (activeMode === CANDIDATE_MODE) markdown = await loadCurrentRulebookSource(currentGame);
    else markdown = await loadVerifiedReleasedSource();

    const rendered = renderMarkdown(markdown);
    content.innerHTML = rendered.html;
    content.removeAttribute('aria-busy');
    buildToc(rendered.headings);
    decoratePublication();
    decorateHeadings();
    observeSections();
    setRulesetUi(activeMode, currentGame, distinctCandidate);
    document.dispatchEvent(new CustomEvent('gauntlet:rulebook-rendered', { detail: { mode: activeMode } }));
    scrollToLocationHash();

    const sectionCount = Math.max(
      0,
      rendered.headings.filter(({ level, id }) => level === 1 && id !== 'gauntlet' && id !== 'official-rulebook').length
    );
    status.textContent = activeMode === CANDIDATE_MODE
      ? `Release candidate ${currentGame?.displayVersion || 'v0.7.1'} · ${sectionCount} sections · rules loaded`
      : `Canonical v0.7.1 · ${sectionCount} sections · rules loaded`;
  } catch (error) {
    console.error(error);
    content.removeAttribute('aria-busy');
    content.innerHTML = `
      <section class="load-error" role="alert">
        <h1>The browser rulebook could not be loaded.</h1>
        <p>Use the <a href="${pdfUrl}">reader PDF</a> or <a href="${publishedSourceUrl}">canonical Markdown source</a>.</p>
      </section>
    `;
    status.textContent = 'Rulebook unavailable';
    setRulesetUi(activeMode, currentGame, distinctCandidate);
  }
}

async function loadRulebook() {
  initializeControls();
  activeMode = modeFromUrl();
  await renderRulebook(activeMode);
}

loadRulebook();
