import {
  AUTHORITY_SET_ID, CLEAN, RULEBOOK_SOURCE, CANONICAL_SOURCE, STARTERS_SOURCE, factionGuides,
  prune, copyText, currentize, finish
} from './publication-utils.mjs';

prune('factions', new Set(['homepage.css','index.html','app.js','styles.css','military','diplomats','financiers','intelligence','mystics','inquisition']));
copyText(`${CLEAN}/faction-pages/styles.css`, 'factions/styles.css');
copyText(`${CLEAN}/faction-pages/index.html`, 'factions/index.html', (html) => currentize(html, 'Gauntlet v0.6.3 Factions', 'Read the six canonical Gauntlet v0.6.3 faction guides.', 'https://gauntlet.run/factions/')
  .replaceAll('../../../../', '../').replaceAll('../browser-rulebook/', '../rulebook/').replaceAll('Clean ', '').replace(/reconstruction/gi, 'current release'));
copyText(`${CLEAN}/faction-pages/app.js`, 'factions/app.js', (app) => app
  .replace("import { renderMarkdown } from '../browser-rulebook/markdown.js';", "import { renderMarkdown } from '../rulebook/markdown.js';")
  .replace("const SOURCE_URL = `../../faction-guides/${faction.authorityDir}/${faction.file}`;\nsourceLinks.forEach((link) => { link.href = SOURCE_URL; });", `const SOURCE_URL = \`/${CLEAN}/faction-guides/\${faction.authorityDir}/\${faction.file}\`;\nconst PUBLISHED_SOURCE_URL = \`../releases/v0.6.3/faction-guides/\${factionKey}/\${faction.file}\`;\nsourceLinks.forEach((link) => { link.href = PUBLISHED_SOURCE_URL; });`)
  .replace('const rendered = renderMarkdown(source);', `const publishedSource = source.replace(/^> \\*\\*Clean v0\\.6\\.3[^\\n]*\\n\\n/m, '');\n    const rendered = renderMarkdown(publishedSource);`)
  .replace('Certified clean v0.6.3 ${faction.label} guide loaded', 'Canonical v0.6.3 ${faction.label} guide loaded')
  .replace('Unable to verify the certified clean v0.6.3 ${faction.label} guide.', 'Unable to verify the canonical v0.6.3 ${faction.label} guide.'));
for (const [, route] of factionGuides) {
  copyText(`${CLEAN}/faction-pages/${route}/index.html`, `factions/${route}/index.html`, (html) => currentize(html, `Gauntlet v0.6.3 ${route[0].toUpperCase()+route.slice(1)}`, `Canonical Gauntlet v0.6.3 ${route} faction guide.`, `https://gauntlet.run/factions/${route}/`)
    .replaceAll('../../../../../', '../../').replaceAll('../../../../', '../../').replaceAll('../browser-rulebook/', '../../rulebook/')
    .replaceAll('../card-reference/', '../../card-reference/').replaceAll('../start/', '../../start/').replaceAll('../deckbuilder/', '../../deckbuilder/')
    .replaceAll('Clean ', '').replace(/reconstruction only/gi, 'current canonical edition').replace(/reconstruction candidate/gi, 'current canonical playtest edition'));
}

prune('start', new Set(['index.html','app.js','site.css','styles.css','reconstruction.css']));
for (const file of ['site.css','styles.css','reconstruction.css']) copyText(`${CLEAN}/start/${file}`, `start/${file}`);
copyText(`${CLEAN}/start/index.html`, 'start/index.html', (html) => currentize(html, 'Start Playing Gauntlet v0.6.3', 'Learn Gauntlet v0.6.3 and choose one of twelve approved starter Decks.', 'https://gauntlet.run/start/')
  .replaceAll('../../../../', '../').replaceAll('../browser-rulebook/', '../rulebook/').replaceAll('../faction-pages/', '../factions/')
  .replace('This reconstruction teaches from the certified Rulebook itself', 'This page teaches from the certified Rulebook itself')
  .replace('reconstructed clean Deckbuilder', 'current Deckbuilder').replace('Deckbuilder is rebuilt. Print/export remains next.', 'Build, then open the release print/export package.')
  .replace('The clean v0.6.3 Deckbuilder now accepts this exact faction and Leader selection and loads the approved starter for construction and validation. Printable packages, card backs, supplemental-component sheets, and export artifacts remain locked for the next reconstruction slice.', 'The v0.6.3 Deckbuilder accepts this exact faction and Leader selection and loads the approved starter for construction and validation. The current release package also includes the certified printable Rulebook, faction guides, card reference, starter catalog, and JSON exports.')
  .replace('<a class="text-link" href="../deckbuilder/">Release package →</a>', '<a class="text-link" href="../releases/v0.6.3/">Release package →</a>').replace(/Clean /g, ''));
copyText(`${CLEAN}/start/app.js`, 'start/app.js', (app) => app
  .replace("import { renderMarkdown } from '../browser-rulebook/markdown.js';", "import { renderMarkdown } from '../rulebook/markdown.js';")
  .replace("const RULEBOOK_SOURCE = '../rulebook/Gauntlet_v0.6.3_Rulebook.md';", `const RULEBOOK_SOURCE = '/${RULEBOOK_SOURCE}';`)
  .replace("const STARTERS_SOURCE = '../downstream/starter-decks.json';", `const STARTERS_SOURCE = '/${STARTERS_SOURCE}';`)
  .replace('`../faction-pages/${id}/`', '`../factions/${id}/`')
  .replace('Verified clean authority ${AUTHORITY_SET_ID.slice(0, 12)}…', 'Verified v0.6.3 authority ${AUTHORITY_SET_ID.slice(0, 12)}…')
  .replace('Clean Start requires exactly 12 approved starter Decks.', 'v0.6.3 requires exactly 12 approved starter Decks.'));

prune('deckbuilder', new Set(['index.html','app.js','styles.css']));
copyText(`${CLEAN}/deckbuilder/styles.css`, 'deckbuilder/styles.css');
copyText(`${CLEAN}/deckbuilder/index.html`, 'deckbuilder/index.html', (html) => currentize(html, 'Gauntlet v0.6.3 Deckbuilder', 'Build and validate a legal Gauntlet v0.6.3 Deck from the certified 128-card pool.', 'https://gauntlet.run/deckbuilder/')
  .replaceAll('../../../../', '../').replaceAll('../browser-rulebook/', '../rulebook/').replaceAll('../faction-pages/', '../factions/')
  .replace('Construction is rebuilt. Print/export is not.', 'Build here; print/export is in the release package.')
  .replace('This surface intentionally stops at a validated Deck and Territory package. Printable card faces, backs, Leader/faction components, duplex pairing, and release export artifacts remain locked for the next reconstruction slice.', 'This Deckbuilder validates Deck construction against the certified v0.6.3 card and Territory data. The release package provides the certified Rulebook, faction guides, card reference, starter catalog, and JSON exports; unsupported withdrawn print modules are not revived.')
  .replace('<a class="text-link" href="../deckbuilder/">Release package →</a>', '<a class="text-link" href="../releases/v0.6.3/">Release package →</a>').replace(/Clean /g, ''));
copyText(`${CLEAN}/deckbuilder/app.js`, 'deckbuilder/app.js', (app) => app
  .replace("const CANONICAL_SOURCE = '../downstream/canonical-data.json';", `const CANONICAL_SOURCE = '/${CANONICAL_SOURCE}';`)
  .replace("const STARTERS_SOURCE = '../downstream/starter-decks.json';", `const STARTERS_SOURCE = '/${STARTERS_SOURCE}';`));

finish('Clean v0.6.3 public navigation');
