import './candidate-publication.js';
import { RULES_PUBLICATION_ASSETS } from './assets/publication-assets.mjs';

const content = document.querySelector('[data-rulebook-content]');

const heroArt = document.querySelector('.hero-art img');
if (heroArt) {
  heroArt.src = '../images/woodcuts/hero compositions/hero 1.png';
}

// Keep the frozen released-v0.7.1 presentation exactly on its established
// woodcut assets. Candidate publications reuse the same approved woodcut
// Leader art through the modular publication asset registry.
const RELEASED_FACTION_LEADERS = [
  ['Military', [
    ['General', '../images/woodcuts/general.png'],
    ['Commandant', '../images/woodcuts/commandant.png'],
  ]],
  ['Diplomats', [
    ['Ambassador', '../images/woodcuts/ambassador.png'],
    ['Senator', '../images/woodcuts/senator.png'],
  ]],
  ['Financiers', [
    ['Banker', '../images/woodcuts/banker.png'],
    ['Executive', '../images/woodcuts/executive.png'],
  ]],
  ['Intelligence', [
    ['Ranger', '../images/woodcuts/ranger.png'],
    ['Spymaster', '../images/woodcuts/spymaster.png'],
  ]],
  ['Mystics', [
    ['Alchemist', '../images/woodcuts/alchemist.png'],
    ['Spirit Walker', '../images/woodcuts/spirit-walker.png'],
  ]],
  ['Inquisition', [
    ['Grand Inquisitor', '../images/woodcuts/grand-inquisitor.png'],
    ['Witch Hunter', '../images/woodcuts/witch-hunter.png'],
  ]],
];

const CANDIDATE_FACTION_DOCUMENTS = new Set(Object.keys(RULES_PUBLICATION_ASSETS.factions));

function headingLabel(heading) {
  return heading.textContent.replace(/#\s*$/, '').trim();
}

function findReleasedFactionHeading(faction) {
  return [...content.querySelectorAll('h1')].find((heading) => {
    if (heading.dataset.chapterTitle === faction) return true;
    const label = headingLabel(heading);
    return label === faction || new RegExp(`^\\d+\\.\\s*${faction}$`, 'i').test(label);
  });
}

function buildGallery(faction, leaders, { candidate = false } = {}) {
  const gallery = document.createElement('section');
  gallery.className = 'leader-portrait-gallery';
  if (candidate) gallery.classList.add('candidate-leader-portrait-gallery');
  gallery.dataset.leaderPortraitGallery = faction;
  gallery.setAttribute('aria-label', `${faction} Leaders`);

  for (const leader of leaders) {
    const [name, src] = Array.isArray(leader)
      ? leader
      : [leader.name, leader.publicUrl];
    const figure = document.createElement('figure');
    figure.className = 'leader-portrait-figure';

    const image = document.createElement('img');
    image.className = 'leader-portrait';
    image.src = src;
    image.alt = `${name} Leader woodcut`;
    image.loading = 'lazy';
    image.decoding = 'async';

    const caption = document.createElement('figcaption');
    caption.textContent = name;

    figure.append(image, caption);
    gallery.append(figure);
  }

  return gallery;
}

function injectReleasedLeaderPortraits() {
  if (!content) return;
  for (const [faction, leaders] of RELEASED_FACTION_LEADERS) {
    if (content.querySelector(`[data-leader-portrait-gallery="${faction}"]`)) continue;
    const heading = findReleasedFactionHeading(faction);
    if (!heading) continue;
    heading.insertAdjacentElement('afterend', buildGallery(faction, leaders));
  }
}

function applyFactionSymbol(heading, factionId) {
  const asset = RULES_PUBLICATION_ASSETS.factions[factionId];
  if (!heading || !asset) return;
  heading.classList.add('publication-faction-heading');
  heading.dataset.publicationFaction = factionId;
  heading.style.setProperty('--publication-faction-symbol', `url("${asset.symbol.publicUrl}")`);
}

function decoratePlayerGuideFactions() {
  for (const [factionId, asset] of Object.entries(RULES_PUBLICATION_ASSETS.factions)) {
    const heading = [...content.querySelectorAll('h3')]
      .find(candidate => headingLabel(candidate).startsWith(`${asset.name} —`));
    applyFactionSymbol(heading, factionId);
  }
}

function decorateCompleteRulesFactions() {
  const technicalTitles = {
    military: 'Military Rules',
    diplomats: 'Diplomat Rules',
    financiers: 'Financier Rules',
    intelligence: 'Intelligence Rules',
    mystics: 'Mystics Rules',
    inquisition: 'Inquisition Rules',
  };
  for (const [factionId, title] of Object.entries(technicalTitles)) {
    const heading = [...content.querySelectorAll('h2')]
      .find(candidate => headingLabel(candidate).endsWith(`— ${title}`));
    applyFactionSymbol(heading, factionId);
  }
}

function decorateFactionGuide(factionId) {
  const asset = RULES_PUBLICATION_ASSETS.factions[factionId];
  if (!asset) return;

  const title = [...content.querySelectorAll('h1')]
    .find(heading => headingLabel(heading) === `${asset.name} Guide`);
  applyFactionSymbol(title, factionId);

  if (content.querySelector(`[data-leader-portrait-gallery="${asset.name}"]`)) return;
  const leadersHeading = [...content.querySelectorAll('h2')]
    .find(heading => /(?:^|\s)Your Leaders$/.test(headingLabel(heading).replace(/^\d+\.\s*/, '')));
  if (!leadersHeading) return;
  leadersHeading.insertAdjacentElement('afterend', buildGallery(asset.name, asset.leaders, { candidate: true }));
}

function clearInjectedPublicationAssets() {
  content?.querySelectorAll('[data-leader-portrait-gallery]').forEach(node => node.remove());
  content?.querySelectorAll('.publication-faction-heading').forEach((heading) => {
    heading.classList.remove('publication-faction-heading');
    heading.removeAttribute('data-publication-faction');
    heading.style.removeProperty('--publication-faction-symbol');
  });
}

function decorateForRender({ mode = 'released', document: documentId = 'released-rulebook' } = {}) {
  if (!content) return;
  clearInjectedPublicationAssets();

  if (mode !== 'candidate') {
    injectReleasedLeaderPortraits();
    return;
  }

  if (documentId === 'player-guide') {
    decoratePlayerGuideFactions();
    return;
  }
  if (documentId === 'complete-rules') {
    decorateCompleteRulesFactions();
    return;
  }
  if (CANDIDATE_FACTION_DOCUMENTS.has(documentId)) {
    decorateFactionGuide(documentId);
  }
}

function inferredRenderContext() {
  const url = new URL(window.location.href);
  const mode = document.body.dataset.rulesetMode === 'candidate' || url.searchParams.get('rules') === 'candidate'
    ? 'candidate'
    : 'released';
  return {
    mode,
    document: mode === 'candidate' ? (url.searchParams.get('doc') || 'player-guide') : 'released-rulebook',
  };
}

if (content) {
  const observer = new MutationObserver(() => {
    if (!content.querySelector('h1')) return;
    observer.disconnect();
    decorateForRender(inferredRenderContext());
    observer.observe(content, { childList: true, subtree: true });
  });
  observer.observe(content, { childList: true, subtree: true });

  document.addEventListener('gauntlet:rulebook-rendered', (event) => {
    observer.disconnect();
    decorateForRender(event.detail || inferredRenderContext());
    observer.observe(content, { childList: true, subtree: true });
  });

  queueMicrotask(() => {
    if (content.querySelector('h1')) decorateForRender(inferredRenderContext());
  });
}
