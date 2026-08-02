import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = new URL('./render_rulebook.mjs', import.meta.url);
const runtimePath = new URL('./.render_rulebook_runtime.mjs', import.meta.url);
let source = await readFile(sourcePath, 'utf8');

const headingOriginal = `        const next = heading.nextElementSibling;
        const headingRect = heading.getBoundingClientRect();
        const nearBottom = headingRect.bottom > flowRect.bottom - 34;
        const lacksFollowingContent = !next || next.classList.contains('source-divider');`;

const headingCorrected = `        let next = heading.nextElementSibling;
        while (next?.classList.contains('source-divider')) next = next.nextElementSibling;
        const headingRect = heading.getBoundingClientRect();
        const nearBottom = headingRect.bottom > flowRect.bottom - 34;
        const lacksFollowingContent = !next;`;

const readyOriginal = `    () => document.documentElement.dataset.paginationReady === 'true',`;
const readyCorrected = `    () => document.documentElement.dataset.paginationReady === 'true' &&
      document.documentElement.dataset.postprocessReady === 'true',`;

for (const [label, original] of [
  ['heading-validation', headingOriginal],
  ['postprocess-readiness', readyOriginal],
]) {
  if (!source.includes(original)) {
    throw new Error(`The Rulebook renderer no longer contains the expected ${label} block. Apply the correction directly before continuing.`);
  }
  if (source.indexOf(original) !== source.lastIndexOf(original)) {
    throw new Error(`The Rulebook renderer contains more than one ${label} block; refusing an ambiguous runtime correction.`);
  }
}

source = source
  .replace(headingOriginal, headingCorrected)
  .replace(readyOriginal, readyCorrected);
await writeFile(runtimePath, source, 'utf8');
await import(`${runtimePath.href}?run=${Date.now()}`);
