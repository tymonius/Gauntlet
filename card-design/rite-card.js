import { loadCurrentGame } from '../game-data/current-game.mjs';

let RITES = [];
let RITUAL = {};
let UNLOCKS = [];
let COMPLETED_RITE_ART_SOURCE = '/images/artwork/supplemental/mystics/rite-completed.webp';
let currentDisplayVersion = 'Current';

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

function riteTypeLabel(label = 'Rite') {
  return `<div class="rite-type-line"><span class="rite-faction-emblem" aria-hidden="true"></span><span>${esc(label)}</span></div>`;
}

function ruleSection(label, text) {
  if (!text) return '';
  return `<section class="rule-section"><h4>${esc(label)}</h4><p>${esc(text)}</p></section>`;
}

function unlockSection(unlock) {
  if (unlock.headerLines?.length) {
    const header = unlock.headerLines.map(line => `<span>${esc(line)}</span>`).join(' ');
    return `<section class="rite-unlock-section rite-unlock-section--ritual"><h4><strong class="rite-unlock-ritual-heading">${header}</strong></h4><p>${esc(unlock.text)}</p></section>`;
  }
  return `<section class="rite-unlock-section"><h4>${esc(unlock.count)}</h4><p><strong>${esc(unlock.name)}</strong> ${esc(unlock.text)}</p></section>`;
}

function incompleteArtwork(rite) {
  if (!rite.artwork) {
    return `<figure class="card-art" aria-label="Artwork pending for ${esc(rite.name)}">
      <span>Artwork pending</span>
    </figure>`;
  }
  return `<figure class="card-art has-image" aria-label="Artwork for ${esc(rite.name)}">
    <img src="${esc(rite.artwork)}" alt="Artwork for ${esc(rite.name)}" />
  </figure>`;
}

function completedArtwork(rite) {
  return `<figure class="card-art rite-completed-panel has-image" aria-label="Completed ${esc(rite.name)}">
    <img src="${esc(COMPLETED_RITE_ART_SOURCE)}" alt="Parchment marked Completed in deep purple ink with blood, beeswax, and ash traces" />
  </figure>`;
}

function ritualArtwork() {
  return `<figure class="card-art has-image" aria-label="Artwork for ${esc(RITUAL.name)}">
    <img src="${esc(RITUAL.artwork)}" alt="Artwork for ${esc(RITUAL.name)}" />
  </figure>`;
}

function ritualCardBack() {
  return `<article class="gauntlet-card ritual-card-back mystic-card" data-faction="mystics" aria-label="${esc(RITUAL.name)} card back">
    <div class="ritual-card-back__image-window">
      <img src="${esc(RITUAL.cardBack)}" alt="Ritual working sheet drawn in deep purple ink, with mystical symbols surrounded by alchemical notes, diagrams, and formulas" />
    </div>
  </article>`;
}

function riteFace(rite, completed = false) {
  const type = completed ? 'Completed Rite' : 'Rite';
  const rules = completed
    ? UNLOCKS.map(unlockSection).join('')
    : `${ruleSection('Begin', rite.begin)}${ruleSection('Complete', rite.complete)}${rite.reminder?.text ? `<p class="rite-reminder"><em>${esc(rite.reminder.text)}</em></p>` : ''}${ruleSection('Interrupted', rite.interrupted)}`;
  const art = completed ? completedArtwork(rite) : incompleteArtwork(rite);
  const hasReminder = Boolean(!completed && rite.reminder?.text);
  const artMax = completed ? '1.24' : hasReminder ? '1.34' : '1.48';
  const artMin = completed ? '0.78' : hasReminder ? '0.72' : '0.92';
  const dense = completed || hasReminder || rite.id === 'crossing' || rite.id === 'echoes' ? ' dense-card' : '';

  return `<article class="gauntlet-card faction-component-card rite-card mystic-card${dense}${completed ? ' completed-rite-card' : ''}" data-faction="mystics" data-art-max="${artMax}" data-art-min="${artMin}" data-title-min="9"${hasReminder ? ' data-has-reminder="true"' : ''} aria-label="${esc(rite.name)} ${esc(type)} card" data-current-game-authority="/game-data/current-game.json">
    <div class="card-interior">
      <header class="card-heading">
        <h3 class="card-title">${esc(rite.name)}</h3>
        ${riteTypeLabel()}
      </header>
      ${art}
      <div class="card-rules">${rules}</div>
      <footer class="card-footer"><span>Mystics</span><span>${esc(type)}</span><span>${esc(currentDisplayVersion)}</span></footer>
    </div>
  </article>`;
}

function ritualFace() {
  const rules = [
    ruleSection('Begin', RITUAL.begin),
    ruleSection('Convergence', RITUAL.convergence),
    ruleSection('Complete', RITUAL.complete),
    ruleSection('Interrupted', RITUAL.interrupted),
  ].join('');

  return `<article class="gauntlet-card faction-component-card rite-card ritual-card mystic-card dense-card" data-faction="mystics" data-art-max="1.16" data-art-min="0.64" data-title-min="8.5" data-card-back="ritual-ascension" data-current-game-authority="/game-data/current-game.json" aria-label="${esc(RITUAL.name)} Ritual card">
    <div class="card-interior">
      <header class="card-heading">
        <h3 class="card-title">${esc(RITUAL.name)}</h3>
        ${riteTypeLabel('Ritual')}
      </header>
      ${ritualArtwork()}
      <div class="card-rules">${rules}</div>
      <footer class="card-footer"><span>Mystics</span><span>Ritual</span><span>${esc(currentDisplayVersion)}</span></footer>
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

function ritualReview() {
  return `<section class="rite-review-pair ritual-review" id="ritual-ascension" aria-labelledby="ritual-ascension-title">
    <div class="review-faction-heading screen-only">
      <h3 id="ritual-ascension-title">${esc(RITUAL.name)}</h3>
      <span>Single-sided Ritual · dedicated card back</span>
    </div>
    <div class="rite-face-grid ritual-face-grid">
      <div class="rite-face">
        <p class="rite-face-label screen-only"><strong>Ritual</strong><span>Victory card</span></p>
        ${ritualFace()}
      </div>
      <div class="rite-face">
        <p class="rite-face-label screen-only"><strong>Back</strong><span>Ritual working sheet</span></p>
        ${ritualCardBack()}
      </div>
    </div>
  </section>`;
}

async function renderRites() {
  if (!root) return;
  try {
    const currentGame = await loadCurrentGame();
    const mystics = currentGame.mystics || {};
    RITES = Array.isArray(mystics.rites) ? mystics.rites : [];
    RITUAL = mystics.ritual || {};
    UNLOCKS = Array.isArray(mystics.unlocks) ? mystics.unlocks : [];
    COMPLETED_RITE_ART_SOURCE = mystics.completedArtwork || COMPLETED_RITE_ART_SOURCE;
    currentDisplayVersion = currentGame.displayVersion;
    if (!RITES.length || !RITUAL.id || !UNLOCKS.length) throw new Error('Current-game authority has incomplete Mystics Rite/Ritual data.');

    root.dataset.riteCount = String(RITES.length);
    root.dataset.ritualCount = '1';
    root.dataset.currentGameAuthority = currentGame.authorityUrl;
    document.querySelectorAll('[data-rite-count]').forEach(node => {
      node.textContent = String(RITES.length);
    });
    document.querySelectorAll('[data-ritual-count]').forEach(node => {
      node.textContent = '1';
    });
    root.innerHTML = `<div class="rite-review-block">${RITES.map(reviewPair).join('')}${ritualReview()}</div>`;
  } catch (error) {
    root.innerHTML = `<p class="review-note">Unable to load current Rite set: ${esc(error.message)}</p>`;
    console.error(error);
  }
}

await renderRites();

if (document.readyState === 'complete') window.dispatchEvent(new Event('load'));
