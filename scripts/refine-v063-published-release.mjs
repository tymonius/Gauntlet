import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [
  'v0.6.3/index.html',
  'v0.6.3/rulebook/index.html',
  'v0.6.3/start/index.html',
  'v0.6.3/quick-reference/index.html',
  'v0.6.3/changes/index.html',
  'v0.6.3/deckbuilder/index.html',
  'v0.6.3/reference/index.html',
  'v0.6.3/rules-arbiter/index.html',
];

const replacements = [
  ['Unpublished v0.6.3 development Rules Arbiter · v0.6.2 remains the canonical published playtest edition.', 'v0.6.3 Rules Arbiter · current canonical playtest edition.'],
  ['This development Arbiter reads the integrated v0.6.3 candidate Rulebook and canonical data. It is intentionally isolated from the public v0.6.2 Rules Arbiter.', 'This Rules Arbiter reads the published v0.6.3 Rulebook and canonical data.'],
  ['Development boundary:</strong> answers here describe the current v0.6.3 candidate. They do not change the published v0.6.2 rules until v0.6.3 is released.', 'Canonical source boundary:</strong> answers here describe the published v0.6.3 playtest edition.'],
  ['Development Rules Arbiter for the unpublished Gauntlet v0.6.3 candidate.', 'Rules Arbiter for the published Gauntlet v0.6.3 playtest edition.'],
  ['Gauntlet v0.6.3 Candidate Rules Arbiter', 'Gauntlet v0.6.3 Rules Arbiter'],
  ['Candidate rules review', 'Published rules reference'],
  ['Ask the candidate Arbiter', 'Ask the Rules Arbiter'],
  ['Loading candidate source mode…', 'Loading published source mode…'],
  ['another v0.6.3 candidate rule.', 'another v0.6.3 rule.'],
  [' · v0.6.2 remains canonical', ''],
  ['v0.6.2 remains canonical', 'v0.6.3 is canonical'],
  ['v0.6.2 remains the canonical published playtest edition', 'v0.6.3 is the canonical published playtest edition'],
  ['Candidate Reference', 'Canonical Reference'],
  ['Integrated candidate reference', 'Published canonical reference'],
  ['Review the v0.6.3 state.', 'Browse the v0.6.3 reference.'],
  ['This page reads the integrated unpublished v0.6.3 canonical-data candidate.', 'This page reads the published v0.6.3 canonical data.'],
  ['Loading v0.6.3 candidate…', 'Loading published v0.6.3 data…'],
  ['Integrated candidate', 'Published canonical'],
  ['candidate reference', 'canonical reference'],
  ['unpublished v0.6.3 candidate', 'published v0.6.3 rules'],
  ['unpublished v0.6.3', 'published v0.6.3'],
  ['Candidate sources', 'Canonical sources'],
  ['v0.6.3 dev', 'v0.6.3'],
  ['development navigation', 'release navigation'],
  ['Published v0.6.2', 'Previous v0.6.2'],
];

for (const relativePath of targets) {
  const target = path.join(root, relativePath);
  let text = fs.readFileSync(target, 'utf8');
  for (const [before, after] of replacements) text = text.replaceAll(before, after);
  fs.writeFileSync(target, text, 'utf8');
}

const homepagePath = path.join(root, 'index.html');
let homepage = fs.readFileSync(homepagePath, 'utf8');
homepage = homepage
  .replaceAll('Gauntlet_v0.6.2_', 'Gauntlet_v0.6.3_')
  .replace(
    "Capture the opponent's final territory, advance beyond the column, and win the final battle.",
    "Capture the opponent's final Territory to win immediately, or force them beyond their own end and win their Last Stand.",
  );
fs.writeFileSync(homepagePath, homepage, 'utf8');

const printIndexPath = path.join(root, 'v0.6.3/print/index.html');
let printIndex = fs.readFileSync(printIndexPath, 'utf8');
const analyticsTags = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-8YYYZJGGPE"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag(\'js\',new Date());gtag(\'config\',\'G-8YYYZJGGPE\');</script>';
const faviconLinks = '<link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" /><link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any" /><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1" />';
if (!printIndex.includes('G-8YYYZJGGPE')) {
  printIndex = printIndex.replace('<head>', `<head>${analyticsTags}`);
}
if (!printIndex.includes('/favicon-32.png?v=20260804-1')) {
  printIndex = printIndex.replace('<head>', `<head>${faviconLinks}`);
}
fs.writeFileSync(printIndexPath, printIndex, 'utf8');

const workerPath = path.join(root, 'rules-assistant/worker-v063.js');
let worker = fs.readFileSync(workerPath, 'utf8');
worker = worker.replaceAll('service: "gauntlet-rules-assistant-v063"', 'service: "gauntlet-rules-assistant"');
fs.writeFileSync(workerPath, worker, 'utf8');

const workerEntryPath = path.join(root, 'rules-assistant/worker-entry.js');
let workerEntry = fs.readFileSync(workerEntryPath, 'utf8');
workerEntry = workerEntry
  .replaceAll('return publishedWorker.fetch(request, env, context);', 'return currentPublishedWorker.fetch(request, env, context);')
  .replace('import publishedWorker from "./worker-v063.js";', 'import currentPublishedWorker from "./worker-v063.js";')
  .replace('import publishedV062Worker from "./worker-v062.js";', 'import publishedWorker from "./worker-v062.js";')
  .replaceAll('publishedV062Worker.fetch(request, env, context)', 'publishedWorker.fetch(request, env, context)')
  .replace(
    '    if (["/api/v062/rules","/v062/rules","/api/v062/health","/v062/health"].includes(url.pathname)) return publishedWorker.fetch(request, env, context);',
    `    if (
      url.pathname === "/api/v062/rules" ||
      url.pathname === "/v062/rules" ||
      url.pathname === "/api/v062/health" ||
      url.pathname === "/v062/health"
    ) {
      return publishedWorker.fetch(request, env, context);
    }`,
  );
fs.writeFileSync(workerEntryPath, workerEntry, 'utf8');

console.log('Refined published v0.6.3 browser wording, homepage victory/link copy, print analytics/favicon metadata, stable Rules Arbiter service identity, and explicit historical v0.6.2 worker route contract.');
