import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = new URL('../rulebook-production/render_rulebook.mjs', import.meta.url);
const runtimePath = new URL('../rulebook-production/.render_rulebook_v063_runtime.mjs', import.meta.url);
let source = await readFile(sourcePath, 'utf8');

function replaceOnce(label, original, replacement) {
  const count = source.split(original).length - 1;
  if (count !== 1) throw new Error(`Expected exactly one ${label} block/string; found ${count}.`);
  source = source.replace(original, replacement);
}

replaceOnce('Chapter 5 required anchor', "  '5. Actions and Assets',", "  '5. Actions, Faction Actions, Faction Abilities, and Assets',");
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
    if (errors.length) {
      const diagnostic = await page.evaluate(() => ({
        leaders: [...document.querySelectorAll('#reader-root > .leader-page')].map((item, index) => ({
          leader: item.querySelector('.leader-name')?.textContent?.trim() || '',
          currentPage: [...document.querySelectorAll('#reader-root > .page')].indexOf(item) + 1,
        })),
        boundaries: [...document.querySelectorAll('#reader-root > .page[data-anchor]')].map(item => ({
          anchor: item.dataset.anchor || '',
          currentPage: [...document.querySelectorAll('#reader-root > .page')].indexOf(item) + 1,
          classes: item.className,
        })),
      }));
      throw new Error(mode + ' Rulebook browser errors before pagination completed:\n' + errors.join('\n') + '\nPre-filler diagnostics: ' + JSON.stringify(diagnostic));
    }
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
      heroPlateSources: [...document.querySelectorAll('#reader-root > .intentional-blank .hero-plate img')].map(image => image.getAttribute('src')),
      heroPlatePlacements: [...document.querySelectorAll('#reader-root > .intentional-blank')].map(page => ({ label: page.dataset.heroPlateFor || '', pageNumber: Number(page.dataset.page), nextClass: page.nextElementSibling?.className || '', nextPageNumber: Number(page.nextElementSibling?.dataset.page || 0) })),`,
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
  if (result.leaderPages.length !== 12) throw new Error(\`Expected 12 dedicated Leader pages; found \${result.leaderPages.length}.\`);
  const leaderPageByName = new Map(result.leaderPages.map(item => [item.leader, item.pageNumber]));
  for (const [leftLeader, rightLeader] of expectedLeaderPairs) {
    const leftPage = leaderPageByName.get(leftLeader), rightPage = leaderPageByName.get(rightLeader);
    if (!leftPage || !rightPage) throw new Error(\`Leader spread is missing \${leftLeader} or \${rightLeader}.\`);
    if (leftPage % 2 !== 0 || rightPage !== leftPage + 1) throw new Error(\`Leader pair must share a facing spread: \${leftLeader} p.\${leftPage}, \${rightLeader} p.\${rightPage}.\`);
  }

  const expectedByCount = {
    3: ['hero sketch 2.png', 'hero sketch 3.png', 'hero sketch 4.png'],
    4: ['hero sketch 2.png', 'hero sketch 3.png', 'hero sketch 4.png', 'hero sketch.png'],
  };
  const expectedHeroPlates = expectedByCount[report.intentionalBlanks];
  const actualHeroPlates = result.heroPlateSources.map(value => decodeURIComponent(value || '').split('/').at(-1)).sort();
  if (!expectedHeroPlates || JSON.stringify(actualHeroPlates) !== JSON.stringify([...expectedHeroPlates].sort())) {
    throw new Error(\`Expected unique approved hero filler art; found \${JSON.stringify(actualHeroPlates)} across \${report.intentionalBlanks} filler pages.\`);
  }

  const naturalBoundaryClasses = ['part-opener', 'chapter-page', 'faction-opener', 'quick-reference-page', 'glossary-page'];
  for (const placement of result.heroPlatePlacements) {
    if (!naturalBoundaryClasses.some(className => placement.nextClass.split(/\\s+/).includes(className))) {
      throw new Error(\`Hero filler plate interrupts a content section: \${JSON.stringify(placement)}.\`);
    }
  }`,
);

await writeFile(runtimePath, source, 'utf8');
await import(`${runtimePath.href}?run=${Date.now()}`);
