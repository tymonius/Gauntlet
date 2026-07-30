(() => {
  const CSS_PIXELS_PER_INCH = 96;
  const HEIGHT_STEP = 1;
  let resizeTimer;

  function setArtHeight(card, height) {
    card.querySelector('.card-interior')?.style.setProperty('--art-height', `${height}px`);
  }

  function fitCard(card) {
    const interior = card.querySelector('.card-interior');
    const art = card.querySelector('.card-art');
    if (!interior || !art) return;

    const maximum = Number(card.dataset.artMax || 1.72) * CSS_PIXELS_PER_INCH;
    const minimum = Number(card.dataset.artMin || 0.62) * CSS_PIXELS_PER_INCH;
    let height = maximum;

    card.classList.remove('fit-warning');
    setArtHeight(card, height);
    void interior.offsetHeight;

    while (interior.scrollHeight > interior.clientHeight + 0.5 && height > minimum) {
      height = Math.max(minimum, height - HEIGHT_STEP);
      setArtHeight(card, height);
      void interior.offsetHeight;
    }

    if (interior.scrollHeight > interior.clientHeight + 0.5) {
      card.classList.add('fit-warning');
      console.warn(`Card content still exceeds the available area: ${card.getAttribute('aria-label') || 'unnamed card'}`);
    }
  }

  function fitAllCards() {
    document.querySelectorAll('.gauntlet-card[data-art-max]').forEach(fitCard);
  }

  async function prepareCards() {
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch (error) {
        console.warn('Card fonts did not report ready before fitting.', error);
      }
    }

    await Promise.all(Array.from(document.images).map(image => {
      if (image.complete) return Promise.resolve();
      return new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));

    requestAnimationFrame(() => requestAnimationFrame(fitAllCards));
  }

  window.addEventListener('load', prepareCards);
  window.addEventListener('beforeprint', fitAllCards);
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(fitAllCards, 120);
  });
})();
