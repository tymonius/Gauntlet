(() => {
  const TARGETS = Object.freeze([
    Object.freeze({ selector: '.card-title', ratio: .5 }),
    Object.freeze({ selector: '.value-medallion', ratio: .5 }),
    Object.freeze({ selector: '.gauntlet-card', ratio: .23 }),
    Object.freeze({ selector: '.card-art', ratio: .5 }),
    Object.freeze({ selector: '.rule-section h4', ratio: .5 }),
    Object.freeze({ selector: '.rule-section p', ratio: .5 }),
    Object.freeze({ selector: '.card-footer', ratio: .5 }),
  ]);

  function fail(message) {
    document.body.dataset.bookletMarkersReady = 'error';
    document.body.dataset.bookletMarkersError = message;
    throw new Error(message);
  }

  function positionMarkers() {
    const guide = document.querySelector('.booklet-card-anatomy-guide');
    if (!guide) {
      document.body.dataset.bookletMarkersReady = 'true';
      return;
    }

    const frame = guide.querySelector('.booklet-card-frame');
    const wrap = guide.querySelector('.booklet-card-frame-wrap');
    const markers = [...guide.querySelectorAll('.booklet-card-marker')];
    const frameDocument = frame?.contentDocument;
    const frameWindow = frame?.contentWindow;

    if (!frame || !wrap || !frameDocument || !frameWindow) {
      fail('Booklet Card Anatomy frame was not available for callout positioning.');
      return;
    }
    if (frameDocument.body?.dataset.renderReady !== 'true') {
      fail('Booklet Card Anatomy frame was not render-ready when callouts were positioned.');
      return;
    }
    if (markers.length !== TARGETS.length) {
      fail(`Expected ${TARGETS.length} Card Anatomy callouts; found ${markers.length}.`);
      return;
    }

    const frameRect = frame.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const viewportHeight = frameWindow.innerHeight || frame.clientHeight || frameRect.height;
    const scaleY = frameRect.height / viewportHeight;

    TARGETS.forEach((config, index) => {
      const target = frameDocument.querySelector(config.selector);
      if (!target) {
        fail(`Booklet Card Anatomy target is missing: ${config.selector}`);
        return;
      }
      const targetRect = target.getBoundingClientRect();
      const targetY = targetRect.top + (targetRect.height * config.ratio);
      const anchorY = (frameRect.top - wrapRect.top) + (targetY * scaleY);
      const marker = markers[index];
      marker.style.top = `${anchorY - (marker.offsetHeight / 2)}px`;
    });

    guide.classList.add('markers-positioned');
    document.body.dataset.bookletMarkersReady = 'true';
  }

  function finishBooklet() {
    if (document.body.dataset.bookletReady !== 'true') return;
    requestAnimationFrame(positionMarkers);
  }

  const observer = new MutationObserver(finishBooklet);
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-booklet-ready'] });
  finishBooklet();
})();
