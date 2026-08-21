const COPY_URL = './leader-copy/v0.6.4/leader-card-copy.json';
const STYLE_URL = './leader-card-copy.css';

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

function renderFeatureLine(feature) {
  const descriptor = feature.descriptor
    ? `<em class="leader-feature-descriptor">${esc(feature.descriptor)}</em>`
    : '';
  const text = feature.text
    ? `<span class="leader-feature-text">${esc(feature.text)}</span>`
    : '';
  return `<p class="leader-feature-line"><span class="leader-feature-primary"><strong>${esc(feature.name)}:</strong>${descriptor}</span>${text}</p>`;
}

function renderSection(section) {
  const content = Array.isArray(section.items) && section.items.length
    ? `<div class="leader-rule-content leader-rule-content--grouped"><p class="leader-feature-group-name"><strong>${esc(section.name)}</strong></p>${section.items.map(renderFeatureLine).join('')}</div>`
    : `<div class="leader-rule-content">${renderFeatureLine(section)}</div>`;
  return `<section class="leader-rule-section leader-rule-section--${slugify(section.heading)}"><h4>${esc(section.heading)}</h4>${content}</section>`;
}

async function ensureStyles() {
  const existing = document.querySelector('link[data-leader-card-copy-styles]');
  if (existing) {
    if (existing.sheet) return;
    await new Promise(resolve => existing.addEventListener('load', resolve, { once: true }));
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

async function applyLeaderCardCopy() {
  const root = document.querySelector('#leaderReviewSections');
  if (!root) return;
  try {
    const response = await fetch(COPY_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Leader card copy request failed: HTTP ${response.status}.`);
    const source = await response.json();
    const entries = Object.entries(source.leaders || {});
    if (!entries.length) throw new Error('Leader card copy contains no Leader definitions.');

    await Promise.all([ensureStyles(), waitForLeaderCards(root, entries.length)]);

    const renderedIds = new Set();
    for (const [leaderId, copy] of entries) {
      const candidate = Array.from(root.querySelectorAll('.leader-specimen')).find(specimen => specimen.id.endsWith(`-${leaderId}`));
      const leaderCard = candidate?.querySelector('.leader-card');
      const rules = leaderCard?.querySelector('.card-rules');
      if (!leaderCard || !rules) throw new Error(`Missing rendered Leader card for ${leaderId}.`);
      if (!Array.isArray(copy.sections) || !copy.sections.length) throw new Error(`Leader card copy for ${leaderId} has no sections.`);
      rules.innerHTML = copy.sections.map(renderSection).join('');
      leaderCard.classList.add('leader-card--standardized');
      // Dense standardized cards may trade portrait height for rules space before
      // the fitter ever crosses its typography floor. The fitter uses only as
      // much of this allowance as each card actually needs.
      leaderCard.dataset.artMin = '0.98';
      leaderCard.dataset.leaderCopyVersion = source.gameVersion || 'current';
      renderedIds.add(leaderId);
    }

    const cards = Array.from(root.querySelectorAll('.leader-specimen'));
    if (cards.length !== renderedIds.size) {
      throw new Error(`Leader copy covers ${renderedIds.size} cards but the catalog renders ${cards.length}.`);
    }

    root.dataset.leaderCopyReady = 'true';
    window.dispatchEvent(new Event('resize'));
  } catch (error) {
    console.error(error);
    root.dataset.leaderCopyReady = 'error';
  }
}

applyLeaderCardCopy();
