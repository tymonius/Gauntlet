import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = new URL('../rulebook-production/render_rulebook.mjs', import.meta.url);
const runtimePath = new URL('../rulebook-production/.render_rulebook_v063_runtime.mjs', import.meta.url);
let source = await readFile(sourcePath, 'utf8');

function replaceOnce(label, original, replacement) {
  const count = source.split(original).length - 1;
  if (count !== 1) {
    throw new Error(`Expected exactly one ${label} block/string in the approved Rulebook renderer; found ${count}.`);
  }
  source = source.replace(original, replacement);
}

// v0.6.3 keeps the approved chapter architecture but renamed two shared-rule
// chapters. Preserve the renderer's exact-anchor validation using current
// authoritative names rather than deleting or weakening the check.
replaceOnce(
  'Chapter 5 required anchor',
  "  '5. Actions and Assets',",
  "  '5. Actions, Faction Actions, Faction Abilities, and Assets',",
);
replaceOnce(
  'Chapter 8 required anchor',
  "  '8. Territory Control and Capture',",
  "  '8. Front Line, Occupation, and Capture',",
);

// Carry forward the two production-runtime corrections used by the approved
// v0.6.1 wrapper. These are validation/readiness fixes, not layout changes.
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

replaceOnce('heading validation correction', headingOriginal, headingCorrected);
replaceOnce('postprocess readiness correction', readyOriginal, readyCorrected);

await writeFile(runtimePath, source, 'utf8');
await import(`${runtimePath.href}?run=${Date.now()}`);
