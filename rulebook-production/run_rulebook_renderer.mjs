import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = new URL('./render_rulebook.mjs', import.meta.url);
const runtimePath = new URL('./.render_rulebook_runtime.mjs', import.meta.url);
let source = await readFile(sourcePath, 'utf8');

const original = `        const next = heading.nextElementSibling;
        const headingRect = heading.getBoundingClientRect();
        const nearBottom = headingRect.bottom > flowRect.bottom - 34;
        const lacksFollowingContent = !next || next.classList.contains('source-divider');`;

const corrected = `        let next = heading.nextElementSibling;
        while (next?.classList.contains('source-divider')) next = next.nextElementSibling;
        const headingRect = heading.getBoundingClientRect();
        const nearBottom = headingRect.bottom > flowRect.bottom - 34;
        const lacksFollowingContent = !next;`;

if (!source.includes(original)) {
  throw new Error('The Rulebook renderer no longer contains the expected heading-validation block. Apply the semantic-sibling validation directly before continuing.');
}
if (source.indexOf(original) !== source.lastIndexOf(original)) {
  throw new Error('The Rulebook renderer contains more than one heading-validation block; refusing an ambiguous runtime correction.');
}

source = source.replace(original, corrected);
await writeFile(runtimePath, source, 'utf8');
await import(`${runtimePath.href}?run=${Date.now()}`);
