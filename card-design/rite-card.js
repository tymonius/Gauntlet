const RITE_SOURCE = '/artifacts/reconstruction/clean-v0.6.3/faction-guides/mystics/Gauntlet_v0.6.3_Mystics_Faction_Guide.md';
const RITE_ART_ROOT = '../images/artwork/cards/mystics/rites-and-rituals';
const COMPLETED_RITE_ART_SOURCE = '../images/artwork/supplemental/mystics/rite-completed.webp';

const RITES = Object.freeze([
  {
    id: 'echoes',
    name: 'Rite of Echoes',
    artwork: `${RITE_ART_ROOT}/rite-of-echoes.png`,
    begin: 'Bind one chosen card from your Graveyard face up beneath this Rite. Then bind one card from your Hand face down beneath it whose title matches at least one other card in your Deck.',
    complete: "On a later turn, complete this Rite after the Gambit, Tactic, or Gambit or Tactic effect of another card with the bound Hand card's title is applied during a battle.",
    interrupted: 'If you lose a battle before completion, put both bound cards in your Graveyard and reset the Rite.',
  },
  {
    id: 'blood',
    name: 'Rite of Blood',
    artwork: `${RITE_ART_ROOT}/rite-of-blood.png`,
    begin: 'Put one card from your Hand in your Graveyard.',
    complete: 'On a later turn, complete this Rite when you win a battle without setting a Gambit or choosing a Tactic. Using Transmutation, an Asset, Overlay, Territory, Leader ability, or card from another source does not by itself prevent completion.',
    interrupted: 'If you lose a battle before completion, reset the Rite.',
  },
  {
    id: 'crossing',
    name: 'Rite of Crossing',
    artwork: `${RITE_ART_ROOT}/rite-of-crossing.png`,
    begin: 'You may take the Begin a Rite Faction Action for Rite of Crossing during Denouement only after winning a battle that turn that made you the occupier of a Territory the opponent controlled immediately before that battle. Put one Arcane card from your Hand in your Graveyard. If you have none, reveal your Hand and move one Arcane card from your Discard Pile to your Graveyard instead.',
    complete: 'At the start of your next turn, after the Capture step, complete this Rite if you are still the occupier or now control that Territory. Otherwise, the Rite is interrupted and resets.',
    interrupted: '',
  },
]);

const UNLOCKS = Object.freeze([
  {
    count: '1 Rite',
    name: 'Invocation',
    text: 'Once per turn, after applying the Action, Gambit, Tactic, or Gambit or Tactic effect of an Arcane card you played, set, or chose, you may move one card from your Graveyard to your Discard Pile.',
  },
  {
    count: '2 Rites',
    name: 'Transmutation',
    text: 'Once per turn, before dice are rolled in a battle involving you, you may put one card from your Hand in your Graveyard. Add its value to your battle total.',
  },
  {
    count: '3 Rites',
    name: 'Convergence',
    text: 'While the Ritual is underway, during a battle you initiated, add +1 to your battle total for each card bound to the Ritual.',
  },
  {
    count: 'Ritual',
    name: 'Ritual of Ascendance',
    text: 'After completing all three Rites, during Denouement, spend 1 Action to bind one Arcane card from your Hand, one from your Discard Pile, and one from your Graveyard. Initiate a battle while all three remain bound. If you win that battle, complete the Ritual and immediately win the game.',
  },
]);

const root = document.querySelector('#riteReviewSections');

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

function riteTypeLabel() {
  return '<div class="rite-type-line"><span class="rite-faction-emblem" aria-hidden="true"></span><span>Rite</span></div>';
}

function ruleSection(label, text) {
  if (!text) return '';
  return `<section class="rule-section"><h4>${esc(label)}</h4><p>${esc(text)}</p></section>`;
}

function unlockSection(unlock) {
  return `<section class="rite-unlock-section"><h4>${esc(unlock.count)}</h4><p><strong>${esc(unlock.name)}</strong> ${esc(unlock.text)}</p></section>`;
}

function incompleteArtwork(rite) {
  return `<figure class="card-art has-image" aria-label="Artwork for ${esc(rite.name)}">
    <img src="${esc(rite.artwork)}" alt="Artwork for ${esc(rite.name)}" />
  </figure>`;
}

function completedArtwork(rite) {
  return `<figure class="card-art rite-completed-panel has-image" aria-label="Completed ${esc(rite.name)}">
    <img src="${COMPLETED_RITE_ART_SOURCE}" alt="Parchment marked Completed in deep purple ink with blood, beeswax, and ash traces" />
  </figure>`;
}

function riteFace(rite, completed = false) {
  const type = completed ? 'Completed Rite' : 'Rite';
  const rules = completed
    ? UNLOCKS.map(unlockSection).join('')
    : `${ruleSection('Begin', rite.begin)}${ruleSection('Complete', rite.complete)}${ruleSection('Interrupted', rite.interrupted)}`;
  const art = completed ? completedArtwork(rite) : incompleteArtwork(rite);
  // Completed faces have enough room after the dynamic rule-column pass to use
  // a taller illustration. Keep a finite cap, but let the shared fitter shrink
  // from that cap so otherwise-empty spacer height becomes artwork instead.
  const artMax = completed ? '1.24' : '1.48';
  const artMin = completed ? '0.78' : '0.92';
  const dense = completed || rite.id === 'crossing' || rite.id === 'echoes' ? ' dense-card' : '';

  return `<article class="gauntlet-card faction-component-card rite-card mystic-card${dense}${completed ? ' completed-rite-card' : ''}" data-faction="mystics" data-art-max="${artMax}" data-art-min="${artMin}" data-title-min="9" aria-label="${esc(rite.name)} ${esc(type)} card" data-rite-source="${RITE_SOURCE}">
    <div class="card-interior">
      <header class="card-heading">
        <h3 class="card-title">${esc(rite.name)}</h3>
        ${riteTypeLabel()}
      </header>
      ${art}
      <div class="card-rules">${rules}</div>
      <footer class="card-footer"><span>Mystics</span><span>${esc(type)}</span><span>v0.6.3</span></footer>
    </div>
  </article>`;
}

function reviewPair(rite) {
  return `<section class="rite-review-pair" id="rite-${esc(rite.id)}" aria-labelledby="rite-${esc(rite.id)}-title">
    <div class="review-faction-heading screen-only">
      <h3 id="rite-${esc(rite.id)}-title">${esc(rite.name)}</h3>
      <span>Double-sided Rite</span>
    </div>
    <div class="rite-face-grid">
      <div class="rite-face">
        <p class="rite-face-label screen-only"><strong>Rite</strong><span>Incomplete face</span></p>
        ${riteFace(rite, false)}
      </div>
      <div class="rite-face">
        <p class="rite-face-label screen-only"><strong>Completed</strong><span>Progression reference</span></p>
        ${riteFace(rite, true)}
      </div>
    </div>
  </section>`;
}

function renderRites() {
  if (!root) return;
  root.dataset.riteCount = String(RITES.length);
  document.querySelectorAll('[data-rite-count]').forEach(node => {
    node.textContent = String(RITES.length);
  });
  root.innerHTML = `<div class="rite-review-block">${RITES.map(reviewPair).join('')}</div>`;
}

renderRites();
