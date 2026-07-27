(() => {
  const fit = card => {
    const content = card.querySelector('.fit-content');
    if (!content) return;
    let body = parseFloat(getComputedStyle(card).getPropertyValue('--body-size')) || 6.15;
    let label = parseFloat(getComputedStyle(card).getPropertyValue('--label-size')) || 5.9;
    let guard = 0;
    while (card.scrollHeight > card.clientHeight + 1 && body > 3.95 && guard < 40) {
      body -= 0.12; label -= 0.1;
      card.style.setProperty('--body-size', `${body}pt`);
      card.style.setProperty('--label-size', `${label}pt`);
      guard++;
    }
    if (card.scrollHeight > card.clientHeight + 1) card.dataset.overflow='true';
  };
  requestAnimationFrame(() => document.querySelectorAll('.fit-card').forEach(fit));
})();
