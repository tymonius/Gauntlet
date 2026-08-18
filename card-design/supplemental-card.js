import {
  fitAllReferenceCards,
  loadReferenceRecords,
  referenceCardMarkup,
} from './reference-card.js';

const SUPPLEMENTAL_COMPONENTS = Object.freeze([
  {
    faction: 'military',
    factionLabel: 'Military',
    cards: [
      {
        id: 'command-tracker',
        name: 'Command Tracker',
        type: 'Sliding tracker card',
        detail: 'Tracks Command beneath the selected Military Leader Card. The printed scale includes headroom beyond the current v0.6.3 maximum of 2 for durable future effects.',
        quantity: 1,
        tracker: { max: 4, cover: 'Leader Card', scaleHeight: 1.18, labelSize: 11.2 },
      },
    ],
  },
  {
    faction: 'diplomats',
    factionLabel: 'Diplomats',
    cards: [
      {
        id: 'influence-tracker',
        name: 'Influence Tracker',
        type: 'Sliding tracker card',
        detail: 'Tracks 0–10 Influence beneath the selected Diplomat Leader Card.',
        quantity: 1,
        tracker: { max: 10, cover: 'Leader Card', scaleHeight: 2.08, labelSize: 7.9 },
      },
      {
        id: 'diplomat-reference',
        referenceId: 'diplomats-reference',
        name: 'Diplomat Reference Card',
        type: 'Double-sided reference card',
        detail: 'Summarizes Terms resolution, Influence, Leverage, and Treaty Articles.',
        quantity: 1,
        doubleSided: true,
      },
    ],
  },
  {
    faction: 'financiers',
    factionLabel: 'Financiers',
    cards: [
      {
        id: 'financier-reference',
        referenceId: 'financiers-reference',
        name: 'Financier Reference Card',
        type: 'Double-sided reference card',
        detail: 'Summarizes Capital, Financial Capacity, Deeds, Play the Market, Subsidize, and Controlling Interest.',
        quantity: 1,
        doubleSided: true,
      },
      {
        id: 'deed',
        name: 'Deed',
        type: 'Shared full-size card',
        detail: 'Eight identical cards form the shared unowned Deed supply. Each Territory currently in the Gauntlet has one Deed.',
        quantity: 8,
      },
    ],
  },
  {
    faction: 'intelligence',
    factionLabel: 'Intelligence',
    cards: [
      {
        id: 'mission-reference',
        referenceId: 'intelligence-mission-reference',
        name: 'Mission Reference Card',
        type: 'Double-sided reference card',
        detail: 'Required reference for Missions, Operation Progress, and Special Operations.',
        quantity: 1,
        doubleSided: true,
      },
      {
        id: 'operations-reference',
        referenceId: 'intelligence-operations-reference',
        name: 'Operations Reference Card',
        type: 'Double-sided reference card',
        detail: 'Required reference for Surveillance, Interference, and Intelligence mirrors.',
        quantity: 1,
        doubleSided: true,
      },
      {
        id: 'intel-tracker',
        name: 'Intel Tracker',
        type: 'Sliding tracker card',
        detail: 'Provides a practical 0–12 physical tracking scale for uncapped Intel beneath the Operations Reference Card.',
        quantity: 1,
        tracker: { max: 12, cover: 'Operations Reference', scaleHeight: 2.08, labelSize: 7.2 },
      },
      {
        id: 'operation-progress-tracker',
        name: 'Operation Progress Tracker',
        type: 'Sliding tracker card',
        detail: 'Provides a practical 0–8 physical tracking scale for uncapped Operation Progress beneath the Mission Reference Card.',
        quantity: 1,
        tracker: { max: 8, cover: 'Mission Reference', scaleHeight: 1.84, labelSize: 6.8 },
      },
    ],
  },
  {
    faction: 'mystics',
    factionLabel: 'Mystics',
    cards: [
      {
        id: 'mystics-reference',
        referenceId: 'mystics-reference',
        name: 'Mystics Reference Card',
        type: 'Double-sided reference card',
        detail: 'Summarizes Rite progression, Invocation, Transmutation, Convergence, Ritual, and bound-card rules.',
        quantity: 1,
        doubleSided: true,
      },
    ],
  },
  {
    faction: 'inquisition',
    factionLabel: 'Inquisition',
    cards: [
      {
        id: 'doctrine-reference',
        referenceId: 'inquisition-doctrine-reference',
        name: 'Inquisition Doctrine Reference Card',
        type: 'Double-sided reference card',
        detail: 'Summarizes Conviction, Condemnation, Blasphemy, and Purification.',
        quantity: 1,
        doubleSided: true,
      },
      {
        id: 'purge-reference',
        referenceId: 'inquisition-purge-reference',
        name: 'Purge Reference Card',
        type: 'Double-sided reference card',
        detail: 'Carries the complete Purge menu, Purge timing, and Final Judgment reminder.',
        quantity: 1,
        doubleSided: true,
      },
      {
        id: 'conviction-tracker',
        name: 'Conviction Tracker',
        type: 'Sliding tracker card',
        detail: 'Tracks 0–4 Conviction beneath the selected Inquisition Leader Card.',
        quantity: 1,
        tracker: { max: 4, cover: 'Leader Card', scaleHeight: 1.18, labelSize: 10.4 },
      },
    ],
  },
]);

const root = document.querySelector('#supplementalReviewSections');
let referenceRecords = new Map();

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
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

function trackerFace(component, faction, factionLabel) {
  const { max, cover, scaleHeight, labelSize } = component.tracker;
  const resourceName = component.name.replace(/\s+Tracker$/, '');
  return `<article class="gauntlet-card faction-component-card sliding-tracker-card ${esc(faction)}-card" data-faction="${esc(faction)}" data-component-id="${esc(component.id)}" aria-label="${esc(component.name)} sliding tracker, physical scale 0 through ${max}">
    <div class="card-interior tracker-interior">
      <span class="tracker-watermark" aria-hidden="true"></span>
      <header class="tracker-heading">
        <span class="tracker-faction-emblem" aria-hidden="true"></span>
        <span class="tracker-faction-name">${esc(factionLabel)}</span>
        <h3>${esc(resourceName)}</h3>
        <p>Physical scale · 0–${max}</p>
      </header>
      <div class="tracker-scale" style="--tracker-scale-height:${Number(scaleHeight)}in;--tracker-max:${max};--tracker-label-size:${Number(labelSize)}pt" aria-label="Registration bands 1 through ${max}">
        ${trackerMarks(component, resourceName)}
      </div>
      <div class="tracker-instructions">
        <strong>0 = fully covered</strong>
        <span>Place ${esc(cover)} over this card. Slide it upward until its bottom edge aligns with the line above the current value.</span>
      </div>
      <footer class="card-footer tracker-footer"><span>${esc(factionLabel)}</span><span>Tracker</span><span>v0.6.3</span></footer>
    </div>
  </article>`;
}

function placeholderFace(component, faction, factionLabel, faceLabel = '') {
  const quantity = Number(component.quantity) || 1;
  const quantityText = quantity > 1 ? ` · ×${quantity} required` : '';
  const faceText = faceLabel ? ` · ${faceLabel}` : '';
  return `<article class="gauntlet-card faction-component-card supplemental-placeholder-card ${esc(faction)}-card" data-faction="${esc(faction)}" data-art-max="1.52" data-art-min="1.18" data-title-min="8.5" aria-label="${esc(component.name)} ${esc(component.type)}${esc(faceText)}">
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
      <footer class="card-footer"><span>${esc(factionLabel)}</span><span>${esc(component.type)}${esc(quantityText)}</span><span>v0.6.3</span></footer>
    </div>
  </article>`;
}

function referenceLoadingFace(component, faction, factionLabel, faceLabel) {
  return `<article class="gauntlet-card faction-component-card reference-card reference-card-loading" data-faction="${esc(faction)}" data-component-id="${esc(component.referenceId)}" data-reference-side="${esc(faceLabel.toLowerCase())}" aria-label="${esc(component.name)} ${esc(faceLabel)} loading canonical rules">
    <div class="reference-card-interior">
      <span class="reference-watermark" aria-hidden="true"></span>
      <header class="reference-card-header">
        <div class="reference-kicker"><span class="reference-faction-emblem" aria-hidden="true"></span><span>${esc(factionLabel)} Reference</span></div>
        <h3 class="reference-face-title">Loading reference…</h3>
        <p class="reference-component-name">${esc(component.name)}</p>
      </header>
      <div class="reference-body"><section class="reference-section"><h4 class="reference-section-title">Canonical source</h4><div class="reference-blocks"><p>Loading current faction-guide rules.</p></div></section></div>
      <footer class="reference-card-footer"><span>${esc(factionLabel)}</span><strong>Reference · Not a Deck Card</strong><span>v0.6.3</span></footer>
    </div>
  </article>`;
}

function componentFace(component, faction, factionLabel, faceLabel = '') {
  if (component.referenceId) {
    const record = referenceRecords.get(component.referenceId);
    if (!record) return referenceLoadingFace(component, faction, factionLabel, faceLabel || 'Front');
    return referenceCardMarkup(record, /^reverse$/i.test(faceLabel) ? 'reverse' : 'front');
  }
  if (component.tracker && !faceLabel) return trackerFace(component, faction, factionLabel);
  return placeholderFace(component, faction, factionLabel, faceLabel);
}

function componentSpecimen(component, faction, factionLabel) {
  const quantity = Number(component.quantity) || 1;
  const quantityText = quantity > 1 ? `×${quantity} physical copies` : component.doubleSided ? '2 faces · 1 physical card' : '1 physical card';
  const statusText = component.tracker ? `Designed · physical 0–${component.tracker.max}` : component.referenceId ? 'Designed · source-driven' : quantityText;

  if (component.doubleSided) {
    const record = component.referenceId ? referenceRecords.get(component.referenceId) : null;
    const frontStatus = record?.faces?.front?.title || 'Loading canonical face';
    const reverseStatus = record?.faces?.reverse?.title || 'Loading canonical face';
    return `<section class="supplemental-review-item supplemental-review-pair" id="supplemental-${esc(faction)}-${esc(component.id)}">
      <div class="supplemental-item-heading screen-only"><strong>${esc(component.name)}</strong><span>${esc(statusText)}</span></div>
      <div class="supplemental-face-grid">
        <div class="supplemental-face"><p class="supplemental-face-label screen-only"><strong>Front</strong><span>${esc(frontStatus)}</span></p>${componentFace(component, faction, factionLabel, 'Front')}</div>
        <div class="supplemental-face"><p class="supplemental-face-label screen-only"><strong>Reverse</strong><span>${esc(reverseStatus)}</span></p>${componentFace(component, faction, factionLabel, 'Reverse')}</div>
      </div>
    </section>`;
  }

  return `<section class="supplemental-review-item" id="supplemental-${esc(faction)}-${esc(component.id)}">
    <div class="supplemental-item-heading screen-only"><strong>${esc(component.name)}</strong><span>${esc(statusText)}</span></div>
    <div class="supplemental-face-grid supplemental-single-face-grid">
      <div class="supplemental-face">${componentFace(component, faction, factionLabel)}</div>
    </div>
  </section>`;
}

function groupMarkup(group) {
  return `<section class="review-faction-block supplemental-faction-block" id="supplemental-${esc(group.faction)}" aria-labelledby="supplemental-${esc(group.faction)}-title">
    <div class="review-faction-heading screen-only">
      <h3 id="supplemental-${esc(group.faction)}-title">${esc(group.factionLabel)}</h3>
      <span>${group.cards.length} design ${group.cards.length === 1 ? 'slot' : 'slots'}</span>
    </div>
    <div class="supplemental-review-grid">${group.cards.map(component => componentSpecimen(component, group.faction, group.factionLabel)).join('')}</div>
  </section>`;
}

function renderSupplementalMarkup() {
  if (!root) return;
  const uniqueCount = SUPPLEMENTAL_COMPONENTS.reduce((sum, group) => sum + group.cards.length, 0);
  const physicalCount = SUPPLEMENTAL_COMPONENTS.reduce((sum, group) => sum + group.cards.reduce((groupSum, component) => groupSum + (Number(component.quantity) || 1), 0), 0);
  root.dataset.supplementalDesignCount = String(uniqueCount);
  root.dataset.supplementalPhysicalCount = String(physicalCount);
  document.querySelectorAll('[data-supplemental-design-count]').forEach(node => { node.textContent = String(uniqueCount); });
  document.querySelectorAll('[data-supplemental-physical-count]').forEach(node => { node.textContent = String(physicalCount); });
  root.innerHTML = SUPPLEMENTAL_COMPONENTS.map(groupMarkup).join('');
}

async function renderSupplementalCatalog() {
  if (!root) return;

  // Trackers and unresolved design slots must remain synchronously available to
  // production capture even while source-driven reference content is loading.
  renderSupplementalMarkup();

  const records = await loadReferenceRecords();
  referenceRecords = new Map(records.map(record => [record.id, record]));
  const expectedReferences = SUPPLEMENTAL_COMPONENTS.flatMap(group => group.cards).filter(component => component.referenceId);
  const missingReferences = expectedReferences.filter(component => !referenceRecords.has(component.referenceId));
  if (missingReferences.length) {
    throw new Error(`Reference-card contract mismatch: ${missingReferences.map(component => component.referenceId).join(', ')}`);
  }

  renderSupplementalMarkup();
  await new Promise(resolve => requestAnimationFrame(resolve));
  if (document.fonts?.ready) await document.fonts.ready;
  const fitResults = fitAllReferenceCards(root);
  const failures = fitResults.filter(result => result.overflow);
  if (failures.length) {
    throw new Error(`Reference-card text cannot fit at the readability floor: ${failures.map(({ card }) => `${card.dataset.componentId}/${card.dataset.referenceSide}`).join(', ')}`);
  }
  root.dataset.referenceCardsReady = 'true';
}

renderSupplementalCatalog()
  .then(() => {
    if (document.readyState === 'complete') window.dispatchEvent(new Event('load'));
  })
  .catch(error => {
    console.error(error);
    root.dataset.referenceCardsReady = 'error';
    root.insertAdjacentHTML('afterbegin', `<pre class="supplemental-render-error">${esc(error?.stack || error?.message || String(error))}</pre>`);
  });
