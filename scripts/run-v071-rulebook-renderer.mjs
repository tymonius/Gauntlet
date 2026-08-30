import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = new URL('../rulebook-production/render_rulebook.mjs', import.meta.url);
const runtimePath = new URL('../rulebook-production/.render_rulebook_v071_runtime.mjs', import.meta.url);
let source = await readFile(sourcePath, 'utf8');

function replaceOnce(label, original, replacement) {
  const count = source.split(original).length - 1;
  if (count !== 1) throw new Error(`Expected exactly one ${label} block/string; found ${count}.`);
  source = source.replace(original, replacement);
}

replaceOnce('Chapter 5 required anchor', "  '5. Actions and Assets',", "  '5. Actions, Faction Features, Leader Abilities, and Assets',");
replaceOnce('Chapter 8 required anchor', "  '8. Territory Control and Capture',", "  '8. Front Line, Occupation, and Capture',");

const headingOriginal = `        const next = heading.nextElementSibling;
        const headingRect = heading.getBoundingClientRect();
        const nearBottom = headingRect.bottom > flowRect.bottom - 34;
        const lacksFollowingContent = !next || next.classList.contains('source-divider');`;
const headingCorrected = `        let next = heading.nextElementSibling;
        while (next?.classList.contains('source-divider')) next = next.nextElementSibling;
        const headingRect = heading.getBoundingClientRect();
        const nearBottom = headingRect.bottom > flowRect.bottom - 34;
        const lacksFollowingContent = !next;`;
replaceOnce('heading validation correction', headingOriginal, headingCorrected);
replaceOnce(
  'postprocess readiness correction',
  `    () => document.documentElement.dataset.paginationReady === 'true',`,
  `    () => document.documentElement.dataset.paginationReady === 'true' &&
      document.documentElement.dataset.postprocessReady === 'true',`,
);
replaceOnce(
  'pagination error surfacing',
  `  await page.waitForFunction(
    () => document.documentElement.dataset.paginationReady === 'true' &&
      document.documentElement.dataset.postprocessReady === 'true',
    null,
    { timeout: 120000 },
  );`,
  `  let paginationReady = false;
  for (let attempt = 0; attempt < 480; attempt += 1) {
    if (errors.length) throw new Error(mode + ' Rulebook browser errors before pagination completed: ' + errors.join(' | '));
    paginationReady = await page.evaluate(() =>
      document.documentElement.dataset.paginationReady === 'true' &&
      document.documentElement.dataset.postprocessReady === 'true'
    );
    if (paginationReady) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!paginationReady) throw new Error(mode + ' Rulebook pagination did not complete within 120 seconds.');`,
);
replaceOnce(
  'reader spread review capture',
  `async function renderReaderSpreads(page, count) {
  await page.evaluate(() => {
    document.querySelector('#reader-spread-review')?.remove();
    const review = document.createElement('div');
    review.id = 'reader-spread-review';
    review.style.cssText = 'position:absolute;left:-20000px;top:0;width:11in;';
    document.body.append(review);
  });

  const pairs = [];
  pairs.push([1]);
  for (let left = 2; left < count; left += 2) pairs.push([left, left + 1]);
  pairs.push([count]);

  for (const [spreadIndex, pair] of pairs.entries()) {
    await page.evaluate(pageNumbers => {
      const review = document.querySelector('#reader-spread-review');
      review.replaceChildren();
      const sheet = document.createElement('section');
      sheet.className = pageNumbers.length === 1 ? 'reader-cover' : 'spread-sheet';
      const sourcePages = [...document.querySelectorAll('#reader-root > .page')];
      for (const pageNumber of pageNumbers) sheet.append(sourcePages[pageNumber - 1].cloneNode(true));
      review.append(sheet);
    }, pair);
    await page.locator('#reader-spread-review > *').screenshot({
      path: join(OUT, 'reader-spreads', \`spread-\${pad(spreadIndex + 1)}-pages-\${pair.join('-')}.png\`),
    });
  }
  await page.evaluate(() => document.querySelector('#reader-spread-review')?.remove());
}`,
  `async function renderReaderSpreads(page, count) {
  await page.evaluate(() => {
    document.querySelector('#reader-spread-review')?.remove();
    const readerRoot = document.querySelector('#reader-root');
    readerRoot.dataset.preSpreadReviewVisibility = readerRoot.style.visibility || '';
    readerRoot.style.visibility = 'hidden';
    const review = document.createElement('div');
    review.id = 'reader-spread-review';
    review.style.cssText = 'position:fixed;left:0;top:0;width:11in;height:8.5in;z-index:2147483647;background:#d4d1ca;overflow:hidden;';
    document.body.append(review);
  });

  const pairs = [];
  pairs.push([1]);
  for (let left = 2; left < count; left += 2) pairs.push([left, left + 1]);
  pairs.push([count]);

  for (const [spreadIndex, pair] of pairs.entries()) {
    await page.evaluate((payload) => {
      const { pageNumbers, finalPage } = payload;
      const review = document.querySelector('#reader-spread-review');
      review.replaceChildren();
      const sheet = document.createElement('section');
      sheet.className = pageNumbers.length === 1 ? 'reader-cover' : 'spread-sheet';
      sheet.style.position = 'relative';
      const sourcePages = [...document.querySelectorAll('#reader-root > .page')];
      for (const pageNumber of pageNumbers) sheet.append(sourcePages[pageNumber - 1].cloneNode(true));
      if (pageNumbers.length === 1 && pageNumbers[0] === finalPage) sheet.classList.add('reader-back-cover');
      review.append(sheet);
    }, { pageNumbers: pair, finalPage: count });
    await page.locator('#reader-spread-review > *').screenshot({
      path: join(OUT, 'reader-spreads', \`spread-\${pad(spreadIndex + 1)}-pages-\${pair.join('-')}.png\`),
    });
  }
  await page.evaluate(() => {
    document.querySelector('#reader-spread-review')?.remove();
    const readerRoot = document.querySelector('#reader-root');
    readerRoot.style.visibility = readerRoot.dataset.preSpreadReviewVisibility || '';
    delete readerRoot.dataset.preSpreadReviewVisibility;
  });
}`,
);
replaceOnce(
  'reading-font probe',
  "      bodyFamily: getComputedStyle(document.querySelector('.production-flow p, .body-copy')).fontFamily,",
  "      bodyFamily: getComputedStyle(document.querySelector('.production-flow p:not(.flavor-overline), .body-copy')).fontFamily,",
);
replaceOnce(
  'utility font report',
  "      utilityFamily: getComputedStyle(document.querySelector('.running-head')).fontFamily,",
  `      utilityFamily: getComputedStyle(document.querySelector('.running-head')).fontFamily,
      interLoaded: document.fonts.check('400 12px Inter') && document.fonts.check('700 12px Inter'),
      leaderPages: [...document.querySelectorAll('#reader-root > .leader-page')].map(page => ({ leader: page.querySelector('.leader-name')?.textContent?.trim() || '', pageNumber: Number(page.dataset.page) })),
      openerPages: [...document.querySelectorAll('#reader-root > .part-opener, #reader-root > .faction-opener')].map(page => ({ anchor: page.dataset.anchor || '', pageNumber: Number(page.dataset.page), classes: page.className })),
      heroPlateSources: [...document.querySelectorAll('#reader-root > .intentional-blank .hero-plate img')].map(image => image.getAttribute('src')),
      fillerPlacements: [...document.querySelectorAll('#reader-root > .intentional-blank')].map(page => ({
        label: page.dataset.heroPlateFor || '',
        tier: Number(page.dataset.heroPlateTier || -1),
        kind: page.dataset.heroPlateKind || '',
        illustrated: Boolean(page.querySelector('.hero-plate img')),
        pageNumber: Number(page.dataset.page),
        nextClass: page.nextElementSibling?.className || '',
        nextLeader: page.nextElementSibling?.querySelector('.leader-name')?.textContent?.trim() || '',
        nextPageNumber: Number(page.nextElementSibling?.dataset.page || 0),
      })),`,
);
replaceOnce(
  'utility font assertion',
  `  if (!result.utilityFamily.includes('Inter')) {
    throw new Error(\`Approved utility typography was not retained: \${result.utilityFamily}\`);
  }`,
  `  if (!result.utilityFamily.includes('Inter')) throw new Error(\`Approved utility typography was not retained: \${result.utilityFamily}\`);
  if (!result.interLoaded) throw new Error('Inter is named in the approved utility stack but is not actually loaded.');

  const expectedLeaderPairs = [
    ['General', 'Commandant'], ['Ambassador', 'Senator'], ['Banker', 'Executive'],
    ['Ranger', 'Spymaster'], ['Alchemist', 'Spirit Walker'], ['Grand Inquisitor', 'Witch Hunter'],
  ];
  const firstLeaders = new Set(expectedLeaderPairs.map(([leftLeader]) => leftLeader));
  if (result.leaderPages.length !== 12) throw new Error(\`Expected 12 dedicated Leader pages; found \${result.leaderPages.length}.\`);
  const leaderPageByName = new Map(result.leaderPages.map(item => [item.leader, item.pageNumber]));
  for (const [leftLeader, rightLeader] of expectedLeaderPairs) {
    const leftPage = leaderPageByName.get(leftLeader), rightPage = leaderPageByName.get(rightLeader);
    if (!leftPage || !rightPage) throw new Error(\`Leader spread is missing \${leftLeader} or \${rightLeader}.\`);
    if (leftPage % 2 !== 0 || rightPage !== leftPage + 1) throw new Error(\`Leader pair must share a facing spread: \${leftLeader} p.\${leftPage}, \${rightLeader} p.\${rightPage}.\`);
  }

  const expectedHeroPlates = ['hero sketch 2.png', 'hero sketch 3.png', 'hero sketch 4.png'];
  const actualHeroPlates = result.heroPlateSources.map(value => decodeURIComponent(value || '').split('/').at(-1)).sort();
  if (JSON.stringify(actualHeroPlates) !== JSON.stringify([...expectedHeroPlates].sort())) {
    throw new Error(\`Expected the three unused approved hero sketches exactly once; found \${JSON.stringify(actualHeroPlates)} across \${report.intentionalBlanks} filler pages.\`);
  }
  if (result.fillerPlacements.length !== report.intentionalBlanks) {
    throw new Error(\`Filler placement report mismatch: \${result.fillerPlacements.length} placements for \${report.intentionalBlanks} intentional blanks.\`);
  }

  const naturalBoundaryClasses = ['part-opener', 'chapter-page', 'faction-opener', 'quick-reference-page', 'glossary-page', 'leader-page'];
  for (const placement of result.fillerPlacements) {
    if (!naturalBoundaryClasses.some(className => placement.nextClass.split(/\\s+/).includes(className))) {
      throw new Error(\`Filler page interrupts a content section: \${JSON.stringify(placement)}.\`);
    }
    if (placement.nextClass.split(/\\s+/).includes('leader-page') && !firstLeaders.has(placement.nextLeader)) {
      throw new Error(\`Filler page may only precede the first page of a Leader pair: \${JSON.stringify(placement)}.\`);
    }
  }

  const illustrated = result.fillerPlacements.filter(placement => placement.illustrated);
  if (illustrated.length !== 3) throw new Error(\`Expected exactly three illustrated filler pages; found \${illustrated.length}.\`);
  const highestSelectedTier = Math.min(...result.fillerPlacements.map(placement => placement.tier));
  if (illustrated.some(placement => placement.tier > highestSelectedTier) && result.fillerPlacements.filter(placement => placement.tier === highestSelectedTier).length >= 3) {
    throw new Error('Unused hero sketches were not assigned to the highest selected publication hierarchy.');
  }`,
);

await writeFile(runtimePath, source, 'utf8');
await import(`${runtimePath.href}?run=${Date.now()}`);