import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  V072_BOOKLET_MANIFEST,
  V072_BOOKLET_OUTPUT_ROOT,
} from '../packages/rules/publication/v072-modular-booklets.mjs';

const ROOT = process.cwd();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BASE_RENDERER = path.join(SCRIPT_DIR, 'render-v072-modular-booklets.mjs');
const RUNTIME_RENDERER = path.join(SCRIPT_DIR, '.render-v072-dedicated-runtime.mjs');
const BOOKLET_SOURCE = path.join(ROOT, 'apps', 'rules', 'booklet');
const RUNTIME_BOOKLET = path.join(ROOT, 'legacy', 'rulebook-browser', 'booklet');
const MARKDOWN_SOURCE = path.join(ROOT, 'apps', 'rules', 'markdown.js');
const MANIFEST_PATH = path.join(ROOT, V072_BOOKLET_OUTPUT_ROOT, V072_BOOKLET_MANIFEST);

function prepareDedicatedRuntime() {
  if (fs.existsSync(RUNTIME_BOOKLET)) {
    throw new Error(`Dedicated booklet runtime path already exists: ${path.relative(ROOT, RUNTIME_BOOKLET)}`);
  }
  fs.cpSync(BOOKLET_SOURCE, RUNTIME_BOOKLET, { recursive: true });
  fs.copyFileSync(MARKDOWN_SOURCE, path.join(RUNTIME_BOOKLET, 'markdown.js'));

  const original = fs.readFileSync(BASE_RENDERER, 'utf8');
  const browserUrl = '/rulebook/?rules=candidate&doc=';
  const printUrl = '/rulebook/booklet/?doc=';
  const browserLeaderWait = `  if (!['player-guide', 'complete-rules'].includes(publication.id)) {\n    await page.waitForSelector('.candidate-featured-leaders img.leader-portrait', { state: 'visible', timeout: 60000 });\n  }\n\n`;
  const browserReadyPredicate = `      && document.querySelector('.rulebook-content.candidate-publication'),`;
  const printReadyPredicate = `      && (\n        document.body.dataset.bookletReady === 'error'\n        || document.body.dataset.bookletMarkersReady === 'error'\n        || (\n          document.body.dataset.bookletReady === 'true'\n          && document.body.dataset.bookletMarkersReady === 'true'\n          && document.querySelector('.rulebook-content.candidate-publication')\n        )\n      ),`;
  const defaultMargins = `    margin: {\n      top: '0.45in',\n      bottom: '0.52in',\n      left: '0.42in',\n      right: '0.42in',\n    },`;
  const zeroMargins = `    margin: {\n      top: '0',\n      bottom: '0',\n      left: '0',\n      right: '0',\n    },`;

  if (!original.includes(browserUrl)) {
    throw new Error('Base modular renderer no longer exposes the expected Browser Rulebook candidate URL; review the dedicated print adapter.');
  }
  if (!original.includes(browserLeaderWait)) {
    throw new Error('Base modular renderer no longer exposes the expected Browser Rulebook leader-gallery wait; review the dedicated print adapter.');
  }
  if (!original.includes(browserReadyPredicate)) {
    throw new Error('Base modular renderer no longer exposes the expected publication-ready predicate; review the dedicated print adapter.');
  }
  if (!original.includes(defaultMargins)) {
    throw new Error('Base modular renderer no longer exposes the expected reader margins; review the fixed-page print adapter.');
  }

  let runtime = original.replace(browserUrl, printUrl);
  runtime = runtime.replace(browserLeaderWait, '');
  runtime = runtime.replace(browserReadyPredicate, printReadyPredicate);
  runtime = runtime.replace('displayHeaderFooter: true,', 'displayHeaderFooter: false,');
  runtime = runtime.replace('preferCSSPageSize: false,', 'preferCSSPageSize: true,');
  runtime = runtime.replace(defaultMargins, zeroMargins);
  runtime = runtime.replace('const anchors = await prepareInterstitialAnchors(page, publication);', 'const anchors = []; // Fixed-page booklet composition already owns pagination and four-page padding.');
  fs.writeFileSync(RUNTIME_RENDERER, runtime);
}

function cleanupDedicatedRuntime() {
  fs.rmSync(RUNTIME_RENDERER, { force: true });
  fs.rmSync(RUNTIME_BOOKLET, { recursive: true, force: true });
}

function markDedicatedPublicationSurface() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  manifest.renderContract.publicationSurface = 'fixed half-letter print composition derived from the approved PR #357 publication template; Browser Rulebook chrome is not part of the PDF surface';
  manifest.renderContract.runningFurniture = 'Running heads, rules, and outside-edge folios are composed inside each fixed half-letter reader page before saddle-stitch imposition.';
  manifest.renderContract.pagination = 'Every publication section begins on a designed fixed page; continuation pages are measured in-browser and the reader is padded to a multiple of four before imposition.';
  manifest.renderContract.pagePadding = 'When padding is required, the first hero-woodcut filler occupies the inside front cover; any additional fillers are spread across semantic section boundaries, and filler pages are never adjacent.';
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

prepareDedicatedRuntime();
try {
  await import(`${pathToFileURL(RUNTIME_RENDERER).href}?dedicated=${Date.now()}`);
  markDedicatedPublicationSurface();
} finally {
  cleanupDedicatedRuntime();
}
