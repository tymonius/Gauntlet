(() => {
  /*
   * Final publication-only DOM refinements that depend on the already paginated
   * booklet. The compatibility readiness flag is retained because the render
   * adapter waits for it before producing PDFs.
   */
  document.body.dataset.bookletMarkersReady = 'false';

  let finishing = false;
  let finished = false;

  function normalizedText(node) {
    return (node?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function fail(message) {
    document.body.dataset.bookletMarkersReady = 'error';
    document.body.dataset.bookletMarkersError = message;
    throw new Error(message);
  }

  function afterTwoFrames() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
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

  async function measureLeaderArtworkBounds(image) {
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
      try {
        await image.decode();
      } catch {
        fail(`Could not decode Leader woodcut ${image.getAttribute('src') || '?'}.`);
      }
    }

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    if (!naturalWidth || !naturalHeight) {
      fail(`Leader woodcut ${image.getAttribute('src') || '?'} has no intrinsic dimensions.`);
    }

    // Measure a downsampled copy so even the largest source plates are cheap to
    // inspect. We are finding the ink bounds, not modifying the source artwork.
    const maxSample = 512;
    const sampleScale = Math.min(1, maxSample / naturalWidth, maxSample / naturalHeight);
    const width = Math.max(1, Math.round(naturalWidth * sampleScale));
    const height = Math.max(1, Math.round(naturalHeight * sampleScale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) fail('Could not create the Leader artwork measurement canvas.');
    context.drawImage(image, 0, 0, width, height);

    const pixels = context.getImageData(0, 0, width, height).data;
    const cornerOffsets = [
      0,
      (width - 1) * 4,
      ((height - 1) * width) * 4,
      ((height * width) - 1) * 4,
    ];
    const background = cornerOffsets.reduce((sum, offset) => {
      sum.r += pixels[offset];
      sum.g += pixels[offset + 1];
      sum.b += pixels[offset + 2];
      sum.a += pixels[offset + 3];
      return sum;
    }, { r: 0, g: 0, b: 0, a: 0 });
    for (const channel of ['r', 'g', 'b', 'a']) background[channel] /= cornerOffsets.length;
    const transparentBackground = background.a < 48;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = ((y * width) + x) * 4;
        const alpha = pixels[offset + 3];
        if (alpha < 24) continue;

        let isArtwork = transparentBackground;
        if (!transparentBackground) {
          const distance = Math.abs(pixels[offset] - background.r)
            + Math.abs(pixels[offset + 1] - background.g)
            + Math.abs(pixels[offset + 2] - background.b);
          isArtwork = distance > 42;
        }
        if (!isArtwork) continue;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) {
      return { left: 0, top: 0, right: 1, bottom: 1 };
    }

    // Retain a small safety field around every detected mark. This crops only
    // unused source-canvas whitespace while protecting antlers, weapons, feet,
    // and other fine extremities from touching the publication frame.
    const artworkWidth = maxX - minX + 1;
    const artworkHeight = maxY - minY + 1;
    const padX = Math.max(2, Math.ceil(artworkWidth * 0.025));
    const padY = Math.max(2, Math.ceil(artworkHeight * 0.02));
    minX = Math.max(0, minX - padX);
    minY = Math.max(0, minY - padY);
    maxX = Math.min(width - 1, maxX + padX);
    maxY = Math.min(height - 1, maxY + padY);

    return {
      left: minX / width,
      top: minY / height,
      right: (maxX + 1) / width,
      bottom: (maxY + 1) / height,
    };
  }

  function paintLeaderArtwork(image, figure, canvas, bounds) {
    const boxWidth = figure.clientWidth;
    const boxHeight = figure.clientHeight;
    const sourceX = bounds.left * image.naturalWidth;
    const sourceY = bounds.top * image.naturalHeight;
    const sourceWidth = (bounds.right - bounds.left) * image.naturalWidth;
    const sourceHeight = (bounds.bottom - bounds.top) * image.naturalHeight;
    if (!boxWidth || !boxHeight || !sourceWidth || !sourceHeight) {
      fail(`Could not size Leader woodcut ${image.getAttribute('src') || '?'}.`);
    }

    // Paint the fitted crop into a high-resolution canvas whose CSS box never
    // exceeds the publication column. This preserves source detail without
    // making the figure itself report horizontal DOM overflow to preflight.
    const rasterScale = 4;
    canvas.width = Math.max(1, Math.round(boxWidth * rasterScale));
    canvas.height = Math.max(1, Math.round(boxHeight * rasterScale));
    const context = canvas.getContext('2d');
    if (!context) fail('Could not create the Leader artwork publication canvas.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    const scale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
    const destinationWidth = sourceWidth * scale;
    const destinationHeight = sourceHeight * scale;
    const destinationX = (canvas.width - destinationWidth) / 2;
    const destinationY = (canvas.height - destinationHeight) / 2;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      destinationX,
      destinationY,
      destinationWidth,
      destinationHeight,
    );
  }

  async function optimizeLeaderHero(page, flow, hero, figure, image, canvas, identity) {
    const bounds = await measureLeaderArtworkBounds(image);
    const initialHeroHeight = hero.getBoundingClientRect().height;
    const columnWidth = figure.getBoundingClientRect().width;
    const artworkWidth = (bounds.right - bounds.left) * image.naturalWidth;
    const artworkHeight = (bounds.bottom - bounds.top) * image.naturalHeight;
    const desiredHeroHeight = artworkWidth > 0
      ? columnWidth * (artworkHeight / artworkWidth)
      : initialHeroHeight;

    // Spend otherwise-dead vertical room on the hero before reducing the art.
    // The target height is the amount required for the detected artwork to fill
    // the left column at full width, bounded by the actual space remaining on
    // this specific page. This keeps every Leader page efficient without a
    // one-size-fits-all crop or magic zoom percentage.
    const sparePageHeight = Math.max(0, flow.clientHeight - flow.scrollHeight);
    const maximumHeroHeight = initialHeroHeight + sparePageHeight;
    const minimumHeroHeight = Math.max(identity.scrollHeight, 0);
    const targetHeroHeight = Math.min(
      maximumHeroHeight,
      Math.max(minimumHeroHeight, desiredHeroHeight),
    );

    hero.style.height = `${targetHeroHeight}px`;
    figure.style.height = '100%';
    paintLeaderArtwork(image, figure, canvas, bounds);
    page.dataset.leaderArtworkFitted = 'true';
  }

  async function rebuildLeaderPages() {
    const leaderPages = [...document.querySelectorAll('.leader-page')];
    const optimizations = [];
    for (const page of leaderPages) {
      const flow = page.querySelector('.page-flow');
      const titleRow = flow?.querySelector('.leader-title-row');
      const figure = flow?.querySelector(':scope > .leader-woodcut-wrap');
      const image = figure?.querySelector('img');
      const playstyle = flow?.querySelector(':scope > .leader-playstyle');
      const motto = flow?.querySelector(':scope > .leader-motto');
      const ability = [...(flow?.children || [])].find(node => /^(UL|OL)$/.test(node.tagName));

      if (!flow || !titleRow || !figure || !image || !playstyle || !motto || !ability) {
        fail(`Leader page ${page.dataset.page || '?'} is missing the expected hero-layout pieces.`);
        return;
      }

      const hero = document.createElement('div');
      hero.className = 'leader-hero-layout';
      const identity = document.createElement('div');
      identity.className = 'leader-identity-column';
      const artworkCanvas = document.createElement('canvas');
      artworkCanvas.className = 'leader-art-canvas';
      artworkCanvas.setAttribute('aria-hidden', 'true');

      image.classList.add('leader-art-source');
      figure.append(artworkCanvas);
      figure.remove();
      playstyle.remove();
      motto.remove();
      ability.remove();
      identity.append(playstyle, motto, ability);
      hero.append(figure, identity);
      titleRow.insertAdjacentElement('afterend', hero);
      page.classList.add('leader-layout-refined');
      optimizations.push(optimizeLeaderHero(page, flow, hero, figure, image, artworkCanvas, identity));
    }
    await Promise.all(optimizations);
  }

  function assertNoFlowOverflow() {
    const overflow = [...document.querySelectorAll('.page .page-flow')]
      .find(flow => flow.scrollHeight > flow.clientHeight + 1);
    if (overflow) {
      fail(`Publication refinement overflowed booklet page ${overflow.closest('.page')?.dataset.page || '?'}.`);
    }
  }

  async function finishBooklet() {
    if (document.body.dataset.bookletReady !== 'true' || finishing || finished) return;
    finishing = true;
    try {
      await afterTwoFrames();
      relocateArcaneCallout();
      await rebuildLeaderPages();
      assertNoFlowOverflow();
      document.body.dataset.bookletMarkersReady = 'true';
      document.body.dataset.bookletLayoutRefined = 'true';
      finished = true;
    } finally {
      finishing = false;
    }
  }

  const observer = new MutationObserver(() => { void finishBooklet(); });
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-booklet-ready'] });
  void finishBooklet();
})();
