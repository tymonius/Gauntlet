const FACTIONS = Object.freeze([
  'military',
  'diplomats',
  'financiers',
  'intelligence',
  'mystics',
  'inquisition',
]);

const PATTERN_ROWS = 36;
const PATTERN_COLUMNS = 36;
const ROW_SEQUENCE = Object.freeze([0, 3, 1, 4, 2, 5, 2, 4, 0, 5, 1, 3]);

function patternMarkup() {
  return Array.from({ length: PATTERN_ROWS }, (_, rowIndex) => {
    const offset = ROW_SEQUENCE[rowIndex % ROW_SEQUENCE.length];
    const symbols = Array.from(
      { length: PATTERN_COLUMNS },
      (_, index) => FACTIONS[(index + offset) % FACTIONS.length],
    );
    return `<div class="gauntlet-card-back__pattern-row">${symbols
      .map((faction) => `<span class="gauntlet-card-back__symbol ${faction}"></span>`)
      .join('')}</div>`;
  }).join('');
}

export function renderCardBack(element) {
  if (!(element instanceof HTMLElement)) return;
  element.classList.add('gauntlet-card-back');
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', 'Universal Gauntlet playable-card back');
  element.innerHTML = `
    <div class="gauntlet-card-back__pattern-window" aria-hidden="true">
      <div class="gauntlet-card-back__pattern">${patternMarkup()}</div>
    </div>
    <div class="gauntlet-card-back__frame" aria-hidden="true"></div>
    <div class="gauntlet-card-back__wordmark" aria-hidden="true"></div>
  `;
}

function initializeCardBackSpecimens() {
  document.querySelectorAll('[data-gauntlet-card-back]').forEach(renderCardBack);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCardBackSpecimens, { once: true });
} else {
  initializeCardBackSpecimens();
}
