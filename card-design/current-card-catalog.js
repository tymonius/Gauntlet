import { loadCurrentGame } from '../game-data/current-game.mjs';
async function syncCurrentGameCatalogCopy() {
  try {
    const currentGame = await loadCurrentGame();
    const cards = currentGame.cards || [];

    // The catalog, Deckbuilder, and TTS all consume the same canonical Card
    // Design face frames. This map is exposed here only so the compositor can
    // inspect/edit the same committed composition authority as those frames.
    window.GAUNTLET_ART_DIRECTION = currentGame.artDirection || {};
    window.dispatchEvent(new CustomEvent('gauntlet-art-direction-ready', {
      detail: { authority: currentGame.authorityUrl },
    }));

    const catalogFilter = document.body?.classList.contains('developer-catalog-page')
      ? window.GauntletCatalogFilter || null
      : null;
    const visibleCards = catalogFilter
      ? cards.filter(card => catalogFilter.factionMatches(currentGame.slugify(card.allegiance)))
      : cards;
    const neutralCount = cards.filter(card => currentGame.slugify(card.allegiance) === 'neutral').length;
    const factionCounts = ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']
      .map(faction => cards.filter(card => currentGame.slugify(card.allegiance) === faction).length);

    document.querySelectorAll('[data-playable-count]').forEach(node => {
      node.textContent = String(cards.length);
    });

    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = `Internal Gauntlet card review catalog driven by the ${currentGame.displayVersion} current-game authority.`;

    const eyebrow = document.querySelector('.developer-catalog-hero .eyebrow');
    if (eyebrow) eyebrow.textContent = `${currentGame.displayVersion} · single current-game authority`;

    const playableHeading = document.querySelector('#playable-cards .card-section-heading');
    const sectionLabel = playableHeading?.querySelector('.section-label');
    if (sectionLabel) sectionLabel.textContent = 'Resolved current playable-card pool';

    const description = playableHeading?.querySelector(':scope > p:last-child');
    if (description) {
      if (catalogFilter && catalogFilter.faction !== 'all') {
        const label = catalogFilter.factionLabels[catalogFilter.faction].replace(' / universal', '');
        description.textContent = `${visibleCards.length} current ${label} playable cards are supplied by the shared current-game authority.`;
      } else {
        description.textContent = `All ${cards.length} current playable cards are supplied by the shared current-game authority. Card additions, revisions, and retirements are resolved before this catalog receives them.`;
      }
    }

    const overviewNote = document.querySelector('.catalog-overview-note');
    if (overviewNote) {
      overviewNote.textContent = `Current authority: ${currentGame.displayVersion}. ${neutralCount} Neutral cards; faction counts ${factionCounts.join(' / ')}.`;
    }

    document.body.dataset.currentGameCards = 'ready';
    document.body.dataset.currentGameAuthority = currentGame.authorityUrl;
  } catch (error) {
    console.error(error);
    document.body.dataset.currentGameCards = 'error';
    const section = document.querySelector('#playable-cards');
    if (section && !section.querySelector('[data-current-game-card-error]')) {
      const message = document.createElement('p');
      message.className = 'section-shell review-note';
      message.dataset.currentGameCardError = 'true';
      message.textContent = `Unable to load current-game catalog metadata: ${error.message}`;
      section.append(message);
    }
  }
}

if (document.readyState === 'complete') syncCurrentGameCatalogCopy();
else window.addEventListener('load', syncCurrentGameCatalogCopy, { once: true });
