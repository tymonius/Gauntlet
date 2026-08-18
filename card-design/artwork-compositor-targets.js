(() => {
  const style = document.createElement('style');
  style.textContent = `
    .proposal-face:has(.gauntlet-card[data-art-compositor-decorative="true"]) > .art-compositor-launch {
      display: none !important;
    }
  `;
  document.head.append(style);

  function tagTargets(root = document) {
    root.querySelectorAll('.proposal-review-pair[id]').forEach(pair => {
      const faces = Array.from(pair.querySelectorAll(':scope .proposal-face .gauntlet-card'));
      faces.forEach((card, index) => {
        card.dataset.cardId = index === 0 ? pair.id : `${pair.id}-ratified`;
        if (index > 0) card.dataset.artCompositorDecorative = 'true';
      });
    });

    root.querySelectorAll('.rite-review-pair[id]').forEach(pair => {
      const faces = Array.from(pair.querySelectorAll(':scope .rite-face .gauntlet-card')).filter(card =>
        card.querySelector('.card-art img, .territory-art img'),
      );
      faces.forEach((card, index) => {
        if (card.classList.contains('completed-rite-card')) {
          card.dataset.cardId = `${pair.id}-completed`;
        } else if (index === 0) {
          card.dataset.cardId = pair.id;
        } else {
          card.dataset.cardId = `${pair.id}-face-${index + 1}`;
        }
      });
    });
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      tagTargets();
    });
  };

  tagTargets();
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
