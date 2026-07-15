function shrinkUntilFit(card, selector, startSize, minimumSize, step) {
  let size = startSize;
  const targets = card.querySelectorAll(selector);
  while (card.scrollHeight > card.clientHeight && size > minimumSize) {
    size -= step;
    targets.forEach(target => { target.style.fontSize = `${size.toFixed(2)}pt`; });
  }
}

function fitCards() {
  document.querySelectorAll('.faction-card').forEach(card => {
    let bodySize = 6.25;
    let labelSize = 6.0;
    while (card.scrollHeight > card.clientHeight && bodySize > 4.2) {
      bodySize -= 0.14;
      labelSize = Math.max(4.0, labelSize - 0.11);
      card.style.setProperty('--body-size', `${bodySize.toFixed(2)}pt`);
      card.style.setProperty('--label-size', `${labelSize.toFixed(2)}pt`);
    }
  });

  document.querySelectorAll('.leader-card').forEach(card => {
    shrinkUntilFit(card, '.leader-rule, .leader-rule strong', 5.35, 4.05, 0.1);
    if (card.scrollHeight > card.clientHeight) {
      const art = card.querySelector('.leader-art');
      if (art) {
        art.style.height = '1.25in';
        art.style.flexBasis = '1.25in';
      }
      shrinkUntilFit(card, '.leader-rule, .leader-rule strong', 4.25, 3.75, 0.08);
    }
  });

  document.querySelectorAll('.reference-card').forEach(card => {
    shrinkUntilFit(card, '.reference-block, .reference-block strong', 5.65, 4.2, 0.1);
    shrinkUntilFit(card, '.purge-text', 5.25, 4.1, 0.08);
    shrinkUntilFit(card, '.purge-intro, .reference-reminder', 5.3, 4.1, 0.08);
  });
}

requestAnimationFrame(fitCards);
window.addEventListener('load', fitCards);
