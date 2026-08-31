const STYLE_URL = './leader-card-copy.css';
const CATALOG_FILTER = document.body?.classList.contains('developer-catalog-page')
  ? window.GauntletCatalogFilter || null
  : null;

const PRINT_LEADER_SPECIMEN_ID = (() => {
  const params = new URLSearchParams(window.location.search);
  if (String(params.get('kind') || '').trim().toLowerCase() !== 'leader') return '';
  return String(params.get('id') || '').trim();
})();

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function renderMeta(feature, { showName = false } = {}) {
  const parts = [];
  if (showName && feature.cost) {
    parts.push(`<strong class="leader-feature-item-name">${esc(feature.name)}</strong>`);
  }
  if (feature.cost) {
    parts.push(`<strong class="leader-feature-cost">${esc(feature.cost)}</strong>`);
  }
  if (feature.descriptor) {
    parts.push(`<em class="leader-feature-descriptor">${esc(feature.descriptor)}</em>`);
  }
  if (!parts.length) return '';
  return `<span class="leader-feature-meta">${parts.join('<span class="leader-feature-separator" aria-hidden="true">—</span>')}</span>`;
}

function renderFeatureLine(feature, options = {}) {
  const meta = renderMeta(feature, options);
  const text = feature.text
    ? `<span class="leader-feature-text">${esc(feature.text)}</span>`
    : '';
  return `<p class="leader-feature-line">${meta}${text}</p>`;
}

function renderSection(section) {
  const classification = section.classification || section.heading;
  const content = Array.isArray(section.items) && section.items.length
    ? `<div class="leader-rule-content leader-rule-content--grouped">${section.items.map(item => renderFeatureLine(item, { showName: true })).join('')}</div>`
    : `<div class="leader-rule-content">${renderFeatureLine(section)}</div>`;
  return `<section class="leader-rule-section leader-rule-section--${slugify(classification)}"><div class="leader-section-label"><h4 class="leader-section-name">${esc(section.name)}</h4><span class="leader-section-kind">${esc(classification)}</span></div>${content}</section>`;
}

async function ensureStyles() {
  const existing = document.querySelector('link[data-leader-card-copy-styles]');
  if (existing) {
    if (existing.sheet) return;
    await new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error(`Leader card stylesheet failed to load: ${STYLE_URL}`)), { once: true });
    });
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_URL;
  link.dataset.leaderCardCopyStyles = 'true';
  const loaded = new Promise((resolve, reject) => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', () => reject(new Error(`Leader card stylesheet failed to load: ${STYLE_URL}`)), { once: true });
  });
  document.head.append(link);
  await loaded;
}

function waitForLeaderCards(root, expectedCount) {
  if (root.querySelectorAll('.leader-card').length >= expectedCount) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Leader card renderer produced fewer than ${expectedCount} cards.`));
    }, 5000);
    const observer = new MutationObserver(() => {
      if (root.querySelectorAll('.leader-card').length < expectedCount) return;
      window.clearTimeout(timeout);
      observer.disconnect();
      resolve();
    });
    observer.observe(root, { childList: true, subtree: true });
  });
}

function leaderCardFor(root, leaderId, specimenId = '') {
  const candidate = specimenId
    ? root.querySelector(`#${CSS.escape(specimenId)}`)
    : Array.from(root.querySelectorAll('.leader-specimen')).find(specimen => specimen.id.endsWith(`-${leaderId}`));
  return candidate?.querySelector('.leader-card') || null;
}

function waitForLeaderSpecimen(root, specimenId) {
  if (leaderCardFor(root, '', specimenId)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Leader card renderer did not produce requested print component ${specimenId}.`));
    }, 5000);
    const observer = new MutationObserver(() => {
      if (!leaderCardFor(root, '', specimenId)) return;
      window.clearTimeout(timeout);
      observer.disconnect();
      resolve();
    });
    observer.observe(root, { childList: true, subtree: true });
  });
}

function applyCopyToLeader(root, leaderId, copy, source, specimenId = '') {
  const leaderCard = leaderCardFor(root, leaderId, specimenId);
  const rules = leaderCard?.querySelector('.card-rules');
  if (!leaderCard || !rules) throw new Error(`Missing rendered Leader card for ${leaderId}.`);
  if (!Array.isArray(copy.sections) || !copy.sections.length) throw new Error(`Leader card authority for ${leaderId} has no sections.`);
  rules.innerHTML = copy.sections.map(renderSection).join('');
  leaderCard.classList.add('leader-card--standardized');
  delete leaderCard.dataset.titleFit;
  delete leaderCard.dataset.overlayTitleFit;
  leaderCard.classList.remove('fit-warning', 'title-fit-warning', 'overlay-title-fit-warning');
  leaderCard.dataset.artMin = '0.98';
  leaderCard.dataset.leaderCopyVersion = source.gameVersion || 'current';
  leaderCard.dataset.leaderCopySource = source.authorityUrl || '/game-data/current-game.json';
}

async function loadLeaderAuthority() {
  const currentGame = await import('../game-data/current-game.mjs').then(module => module.loadCurrentGame());
  const leaders = Object.fromEntries((currentGame.leaders || []).map(leader => [leader.id, leader]));
  if (!Object.keys(leaders).length) throw new Error('Current-game authority contains no Leader definitions.');
  return {
    gameVersion: currentGame.version,
    authorityUrl: currentGame.authorityUrl,
    leaders,
  };
}

async function applyLeaderCardCopy() {
  const root = document.querySelector('#leaderReviewSections');
  if (!root) return;
  if (CATALOG_FILTER && !CATALOG_FILTER.typeMatches('leader')) {
    root.dataset.leaderCopyReady = 'true';
    return;
  }
  try {
    const source = await loadLeaderAuthority();
    let entries = Object.entries(source.leaders || {});
    if (CATALOG_FILTER) {
      entries = entries.filter(([, leader]) => CATALOG_FILTER.factionMatches(leader.faction));
    }

    await ensureStyles();

    if (PRINT_LEADER_SPECIMEN_ID) {
      const match = entries.find(([leaderId]) => PRINT_LEADER_SPECIMEN_ID.endsWith(`-${leaderId}`));
      if (!match) throw new Error(`No current Leader authority matches print component ${PRINT_LEADER_SPECIMEN_ID}.`);
      const [leaderId, copy] = match;
      await waitForLeaderSpecimen(root, PRINT_LEADER_SPECIMEN_ID);
      applyCopyToLeader(root, leaderId, copy, source, PRINT_LEADER_SPECIMEN_ID);
      root.dataset.leaderCopyReady = 'true';
      root.dataset.leaderCopySource = source.authorityUrl;
      delete root.dataset.leaderCopyError;
      window.dispatchEvent(new Event('resize'));
      return;
    }

    if (!entries.length) {
      root.dataset.leaderCopyReady = 'true';
      root.dataset.leaderCopySource = source.authorityUrl;
      return;
    }

    await waitForLeaderCards(root, entries.length);
    const renderedIds = new Set();
    for (const [leaderId, copy] of entries) {
      applyCopyToLeader(root, leaderId, copy, source);
      renderedIds.add(leaderId);
    }

    const cards = Array.from(root.querySelectorAll('.leader-specimen'));
    if (cards.length !== renderedIds.size) {
      throw new Error(`Current Leader authority covers ${renderedIds.size} cards but the catalog renders ${cards.length}.`);
    }

    root.dataset.leaderCopyReady = 'true';
    root.dataset.leaderCopySource = source.authorityUrl;
    delete root.dataset.leaderCopyError;
    window.dispatchEvent(new Event('resize'));
  } catch (error) {
    console.error(error);
    root.dataset.leaderCopyReady = 'error';
    root.dataset.leaderCopyError = error?.message || String(error);
  }
}

applyLeaderCardCopy();
