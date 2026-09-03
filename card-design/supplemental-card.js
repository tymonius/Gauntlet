import { deedCardMarkup } from './deed-card.js';
import {
  fitReferenceCard,
  loadReferenceRecords,
  referenceCardMarkup,
} from './reference-card.js';
import { capitalLedgerMarkup } from './capital-ledger.js';
import { loadRenderGame } from './render-context.mjs';

const FACTION_LABELS = Object.freeze({
  military: 'Military',
  diplomats: 'Diplomats',
  financiers: 'Financiers',
  intelligence: 'Intelligence',
  mystics: 'Mystics',
  inquisition: 'Inquisition',
});

const CSS_PX_PER_IN = 96;
const TRACKER_CAP_INSTRUCTION_GAP_IN = 0.02;
const TRACKER_INSTRUCTION_SCALE_GAP_IN = 0.05;
const TRACKER_TITLE_MIN_PT = 9.5;

// Physical print geometry is presentation data, not gameplay authority. The
// identity, quantity, status, back policy, and tracked value all come from the
// current-game component contract; only the drawn scale/layout lives here.
const TRACKER_PRESENTATION = Object.freeze({
  'military-command-tracker': {
    max: 4,
    labelSize: 11.2,
    instruction: 'Place faction leader card on top of this tracker and slide it upward or downward to align the bottom edge with the line above your current Command value.',
  },
  'diplomats-influence-tracker': {
    max: 10,
    labelSize: 7.9,
    instruction: 'Place faction leader card on top of this tracker and slide it upward or downward to align the bottom edge with the line above your current Influence value.',
  },
  'financiers-capital-limit-tracker': {
    max: 15,
    labelSize: 6.8,
    instruction: 'Place faction leader card on top of this tracker and slide it upward or downward to align the bottom edge with the line above your current Capital Limit value.',
  },
  'intelligence-intel-tracker': {
    max: 12,
    labelSize: 7.2,
    instruction: 'Place faction leader card on top of this tracker and slide it upward or downward to align the bottom edge with the line above your current Intel value.',
  },
  'intelligence-operation-progress-tracker': {
    max: 8,
    labelSize: 6.8,
    instruction: 'Place the Intel Tracker and faction leader card on top of this tracker. Slide them together upward or downward to align the bottom edge of the Intel Tracker with the line above your current Operation Progress value.',
  },
  'inquisition-conviction-tracker': {
    max: 4,
    labelSize: 10.4,
    instruction: 'Place faction leader card on top of this tracker and slide it upward or downward to align the bottom edge with the line above your current Conviction value.',
  },
});

const root = document.querySelector('#supplementalReviewSections');
const catalogFilter = document.body?.classList.contains('developer-catalog-page')
  ? window.GauntletCatalogFilter || null
  : null;
let currentDisplayVersion = 'Current';
let supplementalGroups = [];

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

function rendererId(component) {
  return String(component.renderSource?.componentId || component.id || '').trim();
}

function designStatus(component) {
  return component.designStatus || 'final';
}

function componentType(component) {
  if (component.family === 'tracker') return 'Sliding tracker card';
  if (component.family === 'reference-card') return 'Double-sided reference card';
  if (component.family === 'ledger') return 'Ledger';
  if (component.family === 'deed-card') return 'Shared full-size card';
  return component.family || 'Supplemental component';
}

function componentDetail(component) {
  if (component.deckInclusion === 'every-deck') {
    return component.purpose || 'Shared reference card included in every deck.';
  }
  if (component.family === 'tracker') {
    const tracked = component.trackedValue?.name || component.name;
    return `Physical tracker for ${tracked}. Production status: ${component.productionStatus}.`;
  }
  if (component.family === 'reference-card') return 'Source-driven current reference card.';
  if (component.family === 'ledger') return 'Consumable duplex Capital record with identical ledger faces.';
  return `Production status: ${component.productionStatus}.`;
}

function presentationComponent(component) {
  const ledger = component.family === 'ledger';
  const hasReferenceFaces = component.family === 'reference-card' && component.referenceFaces?.front && component.referenceFaces?.reverse;
  return {
    contractId: component.id,
    id: rendererId(component),
    family: component.family,
    referenceId: hasReferenceFaces ? component.id : '',
    ledger,
    name: component.name,
    resourceName: component.family === 'tracker'
      ? (component.trackedValue?.name || component.name.replace(/\s+Tracker$/i, ''))
      : '',
    resourceMaximum: component.family === 'tracker' ? (component.trackedValue?.maximum ?? null) : null,
    type: componentType(component),
    detail: componentDetail(component),
    quantity: Number(component.quantity ?? component.quantityPerPlayer) || 1,
    doubleSided: component.backPolicy === 'twoSided',
    designStatus: designStatus(component),
    productionStatus: component.productionStatus,
    backPolicy: component.backPolicy,
    deckInclusion: component.deckInclusion || '',
    tracker: component.family === 'tracker' ? TRACKER_PRESENTATION[component.id] || null : null,
  };
}

function buildSupplementalGroups(currentGame) {
  const supportedFamilies = new Set(['tracker', 'reference-card', 'ledger', 'deed-card']);
  const sharedCards = (currentGame.sharedComponents || [])
    .filter(component => component.cardLike && supportedFamilies.has(component.family))
    .map(presentationComponent);
  const factionGroups = Object.entries(FACTION_LABELS).map(([faction, factionLabel]) => ({
    faction,
    factionLabel,
    cards: (currentGame.components || [])
      .filter(component => component.faction === faction && supportedFamilies.has(component.family))
      .map(presentationComponent),
  }));
  return [
    { faction: 'neutral', factionLabel: 'Universal', cards: sharedCards },
    ...factionGroups,
  ].filter(group => group.cards.length);
}

function isolatedComponentRenderId() {
  if (!/\/component-render\.html$/.test(window.location.pathname)) return '';
  return String(new URLSearchParams(window.location.search).get('id') || '').trim();
}

function filterSupplementalGroups(groups) {
  const isolatedId = isolatedComponentRenderId();
  let filteredGroups = groups;

  // The standalone production renderer only needs the one requested
  // supplemental component. Rendering and fitting every current tracker and
  // reference card in every iframe makes Deckbuilder print sheets fan out into
  // many redundant full-catalog hydrations; reference faces can then miss the
  // production-render timeout under normal browser concurrency.
  if (isolatedId) {
    filteredGroups = groups
      .map(group => ({
        ...group,
        cards: group.cards.filter(component => (
          component.id === isolatedId
          || component.contractId === isolatedId
          || component.referenceId === isolatedId
        )),
      }))
      .filter(group => group.cards.length);
  }

  if (!catalogFilter) return filteredGroups;

  const familyForType = {
    tracker: 'tracker',
    reference: 'reference-card',
    ledger: 'ledger',
    deed: 'deed-card',
  };

  return filteredGroups
    .filter(group => catalogFilter.factionMatches(group.faction))
    .map(group => {
      let cards = group.cards;
      if (catalogFilter.type !== 'all' && catalogFilter.type !== 'supplemental') {
        const family = familyForType[catalogFilter.type];
        cards = family ? cards.filter(component => component.family === family) : [];
      }
      if (catalogFilter.sort === 'name') {
        cards = cards.slice().sort((a, b) => a.name.localeCompare(b.name));
      }
      return { ...group, cards };
    })
    .filter(group => group.cards.length);
}

function supplementalTypeLine(component) {
  return `<div class="supplemental-type-line"><span class="supplemental-faction-emblem" aria-hidden="true"></span><span>${esc(component.type)}</span></div>`;
}

function placeholderArtwork(component, faceLabel = '') {
  const label = faceLabel ? `${faceLabel} design slot` : 'Design slot';
  return `<figure class="card-art supplemental-art-pending" aria-label="${esc(label)} reserved for ${esc(component.name)}">
    <span class="supplemental-placeholder-kicker">Reserved</span>
    <strong>${esc(label)}</strong>
    <span>Production layout pending</span>
  </figure>`;
}

function trackerMarks(component, resourceName) {
  const { max } = component.tracker;
  return Array.from({ length: max }, (_, index) => index + 1).map(value => {
    const linePosition = (value / max) * 100;
    const bandBottom = ((value - 1) / max) * 100;
    const major = max <= 4 || value === max || value % 5 === 0;
    return `<div class="tracker-mark${major ? ' tracker-mark-major' : ''}" style="--tracker-line-position:${linePosition.toFixed(4)}%;--tracker-band-bottom:${bandBottom.toFixed(4)}%">
      <span class="tracker-registration-line" aria-hidden="true"></span>
      <strong class="tracker-band-label">${value} ${esc(resourceName)}</strong>
    </div>`;
  }).join('');
}

function trackerCapLabel(component, resourceName) {
  if (component.contractId === 'intelligence-operation-progress-tracker') return '';
  if (component.contractId === 'financiers-capital-limit-tracker') return 'Maximum Capital Limit · Uncapped';
  return Number.isFinite(component.resourceMaximum)
    ? `Standard ${resourceName} cap · ${component.resourceMaximum}`
    : `Standard ${resourceName} cap · none`;
}

function trackerTitle(component, resourceName) {
  return component.contractId === 'intelligence-operation-progress-tracker'
    ? resourceName
    : `${resourceName} Tracker`;
}

function trackerFace(component, faction, factionLabel) {
  if (!component.tracker) throw new Error(`Current tracker ${component.contractId} has no presentation geometry.`);
  const { max, labelSize, instruction } = component.tracker;
  const resourceName = component.resourceName || component.name.replace(/\s+Tracker$/i, '');
  const capLabel = trackerCapLabel(component, resourceName);
  const title = trackerTitle(component, resourceName);
  return `<article class="gauntlet-card faction-component-card sliding-tracker-card ${esc(faction)}-card" data-faction="${esc(faction)}" data-component-id="${esc(component.id)}" data-contract-component-id="${esc(component.contractId)}" aria-label="${esc(component.name)} sliding tracker, physical scale 0 through ${max}">
    <div class="card-interior tracker-interior">
      <span class="tracker-watermark" aria-hidden="true"></span>
      <header class="tracker-heading">
        <span class="tracker-faction-emblem" aria-hidden="true"></span>
        <span class="tracker-faction-name">${esc(factionLabel)}</span>
        <h3>${esc(title)}</h3>
        ${capLabel
          ? `<p class="tracker-cap">${esc(capLabel)}</p>`
          : '<p class="tracker-cap tracker-cap-empty" aria-hidden="true"></p>'}
      </header>
      <div class="tracker-instructions">${esc(instruction)}</div>
      <div class="tracker-scale" style="--tracker-max:${max};--tracker-label-size:${Number(labelSize)}pt" aria-label="Registration bands 1 through ${max}">
        ${trackerMarks(component, resourceName)}
      </div>
      <footer class="card-footer tracker-footer"><span>${esc(factionLabel)}</span><span>Tracker</span><span>${esc(currentDisplayVersion)}</span></footer>
    </div>
  </article>`;
}

function fitTrackerTitle(card) {
  const title = card.querySelector('.tracker-heading h3');
  if (!title) return;

  title.style.fontSize = '';
  const minimumPx = (TRACKER_TITLE_MIN_PT * CSS_PX_PER_IN) / 72;
  let fontSize = Number.parseFloat(getComputedStyle(title).fontSize);
  if (!Number.isFinite(fontSize)) return;

  while (title.scrollWidth > title.clientWidth + 0.5 && fontSize > minimumPx) {
    fontSize = Math.max(minimumPx, fontSize - 0.25);
    title.style.fontSize = `${fontSize}px`;
    void title.offsetWidth;
  }

  const fits = title.scrollWidth <= title.clientWidth + 0.5;
  card.dataset.trackerTitleFit = fits ? 'true' : 'false';
  return fits;
}

function layoutTrackerCard(card) {
  const interior = card.querySelector('.tracker-interior');
  const heading = card.querySelector('.tracker-heading');
  const instructions = card.querySelector('.tracker-instructions');
  const scale = card.querySelector('.tracker-scale');
  const footer = card.querySelector('.tracker-footer');
  if (!interior || !heading || !instructions || !scale || !footer) return;

  fitTrackerTitle(card);

  const interiorRect = interior.getBoundingClientRect();
  const headingRect = heading.getBoundingClientRect();
  const instructionTop = headingRect.bottom - interiorRect.top + (TRACKER_CAP_INSTRUCTION_GAP_IN * CSS_PX_PER_IN);
  instructions.style.top = `${instructionTop}px`;

  const instructionRect = instructions.getBoundingClientRect();
  const footerRect = footer.getBoundingClientRect();
  const scaleTop = instructionRect.bottom - interiorRect.top + (TRACKER_INSTRUCTION_SCALE_GAP_IN * CSS_PX_PER_IN);
  const scaleBottom = Math.max(0, interiorRect.bottom - footerRect.top);

  scale.style.top = `${scaleTop}px`;
  scale.style.bottom = `${scaleBottom}px`;
  scale.style.height = 'auto';
  card.dataset.trackerLayout = 'measured';
}

async function layoutTrackerCards() {
  if (!root) return;
  await new Promise(resolve => requestAnimationFrame(resolve));
  if (document.fonts?.ready) await document.fonts.ready;
  const cards = [...root.querySelectorAll('.sliding-tracker-card')];
  cards.forEach(layoutTrackerCard);
  const titleFailures = cards.filter(card => card.dataset.trackerTitleFit !== 'true');
  if (titleFailures.length) {
    // The standalone Card Design catalog validates every tracker specimen.
    // component-print-render.html, however, keeps the entire supplemental
    // catalog off-screen only as a source pool for one requested component.
    // Do not let an unrelated hidden tracker abort a Proposal/Rite/Ledger
    // render. If the requested component is itself a tracker, enforce that
    // tracker's fit here and component-print-render.js validates it again
    // before exposing the production face.
    const params = new URLSearchParams(window.location.search);
    const isolatedComponentRender = /\/component-print-render\.html$/.test(window.location.pathname);
    const requestedKind = String(params.get('kind') || '').trim().toLowerCase();
    const requestedId = String(params.get('id') || '').trim();
    const enforcedFailures = isolatedComponentRender
      ? (requestedKind === 'tracker'
        ? titleFailures.filter(card => card.dataset.componentId === requestedId)
        : [])
      : titleFailures;
    if (enforcedFailures.length) {
      throw new Error(`Tracker titles cannot fit at the readability floor: ${enforcedFailures.map(card => card.dataset.contractComponentId || card.dataset.componentId).join(', ')}`);
    }
  }
  root.dataset.trackerLayoutsReady = 'true';
}

function placeholderFace(component, faction, factionLabel, faceLabel = '') {
  const faceText = faceLabel ? ` · ${faceLabel}` : '';
  return `<article class="gauntlet-card faction-component-card supplemental-placeholder-card ${esc(faction)}-card" data-faction="${esc(faction)}" data-component-id="${esc(component.id)}" data-contract-component-id="${esc(component.contractId)}" data-production-status="${esc(component.productionStatus)}" data-design-status="${esc(component.designStatus)}" data-art-max="1.52" data-art-min="1.18" data-title-min="8.5" aria-label="${esc(component.name)} ${esc(component.type)}${esc(faceText)}">
    <div class="card-interior">
      <header class="card-heading">
        <h3 class="card-title">${esc(component.name)}</h3>
        ${supplementalTypeLine(component)}
      </header>
      ${placeholderArtwork(component, faceLabel)}
      <div class="card-rules">
        <section class="rule-section supplemental-requirement">
          <h4>Required component</h4>
          <p>${esc(component.detail)}</p>
        </section>
      </div>
      <footer class="card-footer"><span>${esc(factionLabel)}</span><span>${esc(component.name)}</span><span>${esc(currentDisplayVersion)}</span></footer>
    </div>
  </article>`;
}

function referenceLoadingFace(component, faction, factionLabel, sideName) {
  return `<article class="gauntlet-card faction-component-card reference-card reference-card-loading" data-faction="${esc(faction)}" data-component-id="${esc(component.referenceId)}" data-contract-component-id="${esc(component.contractId)}" data-reference-side="${esc(sideName)}" aria-label="${esc(component.name)} ${esc(sideName)} loading current rules">
    <div class="reference-card-interior">
      <span class="reference-watermark" aria-hidden="true"></span>
      <header class="reference-card-header">
        <h3 class="reference-face-title">Loading reference…</h3>
        <div class="reference-type-line"><span class="reference-faction-emblem" aria-hidden="true"></span><span>${esc(component.name.replace(/\s+Card$/i, ''))}</span></div>
      </header>
      <div class="reference-body">
        <section class="reference-section reference-panel reference-panel--rules">
          <header class="reference-panel-heading"><h4>Current-game authority</h4></header>
          <div class="reference-panel-content"><p class="reference-prose">Loading current reference rules.</p></div>
        </section>
      </div>
      <footer class="card-footer"><span>${esc(factionLabel)}</span><span>Reference</span><span>${esc(currentDisplayVersion)}</span></footer>
    </div>
  </article>`;
}

function canonicalComponentRenderKind(component) {
  if (component.referenceId) return 'reference';
  if (component.tracker) return 'tracker';
  return 'supplemental';
}

function canonicalComponentRenderId(component) {
  return component.referenceId || component.id;
}

function canonicalComponentOrientation(component) {
  return component.family === 'deed-card' ? 'landscape' : 'portrait';
}

function canonicalComponentRenderSource(component, side = 'front') {
  const params = new URLSearchParams({
    kind: canonicalComponentRenderKind(component),
    id: canonicalComponentRenderId(component),
    side,
  });
  if (canonicalComponentOrientation(component) === 'landscape') params.set('orientation', 'landscape');
  const rules = new URLSearchParams(window.location.search).get('rules');
  if (rules) params.set('rules', rules);
  return `/card-design/component-render.html?${params.toString()}`;
}

function canonicalComponentFrame(component, label, side = 'front') {
  const landscape = canonicalComponentOrientation(component) === 'landscape';
  return `<iframe class="component-review-frame${landscape ? ' component-review-frame-landscape' : ''}" loading="lazy" src="${esc(canonicalComponentRenderSource(component, side))}" title="${esc(label)} canonical Card Design render"></iframe>`;
}

function componentFace(component, faction, factionLabel, faceLabel = '') {
  if (component.referenceId) return referenceLoadingFace(component, faction, factionLabel, /^reverse$/i.test(faceLabel) ? 'reverse' : 'front');
  if (component.ledger) return capitalLedgerMarkup(currentDisplayVersion);
  if (component.family === 'deed-card') return deedCardMarkup();
  if (component.tracker && !faceLabel) return trackerFace(component, faction, factionLabel);
  return placeholderFace(component, faction, factionLabel, faceLabel);
}

function designStatusText(component) {
  if (component.designStatus === 'placeholder') return 'Placeholder · design pending';
  if (component.designStatus === 'refinement-pending') return 'Initial design · refinement pending';
  if (component.productionStatus === 'export-pending') return 'Final design · export pending';
  return 'Final design';
}

function componentSpecimen(component, faction, factionLabel) {
  const quantity = Number(component.quantity) || 1;
  const quantityText = quantity > 1 ? `×${quantity} physical copies` : component.doubleSided ? '2 faces · 1 physical card' : '1 physical card';
  const designLabel = designStatusText(component);
  const statusText = component.tracker
    ? `${designLabel} · physical 0–${component.tracker.max}`
    : component.referenceId
      ? `${designLabel} · source-driven`
      : component.ledger
        ? `${designLabel} · identical duplex ledger`
        : `${designLabel} · ${quantityText}`;

  if (catalogFilter) {
    const orientationClass = canonicalComponentOrientation(component) === 'landscape' ? ' supplemental-review-landscape' : '';
    if (component.doubleSided) {
      return `<article class="supplemental-review-item supplemental-review-pair${orientationClass}" id="supplemental-${esc(faction)}-${esc(component.id)}" data-contract-component-id="${esc(component.contractId)}">
        <div class="supplemental-item-heading screen-only"><strong>${esc(component.name)}</strong><span>${esc(statusText)}</span></div>
        <div class="supplemental-face-grid">
          <div class="supplemental-face" data-reference-face="front"><p class="supplemental-face-label screen-only"><strong>Front</strong></p>${canonicalComponentFrame(component, `${component.name} front`, 'front')}</div>
          <div class="supplemental-face" data-reference-face="reverse"><p class="supplemental-face-label screen-only"><strong>Reverse</strong></p>${canonicalComponentFrame(component, `${component.name} reverse`, 'reverse')}</div>
        </div>
      </article>`;
    }

    return `<article class="supplemental-review-item${orientationClass}" id="supplemental-${esc(faction)}-${esc(component.id)}" data-contract-component-id="${esc(component.contractId)}">
      <div class="supplemental-item-heading screen-only"><strong>${esc(component.name)}</strong><span>${esc(statusText)}</span></div>
      <div class="supplemental-face-grid supplemental-single-face-grid">
        <div class="supplemental-face">${canonicalComponentFrame(component, component.name)}</div>
      </div>
    </article>`;
  }

  if (component.doubleSided) {
    const faceDescription = component.ledger
      ? 'Identical ledger face'
      : component.referenceId
        ? 'Loading current face'
        : 'Design placeholder';
    return `<article class="supplemental-review-item supplemental-review-pair" id="supplemental-${esc(faction)}-${esc(component.id)}" data-contract-component-id="${esc(component.contractId)}">
      <div class="supplemental-item-heading screen-only"><strong>${esc(component.name)}</strong><span>${esc(statusText)}</span></div>
      <div class="supplemental-face-grid">
        <div class="supplemental-face" data-reference-face="front"><p class="supplemental-face-label screen-only"><strong>Front</strong><span>${esc(faceDescription)}</span></p>${componentFace(component, faction, factionLabel, 'Front')}</div>
        <div class="supplemental-face" data-reference-face="reverse"><p class="supplemental-face-label screen-only"><strong>Reverse</strong><span>${esc(faceDescription)}</span></p>${componentFace(component, faction, factionLabel, 'Reverse')}</div>
      </div>
    </article>`;
  }

  return `<article class="supplemental-review-item" id="supplemental-${esc(faction)}-${esc(component.id)}" data-contract-component-id="${esc(component.contractId)}">
    <div class="supplemental-item-heading screen-only"><strong>${esc(component.name)}</strong><span>${esc(statusText)}</span></div>
    <div class="supplemental-face-grid supplemental-single-face-grid">
      <div class="supplemental-face">${componentFace(component, faction, factionLabel)}</div>
    </div>
  </article>`;
}

function groupMarkup(group) {
  return `<section class="review-faction-block supplemental-faction-block" id="supplemental-${esc(group.faction)}" aria-labelledby="supplemental-${esc(group.faction)}-title">
    <div class="review-faction-heading screen-only">
      <h3 id="supplemental-${esc(group.faction)}-title">${esc(group.factionLabel)}</h3>
      <span>${group.cards.length} component ${group.cards.length === 1 ? 'design' : 'designs'}</span>
    </div>
    <div class="supplemental-review-grid supplemental-faction-grid">
      ${group.cards.map(component => componentSpecimen(component, group.faction, group.factionLabel)).join('')}
    </div>
  </section>`;
}

function renderSupplementalMarkup(metricGroups = supplementalGroups) {
  if (!root) return;
  const uniqueCount = metricGroups.reduce((sum, group) => sum + group.cards.length, 0);
  const physicalCount = metricGroups.reduce((sum, group) => sum + group.cards.reduce((groupSum, component) => groupSum + (Number(component.quantity) || 1), 0), 0);
  root.dataset.supplementalDesignCount = String(uniqueCount);
  root.dataset.supplementalPhysicalCount = String(physicalCount);
  document.querySelectorAll('[data-supplemental-design-count]').forEach(node => { node.textContent = String(uniqueCount); });
  document.querySelectorAll('[data-supplemental-physical-count]').forEach(node => { node.textContent = String(physicalCount); });
  root.innerHTML = supplementalGroups.map(groupMarkup).join('');
}

function markupToElement(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const element = template.content.firstElementChild;
  if (!element) throw new Error('Reference-card renderer returned no element.');
  return element;
}

// card-design.js installs inspection directly on each physical card node. The
// reference faces begin as loading shells, so replacing those nodes during
// async hydration also discarded their click/keyboard inspection listeners.
// Hydrate the existing node in place instead: whether inspection was installed
// before or after hydration, every reference face remains inspectable.
function hydrateReferenceElement(loadingCard, rendered) {
  const inspectionReady = loadingCard.dataset.inspectionReady === 'true';
  loadingCard.className = rendered.className;
  for (const attribute of Array.from(rendered.attributes)) {
    if (attribute.name === 'class') continue;
    loadingCard.setAttribute(attribute.name, attribute.value);
  }
  loadingCard.replaceChildren(...Array.from(rendered.childNodes));
  if (inspectionReady) loadingCard.classList.add('card-inspectable');
  return loadingCard;
}

async function hydrateReferenceCards() {
  if (!root) return;
  const referenceComponents = supplementalGroups.flatMap(group => group.cards.map(component => ({ group, component }))).filter(({ component }) => component.referenceId);
  if (!referenceComponents.length) {
    root.dataset.referenceCardsReady = 'true';
    return;
  }
  const requestedReferenceIds = referenceComponents.map(({ component }) => component.referenceId);
  const records = await loadReferenceRecords(requestedReferenceIds);
  const recordsById = new Map(records.map(record => [record.id, record]));
  const missing = referenceComponents.filter(({ component }) => !recordsById.has(component.referenceId));
  if (missing.length) throw new Error(`Reference-card contract mismatch: ${missing.map(({ component }) => component.referenceId).join(', ')}`);

  for (const { group, component } of referenceComponents) {
    const record = recordsById.get(component.referenceId);
    const specimen = root.querySelector(`#supplemental-${CSS.escape(group.faction)}-${CSS.escape(component.id)}`);
    if (!specimen) throw new Error(`Missing production specimen for ${component.id}.`);

    for (const sideName of ['front', 'reverse']) {
      const faceContainer = specimen.querySelector(`[data-reference-face="${sideName}"]`);
      if (!faceContainer) throw new Error(`Missing ${sideName} face container for ${component.id}.`);
      const loadingCard = faceContainer.querySelector('.reference-card-loading');
      if (!loadingCard) throw new Error(`Missing ${sideName} loading card for ${component.id}.`);
      const rendered = markupToElement(referenceCardMarkup(record, sideName, { version: currentDisplayVersion }));
      rendered.dataset.contractComponentId = component.contractId;
      hydrateReferenceElement(loadingCard, rendered);
      const label = faceContainer.querySelector('.supplemental-face-label span');
      if (label) label.textContent = record.faces[sideName].title;
    }
  }

  await new Promise(resolve => requestAnimationFrame(resolve));
  if (document.fonts?.ready) await document.fonts.ready;
  const failures = [];
  for (const card of root.querySelectorAll('.reference-card[data-reference-side]:not(.reference-card-loading)')) {
    const result = fitReferenceCard(card);
    if (result.overflow) failures.push(card);
  }
  if (failures.length) {
    throw new Error(`Reference-card text cannot fit at the readability floor: ${failures.map(card => `${card.dataset.componentId}/${card.dataset.referenceSide}`).join(', ')}`);
  }
  root.dataset.referenceCardsReady = 'true';
}

async function renderCurrentSupplementals() {
  if (!root) return;
  if (catalogFilter && !catalogFilter.typeMatches('supplemental', 'tracker', 'reference', 'ledger', 'deed')) {
    root.replaceChildren();
    return;
  }
  try {
    const currentGame = await loadRenderGame();
    currentDisplayVersion = currentGame.displayVersion;
    const allGroups = buildSupplementalGroups(currentGame);
    supplementalGroups = filterSupplementalGroups(allGroups);
    root.dataset.currentGameAuthority = currentGame.authorityUrl;
    renderSupplementalMarkup(allGroups);
    if (catalogFilter) {
      // The developer catalog consumes the same canonical component frames as
      // Deckbuilder and TTS. Direct tracker/reference fitting stays inside each
      // component-render iframe and cannot diverge in the outer catalog.
      root.dataset.referenceCardsReady = 'true';
      root.dataset.trackerLayoutsReady = 'true';
      return;
    }
    await layoutTrackerCards();
    await hydrateReferenceCards();
  } catch (error) {
    console.error(error);
    root.dataset.referenceCardsReady = 'error';
    root.innerHTML = `<pre class="supplemental-render-error">${esc(error?.stack || error?.message || String(error))}</pre>`;
  }
}

await renderCurrentSupplementals();