const content = document.querySelector('[data-rulebook-content]');

const FACTIONS = Object.freeze({
  military: Object.freeze({ name: 'Military', claim: 'Command the advance.', color: '#8f1f25', symbol: 'url("/images/faction-symbols/military.svg")' }),
  diplomats: Object.freeze({ name: 'Diplomats', claim: 'Make the enemy agree.', color: '#244b8f', symbol: 'url("/images/faction-symbols/diplomats.svg")' }),
  financiers: Object.freeze({ name: 'Financiers', claim: 'Own what others contest.', color: '#276744', symbol: 'url("/images/faction-symbols/financiers.svg")' }),
  intelligence: Object.freeze({ name: 'Intelligence', claim: 'Know before they act.', color: '#34373b', symbol: 'url("/images/faction-symbols/intelligence.svg")' }),
  mystics: Object.freeze({ name: 'Mystics', claim: 'Transform the hidden world.', color: '#603d78', symbol: 'url("/images/faction-symbols/mystics.svg")' }),
  inquisition: Object.freeze({ name: 'Inquisition', claim: 'Condemn what cannot endure.', color: '#9a6e21', symbol: 'url("/images/faction-symbols/inquisition.svg")' }),
});

const COMPLETE_RULES_FACTION_TITLES = Object.freeze({
  'Military Rules': 'military',
  'Diplomat Rules': 'diplomats',
  'Financier Rules': 'financiers',
  'Intelligence Rules': 'intelligence',
  'Mystics Rules': 'mystics',
  'Inquisition Rules': 'inquisition',
});

const CANDIDATE_CLASSES = [
  'candidate-publication',
  'candidate-player-guide',
  'candidate-faction-guide',
  'candidate-complete-rules',
];

function headingLabel(heading) {
  return heading?.textContent?.replace(/#\s*$/, '').trim() || '';
}

function preserveAnchor(heading) {
  const anchor = heading.querySelector('.heading-anchor');
  anchor?.remove();
  return anchor;
}

function restoreAnchor(heading, anchor) {
  if (anchor) heading.append(anchor);
}

function setStructuredHeading(heading, parts) {
  const anchor = preserveAnchor(heading);
  heading.replaceChildren(...parts);
  restoreAnchor(heading, anchor);
}

function factionForDocument(documentId) {
  return FACTIONS[documentId] || null;
}

function createFactionSymbol(faction) {
  const symbol = document.createElement('span');
  symbol.className = 'candidate-faction-symbol';
  symbol.setAttribute('aria-hidden', 'true');
  symbol.style.setProperty('--candidate-symbol', faction.symbol);
  symbol.style.setProperty('--candidate-accent', faction.color);
  return symbol;
}

function removeEditorialOpeningNote() {
  const title = content.querySelector(':scope > h1:first-child');
  const openingNote = title?.nextElementSibling;
  if (openingNote?.tagName === 'BLOCKQUOTE') openingNote.remove();
}

function buildMasthead(documentId) {
  const title = content.querySelector(':scope > h1:first-child');
  if (!title || title.closest('.candidate-masthead')) return title?.closest('.candidate-masthead') || null;

  const faction = factionForDocument(documentId);
  const masthead = document.createElement('header');
  masthead.className = 'candidate-masthead';

  if (faction) {
    masthead.classList.add('candidate-faction-masthead');
    masthead.dataset.faction = faction.name;
    masthead.style.setProperty('--candidate-accent', faction.color);
    masthead.style.setProperty('--candidate-symbol', faction.symbol);
  }

  const wordmark = document.createElement('img');
  wordmark.className = 'candidate-masthead-wordmark';
  wordmark.src = '/images/Gauntlet.svg';
  wordmark.alt = '';
  wordmark.setAttribute('aria-hidden', 'true');

  const kicker = document.createElement('p');
  kicker.className = 'candidate-masthead-kicker';
  kicker.textContent = faction
    ? 'Faction Guide'
    : documentId === 'complete-rules'
      ? 'Complete Rules'
      : "Player's Guide";

  const displayTitle = faction?.name
    || (documentId === 'complete-rules' ? 'Complete Rules' : "Player's Guide");
  const anchor = preserveAnchor(title);
  title.textContent = displayTitle;
  restoreAnchor(title, anchor);
  title.classList.add('candidate-document-title');
  title.classList.remove('publication-faction-heading');
  title.removeAttribute('data-publication-faction');
  title.style.removeProperty('--publication-faction-symbol');

  const titleRow = document.createElement('div');
  titleRow.className = 'candidate-masthead-title-row';
  if (faction) titleRow.append(createFactionSymbol(faction));

  title.before(masthead);
  titleRow.append(title);
  masthead.append(wordmark, kicker, titleRow);
  if (faction?.claim) {
    const claim = document.createElement('p');
    claim.className = 'candidate-masthead-claim';
    claim.textContent = faction.claim;
    masthead.append(claim);
  }
  return masthead;
}

function decorateNumberedSections(documentId) {
  const faction = factionForDocument(documentId);
  for (const heading of content.querySelectorAll(':scope > h2')) {
    const label = headingLabel(heading);
    const match = label.match(/^(\d+)\.\s+(.+)$/);
    if (!match) {
      heading.classList.add('candidate-section-opener');
      if (faction) {
        heading.dataset.faction = faction.name;
        heading.style.setProperty('--candidate-accent', faction.color);
      }
      continue;
    }

    const number = document.createElement('span');
    number.className = 'candidate-chapter-number';
    number.textContent = match[1];

    const title = document.createElement('span');
    title.className = 'candidate-chapter-title';
    title.textContent = match[2];

    setStructuredHeading(heading, [number, title]);
    heading.classList.add('candidate-chapter-heading');
    if (faction) {
      heading.dataset.faction = faction.name;
      heading.style.setProperty('--candidate-accent', faction.color);
    }
  }
}

function wrapPlayerGuideFactionOverviews() {
  const headings = [...content.querySelectorAll('h3')];
  for (const heading of headings) {
    const label = headingLabel(heading);
    const entry = Object.entries(FACTIONS)
      .find(([, faction]) => label.startsWith(`${faction.name} —`));
    if (!entry || heading.closest('.candidate-faction-overview')) continue;

    const [, faction] = entry;
    const wrapper = document.createElement('section');
    wrapper.className = 'candidate-faction-overview';
    wrapper.dataset.faction = faction.name;
    wrapper.style.setProperty('--candidate-accent', faction.color);
    heading.before(wrapper);

    let node = heading;
    while (node && (node === heading || !['H2', 'H3'].includes(node.tagName))) {
      const next = node.nextElementSibling;
      wrapper.append(node);
      node = next;
    }
  }
}

function decorateCompleteRulesParts() {
  for (const heading of content.querySelectorAll(':scope > h2')) {
    const label = headingLabel(heading);
    const match = label.match(/^Part\s+([IVXLCDM]+)\s+[—-]\s+(.+)$/);
    if (!match) continue;

    const partLabel = document.createElement('span');
    partLabel.className = 'candidate-part-label';
    partLabel.textContent = `Part ${match[1]}`;

    const title = document.createElement('span');
    title.className = 'candidate-part-title';
    title.textContent = match[2];

    const factionId = COMPLETE_RULES_FACTION_TITLES[match[2]];
    if (factionId) {
      const faction = FACTIONS[factionId];
      const titleRow = document.createElement('span');
      titleRow.className = 'candidate-part-title-row';
      titleRow.append(createFactionSymbol(faction), title);
      setStructuredHeading(heading, [partLabel, titleRow]);
      heading.classList.add('candidate-part-heading', 'candidate-faction-part-heading');
      heading.dataset.faction = faction.name;
      heading.style.setProperty('--candidate-accent', faction.color);
      heading.classList.remove('publication-faction-heading');
      heading.removeAttribute('data-publication-faction');
      heading.style.removeProperty('--publication-faction-symbol');
    } else {
      setStructuredHeading(heading, [partLabel, title]);
      heading.classList.add('candidate-part-heading');
    }
  }

  content.querySelectorAll(':scope > h3').forEach((heading) => {
    heading.classList.add('candidate-technical-heading');
  });
}

function featureFactionGuideLeaders(masthead) {
  const gallery = content.querySelector('.candidate-leader-portrait-gallery');
  if (!gallery || !masthead) return;
  gallery.classList.add('candidate-featured-leaders');
  masthead.insertAdjacentElement('afterend', gallery);
}

function decorateCandidatePublication({ mode = document.body.dataset.rulesetMode, document: documentId = document.body.dataset.candidateDocument } = {}) {
  if (!content) return;
  content.classList.remove(...CANDIDATE_CLASSES);
  delete content.dataset.candidateDocument;

  if (mode !== 'candidate') return;
  const normalizedDocument = documentId || 'player-guide';
  content.classList.add('candidate-publication');
  content.dataset.candidateDocument = normalizedDocument;

  const faction = factionForDocument(normalizedDocument);
  if (normalizedDocument === 'player-guide') content.classList.add('candidate-player-guide');
  else if (normalizedDocument === 'complete-rules') content.classList.add('candidate-complete-rules');
  else if (faction) content.classList.add('candidate-faction-guide');

  removeEditorialOpeningNote();
  const masthead = buildMasthead(normalizedDocument);

  if (normalizedDocument === 'complete-rules') {
    decorateCompleteRulesParts();
  } else {
    decorateNumberedSections(normalizedDocument);
    if (normalizedDocument === 'player-guide') wrapPlayerGuideFactionOverviews();
    if (faction) featureFactionGuideLeaders(masthead);
  }
}

document.addEventListener('gauntlet:rulebook-rendered', (event) => {
  queueMicrotask(() => decorateCandidatePublication(event.detail || {}));
});

queueMicrotask(() => {
  if (content?.querySelector('h1')) decorateCandidatePublication();
});
