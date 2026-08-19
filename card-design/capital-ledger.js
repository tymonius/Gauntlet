// Financiers Capital Ledger renderer.
// This component intentionally renders the same face on both sides for duplex use.

import { loadCurrentGame } from '../game-data/current-game.mjs';

const root = document.querySelector('#capitalLedgerReview');

function esc(value) {
  return String(value ?? '').replace(/[&<>'\"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '\"': '&quot;',
  })[character]);
}

function ledgerRows(count = 10) {
  return Array.from({ length: count }, () => `
    <div class="capital-ledger-row capital-ledger-row--blank" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>`).join('');
}

export function capitalLedgerMarkup(version = 'Current') {
  return `<article class="gauntlet-card faction-component-card reference-card capital-ledger-card" data-faction="financiers" data-component-id="financiers-capital-ledger" aria-label="Financiers Capital Ledger">
    <div class="reference-card-interior capital-ledger-interior">
      <header class="reference-card-header capital-ledger-header">
        <div class="capital-ledger-faction-line"><span class="reference-faction-emblem" aria-hidden="true"></span><span>Financiers</span></div>
        <h3 class="reference-face-title">Capital Ledger</h3>
        <div class="capital-ledger-subtitle">Public Capital Record</div>
      </header>

      <div class="reference-body capital-ledger-body">
        <div class="capital-ledger-grid" role="table" aria-label="Capital transaction ledger">
          <div class="capital-ledger-row capital-ledger-row--head" role="row">
            <span role="columnheader">Entry</span>
            <span role="columnheader">±</span>
            <span role="columnheader">Balance</span>
          </div>
          <div class="capital-ledger-row capital-ledger-row--example" role="row" aria-label="Example entry">
            <span role="cell">Income</span>
            <span role="cell">+1</span>
            <span role="cell">3</span>
          </div>
          <div class="capital-ledger-row capital-ledger-row--opening" role="row">
            <span role="cell">Opening Balance</span>
            <span role="cell"></span>
            <span role="cell">2</span>
          </div>
          ${ledgerRows(10)}
        </div>
      </div>

      <footer class="card-footer"><span>Financiers</span><span>Ledger</span><span>${esc(version)}</span></footer>
    </div>
  </article>`;
}

async function renderLedgerReview() {
  if (!root) return;
  try {
    const currentGame = await loadCurrentGame();
    const version = currentGame.displayVersion || 'Current';
    const face = capitalLedgerMarkup(version);
    root.innerHTML = `<div class="capital-ledger-duplex-review">
      <div class="capital-ledger-face"><p class="proposal-face-label screen-only"><strong>Front</strong><span>Ledger face</span></p>${face}</div>
      <div class="capital-ledger-face"><p class="proposal-face-label screen-only"><strong>Reverse</strong><span>Identical ledger face</span></p>${face}</div>
    </div>`;
  } catch (error) {
    root.innerHTML = `<p class="review-note">Unable to load Capital Ledger: ${esc(error.message)}</p>`;
    console.error(error);
  }
}

await renderLedgerReview();
if (document.readyState === 'complete') window.dispatchEvent(new Event('load'));
