function fitTextGroup(card, selector, strongSelector, startSize, minimumSize, step) {
  let size = startSize;
  const targets = card.querySelectorAll(selector);
  const strongTargets = strongSelector ? card.querySelectorAll(strongSelector) : [];

  while (card.scrollHeight > card.clientHeight && size > minimumSize) {
    size -= step;
    targets.forEach(target => { target.style.fontSize = `${size.toFixed(2)}pt`; });
    strongTargets.forEach(target => { target.style.fontSize = `${size.toFixed(2)}pt`; });
  }
}

function fitSupplementalCards() {
  document.querySelectorAll('.leader-card').forEach(card => {
    fitTextGroup(card, '.leader-rule', '.leader-rule strong', 5.25, 3.85, 0.1);
    if (card.scrollHeight > card.clientHeight) {
      const art = card.querySelector('.leader-art');
      if (art) {
        art.style.height = '1.25in';
        art.style.flexBasis = '1.25in';
      }
      fitTextGroup(card, '.leader-rule', '.leader-rule strong', 4.2, 3.65, 0.08);
    }
  });

  document.querySelectorAll('.reference-card').forEach(card => {
    fitTextGroup(card, '.reference-block', '.reference-block strong', 5.55, 4.15, 0.1);
    fitTextGroup(card, '.purge-text', null, 5.05, 4.0, 0.08);
    fitTextGroup(card, '.purge-intro, .reference-reminder', null, 5.2, 4.0, 0.08);
  });
}

requestAnimationFrame(fitSupplementalCards);
window.addEventListener('load', fitSupplementalCards);
