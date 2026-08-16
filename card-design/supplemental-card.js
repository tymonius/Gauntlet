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
        name: 'Diplomat Reference',
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
        name: 'Financier Reference',
        type: 'Reference card',
        detail: 'Summarizes the Capital limit, Deed costs, Play the Market, Subsidize, and Controlling Interest.',
        quantity: 1,
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
        name: 'Mission Reference',
        type: 'Reference card',
        detail: 'Required reference for starting, completing, aborting, and failing normal Missions.',
        quantity: 1,
      },
      {
        id: 'operations-reference',
        name: 'Operations Reference',
        type: 'Reference card',
        detail: 'Required reference for Operation Progress and Special Operation readiness and completion.',
        quantity: 1,
      },
      {
        id: 'intel-tracker',
        name: 'Intel Tracker',
        type: 'Sliding tracker card',
        detail: 'Provides a practical 0–20 physical tracking scale for uncapped Intel beneath the Operations Reference Card.',
        quantity: 1,
        tracker: { max: 20, cover: 'Operations Reference', scaleHeight: 2.40, labelSize: 5.65 },
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
        name: 'Mystics Reference',
        type: 'Reference card',
        detail: 'Summarizes Rite progression, Invocation, Transmutation, Convergence, Ritual, and bound-card rules.',
        quantity: 1,
      },
    ],
  },
  {
    faction: 'inquisition',
    factionLabel: 'Inquisition',
    cards: [
      {
        id: 'doctrine-reference',
        name: 'Inquisition Doctrine Reference',
        type: 'Reference card',
        detail: 'Summarizes Conviction, Condemnation, Blasphemy, and Purification.',
        quantity: 1,
      },
      {
        id: 'purge-reference',
        name: 'Purge Reference',
        type: 'Reference card',
        detail: 'Carries the complete Purge menu and Final Judgment reminder.',
        quantity: 1,
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
  return `<article class="gauntlet-card faction-component-card sliding-tracker-card ${esc(faction)}-card" data-faction="${esc(faction)}" aria-label="${esc(component.name)} sliding tracker, physical scale 0 through ${max}">
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

function componentFace(component, faction, factionLabel, faceLabel = '') {
  if (component.tracker && !faceLabel) return trackerFace(component, faction, factionLabel);
  return placeholderFace(component, faction, factionLabel, faceLabel);
}

function componentSpecimen(component, faction, factionLabel) {
  const quantity = Number(component.quantity) || 1;
  const quantityText = quantity > 1 ? `×${quantity} physical copies` : component.doubleSided ? '2 faces · 1 physical card' : '1 physical card';
  const statusText = component.tracker ? `Designed · physical 0–${component.tracker.max}` : quantityText;

  if (component.doubleSided) {
    return `<section class="supplemental-review-item supplemental-review-pair" id="supplemental-${esc(faction)}-${esc(component.id)}">
      <div class="supplemental-item-heading screen-only"><strong>${esc(component.name)}</strong><span>${esc(quantityText)}</span></div>
      <div class="supplemental-face-grid">
        <div class="supplemental-face"><p class="supplemental-face-label screen-only"><strong>Front</strong><span>Design pending</span></p>${componentFace(component, faction, factionLabel, 'Front')}</div>
        <div class="supplemental-face"><p class="supplemental-face-label screen-only"><strong>Reverse</strong><span>Design pending</span></p>${componentFace(component, faction, factionLabel, 'Reverse')}</div>
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

function renderSupplementalCatalog() {
  if (!root) return;
  const uniqueCount = SUPPLEMENTAL_COMPONENTS.reduce((sum, group) => sum + group.cards.length, 0);
  const physicalCount = SUPPLEMENTAL_COMPONENTS.reduce((sum, group) => sum + group.cards.reduce((groupSum, component) => groupSum + (Number(component.quantity) || 1), 0), 0);
  root.dataset.supplementalDesignCount = String(uniqueCount);
  root.dataset.supplementalPhysicalCount = String(physicalCount);
  document.querySelectorAll('[data-supplemental-design-count]').forEach(node => { node.textContent = String(uniqueCount); });
  document.querySelectorAll('[data-supplemental-physical-count]').forEach(node => { node.textContent = String(physicalCount); });
  root.innerHTML = SUPPLEMENTAL_COMPONENTS.map(groupMarkup).join('');
}

renderSupplementalCatalog();

if (document.readyState === 'complete') window.dispatchEvent(new Event('load'));
