(() => {
  /*
   * Final publication-only DOM refinements that depend on the already paginated
   * booklet. The compatibility readiness flag is retained because the render
   * adapter waits for it before producing PDFs.
   */
  document.body.dataset.bookletMarkersReady = 'false';

  function normalizedText(node) {
    return (node?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function fail(message) {
    document.body.dataset.bookletMarkersReady = 'error';
    document.body.dataset.bookletMarkersError = message;
    throw new Error(message);
  }

  function relocateArcaneCallout() {
    const callout = document.querySelector('.booklet-arcane-example');
    if (!callout) return;

    const effectHeading = [...document.querySelectorAll('.page-flow h3')]
      .find(node => /^Effect headings$/i.test(normalizedText(node)));
    const assetsHeading = [...document.querySelectorAll('.page-flow h3')]
      .find(node => /^Assets$/i.test(normalizedText(node)));
    if (!effectHeading || !assetsHeading) {
      fail('Could not locate the Effect headings / Assets boundary for the Arcane callout.');
      return;
    }

    const anatomyPage = callout.closest('.page');
    const effectPage = effectHeading.closest('.page');
    const assetsPage = assetsHeading.closest('.page');
    const assetsBlock = assetsHeading.closest('.keep-heading') || assetsHeading;
    if (!anatomyPage || !effectPage || !assetsPage || !assetsBlock.parentElement) {
      fail('Could not resolve booklet pages while relocating the Arcane callout.');
      return;
    }

    callout.remove();
    assetsBlock.parentElement.insertBefore(callout, assetsBlock);
    callout.classList.add('booklet-arcane-relocated');

    if (callout.closest('.page') === anatomyPage) {
      fail('Arcane trait callout remained on the Card Anatomy page.');
      return;
    }
    if (callout.compareDocumentPosition(effectHeading) & Node.DOCUMENT_POSITION_FOLLOWING) {
      fail('Arcane trait callout was placed before the Effect headings section.');
    }
  }

  function rebuildLeaderPages() {
    const leaderPages = [...document.querySelectorAll('.leader-page')];
    for (const page of leaderPages) {
      const flow = page.querySelector('.page-flow');
      const titleRow = flow?.querySelector('.leader-title-row');
      const figure = flow?.querySelector(':scope > .leader-woodcut-wrap');
      const image = figure?.querySelector('img');
      const playstyle = flow?.querySelector(':scope > .leader-playstyle');
      const ability = [...(flow?.children || [])].find(node => /^(UL|OL)$/.test(node.tagName));

      if (!flow || !titleRow || !figure || !image || !playstyle || !ability) {
        fail(`Leader page ${page.dataset.page || '?'} is missing the expected hero-layout pieces.`);
        return;
      }

      const hero = document.createElement('div');
      hero.className = 'leader-hero-layout';
      const identity = document.createElement('div');
      identity.className = 'leader-identity-column';

      figure.style.setProperty('--leader-art', `url("${image.getAttribute('src')}")`);
      image.classList.add('leader-art-source');
      figure.remove();
      playstyle.remove();
      ability.remove();
      identity.append(playstyle, ability);
      hero.append(figure, identity);
      titleRow.insertAdjacentElement('afterend', hero);
      page.classList.add('leader-layout-refined');
    }
  }

  function assertNoFlowOverflow() {
    const overflow = [...document.querySelectorAll('.page .page-flow')]
      .find(flow => flow.scrollHeight > flow.clientHeight + 1);
    if (overflow) {
      fail(`Publication refinement overflowed booklet page ${overflow.closest('.page')?.dataset.page || '?'}.`);
    }
  }

  function finishBooklet() {
    if (document.body.dataset.bookletReady !== 'true') return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      relocateArcaneCallout();
      rebuildLeaderPages();
      assertNoFlowOverflow();
      document.body.dataset.bookletMarkersReady = 'true';
      document.body.dataset.bookletLayoutRefined = 'true';
    }));
  }

  const observer = new MutationObserver(finishBooklet);
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-booklet-ready'] });
  finishBooklet();
})();
