import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const RELEASE_VERSION = 'v0.7.0';
const SOURCE_VERSION = 'v0.7.0';
const RELEASE_DIR = path.join(ROOT, 'releases', RELEASE_VERSION);
const RULEBOOK_PATH = path.join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Rulebook.md`);
const CANONICAL_PATH = path.join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Canonical_Data.json`);
const STARTERS_PATH = path.join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Starter_Decks.json`);
const PROVENANCE_PATH = path.join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Source_Provenance.json`);
const BOOKLET_PATH = path.join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Rulebook_Booklet.pdf`);
const MANIFEST_PATH = path.join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Manifest.json`);
const CARD_ANATOMY_PATH = path.join(RELEASE_DIR, `Gauntlet_${RELEASE_VERSION}_Card_Anatomy.png`);
const PLAYER_CHAPTER_11_PATH = path.join(ROOT, 'rulebook', 'player-facing', 'chapter-11.md');
const RELEASE_NOTES_PATH = path.join(ROOT, 'docs', 'releases', 'github', 'v0.7.0.md');
const TRANSIENT_RULEBOOK_PATH = path.join(ROOT, 'rulebook-production', '.v063-player-facing-input.md');
const PRODUCTION_DIR = '/tmp/rulebook-production';
const PRODUCTION_HTML_PATH = path.join(ROOT, 'rulebook-production', 'full-rulebook.html');
const PRODUCTION_PAGINATOR_PATH = path.join(ROOT, 'rulebook-production', '.paginate_rulebook_runtime.mjs');

const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const hashFile = file => hash(fs.readFileSync(file));
const relative = file => path.relative(ROOT, file).split(path.sep).join('/');
const jsonText = value => `${JSON.stringify(value, null, 2)}\n`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: process.env,
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: options.capture ? 'utf8' : undefined,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}.${options.capture ? `\n${result.stdout || ''}${result.stderr || ''}` : ''}`);
  }
  return result;
}

function validateReleaseNotesBookletCounts(logicalPages, bookletSides, physicalSheets) {
  const notes = fs.readFileSync(RELEASE_NOTES_PATH, 'utf8');
  const expected = `**${logicalPages}-page half-letter booklet**, imposed as **${bookletSides} Letter-landscape sides on ${physicalSheets} physical sheets**`;
  if (!notes.includes(expected)) {
    throw new Error(`v0.7.0 release notes do not match generated Rulebook pagination: expected "${expected}".`);
  }
}

function brandV070ProductionSurface() {
  const surfaces = [PRODUCTION_HTML_PATH, PRODUCTION_PAGINATOR_PATH];
  for (const surface of surfaces) {
    if (!fs.existsSync(surface)) throw new Error(`Missing approved Rulebook production surface: ${relative(surface)}.`);
    const source = fs.readFileSync(surface, 'utf8');
    const branded = source.replace(/0\.6\.3/g, '0.7.0');
    if (/0\.6\.3/.test(branded)) {
      throw new Error(`v0.7.0 Rulebook production surface still contains v0.6.3 branding: ${relative(surface)}.`);
    }
    if (!/0\.7\.0/.test(branded)) {
      throw new Error(`v0.7.0 Rulebook production surface contains no v0.7.0 identity: ${relative(surface)}.`);
    }
    fs.writeFileSync(surface, branded);
  }
}

async function waitForServer(url) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Rulebook production server did not become ready: ${lastError?.message || 'unknown error'}`);
}

async function renderCardAnatomyFigure() {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const pageErrors = [];
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1800 },
      deviceScaleFactor: 3,
    });
    page.on('pageerror', error => pageErrors.push(error.message));
    const response = await page.goto('http://127.0.0.1:8000/rulebook/?rules=candidate', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    if (!response?.ok()) throw new Error('Card Anatomy Rulebook view returned ' + response?.status() + '.');
    const guide = page.locator('.card-anatomy-guide').first();
    await guide.waitFor({ state: 'attached', timeout: 60000 });
    await guide.scrollIntoViewIfNeeded();
    await page.waitForSelector('.card-anatomy-guide.markers-positioned .card-anatomy-figure', {
      state: 'visible',
      timeout: 60000,
    });
    await page.evaluate(async () => {
      await document.fonts?.ready;
      document.querySelector('.card-anatomy-arcane')?.remove();
    });
    const figure = page.locator('.card-anatomy-guide .card-anatomy-figure').first();
    if (await figure.count() !== 1) throw new Error('Expected exactly one live Card Anatomy figure.');
    await figure.screenshot({ path: CARD_ANATOMY_PATH });
    if (pageErrors.length) throw new Error('Card Anatomy render raised page errors:\n' + pageErrors.join('\n'));
  } finally {
    await browser.close();
  }
  const bytes = fs.statSync(CARD_ANATOMY_PATH).size;
  if (bytes < 10000) throw new Error('Generated Card Anatomy figure is unexpectedly small: ' + bytes + ' bytes.');
  console.log('Rendered deterministic Card Anatomy figure: ' + relative(CARD_ANATOMY_PATH) + ' (' + bytes + ' bytes).');
}
function extractChapter11(rulebook) {
  const startMarker = '# 11. Detailed Card and Timing Rules';
  const endMarker = '# 12. Overlays and Other Shared Card Rules';
  const start = rulebook.indexOf(startMarker);
  const end = rulebook.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) throw new Error('v0.7.0 Rulebook is missing the Chapter 11 publication boundary.');
  return rulebook.slice(start, end).trim();
}

for (const required of [RULEBOOK_PATH, CANONICAL_PATH, STARTERS_PATH, PROVENANCE_PATH]) {
  if (!fs.existsSync(required)) throw new Error(`Missing v0.7.0 source artifact: ${relative(required)}.`);
}

const rulebook = fs.readFileSync(RULEBOOK_PATH, 'utf8').replace(/\r\n/g, '\n');
const chapter11 = extractChapter11(rulebook);
const originalChapter11 = fs.readFileSync(PLAYER_CHAPTER_11_PATH);

fs.rmSync(PRODUCTION_DIR, { recursive: true, force: true });
fs.mkdirSync(path.dirname(TRANSIENT_RULEBOOK_PATH), { recursive: true });

const server = spawn('python', ['-m', 'http.server', '8000'], {
  cwd: ROOT,
  env: process.env,
  stdio: ['ignore', 'ignore', 'inherit'],
});
try {
  await waitForServer('http://127.0.0.1:8000/rulebook/');
  await renderCardAnatomyFigure();

  run('python', ['rulebook-design/build_proofs.py']);
  run('python', ['rulebook-production/build_fidelity_gate.py']);
  try {
    fs.writeFileSync(TRANSIENT_RULEBOOK_PATH, rulebook);
    fs.writeFileSync(PLAYER_CHAPTER_11_PATH, chapter11 + '\n');
    run('python', ['scripts/build-v063-rulebook-production.py']);
    brandV070ProductionSurface();
  } finally {
    fs.writeFileSync(PLAYER_CHAPTER_11_PATH, originalChapter11);
    fs.rmSync(TRANSIENT_RULEBOOK_PATH, { force: true });
  }

  await waitForServer('http://127.0.0.1:8000/rulebook-production/full-rulebook.html');
  run('node', ['rulebook-production/render_fidelity_gate.mjs']);
  run('node', ['scripts/run-v070-rulebook-renderer.mjs']);
} finally {
  server.kill('SIGTERM');
}

const reportPath = path.join(PRODUCTION_DIR, 'production-report.json');
const sourceBooklet = path.join(PRODUCTION_DIR, 'Gauntlet_v0.6.1_Rulebook_Booklet.pdf');
if (!fs.existsSync(reportPath) || !fs.existsSync(sourceBooklet)) {
  throw new Error('Approved Rulebook production pipeline did not emit its report and booklet PDF.');
}
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
if (report.reader?.report?.missing?.length !== 0) throw new Error('Approved Rulebook renderer omitted source tokens.');
if (report.reader?.isolatedHeadings?.length !== 0) throw new Error('Approved Rulebook renderer stranded headings.');
if (report.reader?.leaderImages?.length !== 12) throw new Error(`Approved Rulebook renderer produced ${report.reader?.leaderImages?.length ?? 'unknown'} Leader portraits instead of 12.`);
if (!String(report.reader?.bodyFamily || '').toLowerCase().includes('adobe-caslon-pro')) throw new Error(`Unexpected Rulebook reading typography: ${report.reader?.bodyFamily}.`);
if (!String(report.reader?.utilityFamily || '').includes('Inter')) throw new Error(`Unexpected Rulebook utility typography: ${report.reader?.utilityFamily}.`);

fs.mkdirSync(RELEASE_DIR, { recursive: true });
fs.copyFileSync(sourceBooklet, BOOKLET_PATH);

const bookletBytes = fs.readFileSync(BOOKLET_PATH);
const bookletPages = Number(report.outputs?.bookletSides);
const logicalPages = Number(report.outputs?.readerPages);
if (!Number.isInteger(bookletPages) || bookletPages < 1) throw new Error('Approved Rulebook production report has no valid booklet-side count.');
if (!Number.isInteger(logicalPages) || logicalPages < 4) throw new Error('Approved Rulebook production report has no valid reading-page count.');

const physicalSheets = Number(report.outputs?.physicalSheets);
if (!Number.isInteger(physicalSheets) || physicalSheets < 1) throw new Error('Approved Rulebook production report has no valid physical-sheet count.');
validateReleaseNotesBookletCounts(logicalPages, bookletPages, physicalSheets);

const provenance = JSON.parse(fs.readFileSync(PROVENANCE_PATH, 'utf8'));
if (provenance.release_version !== RELEASE_VERSION || provenance.source_version !== SOURCE_VERSION || !provenance.authority_set_id) {
  throw new Error('v0.7.0 source provenance is incomplete.');
}

const canonical = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'));
const starters = JSON.parse(fs.readFileSync(STARTERS_PATH, 'utf8'));
const publicRoutes = {
  start: '/start/',
  rulebook: '/rulebook/',
  card_reference: '/card-reference/',
  factions: '/factions/',
  deckbuilder: '/deckbuilder/',
  rules_arbiter: '/rules-arbiter/',
};

const payloadFiles = [RULEBOOK_PATH, BOOKLET_PATH, CARD_ANATOMY_PATH, CANONICAL_PATH, STARTERS_PATH, PROVENANCE_PATH].map(file => {
  const bytes = fs.readFileSync(file);
  return { path: path.basename(file), sha256: hash(bytes), bytes: bytes.length };
});

const manifest = {
  schema_version: 1,
  release_version: RELEASE_VERSION,
  name: 'Illustrated Cards & Tabletop Simulator',
  status: 'current',
  authority_set_id: provenance.authority_set_id,
  publication_date: null,
  current_package_path: `releases/${RELEASE_VERSION}/`,
  source_provenance: {
    source_version: SOURCE_VERSION,
    base_version: 'v0.6.3',
    current_game_authority: 'game-data/current-game.json',
    source_inputs: provenance.source_inputs,
  },
  binding_sources: {
    rulebook: { path: relative(RULEBOOK_PATH), sha256: hashFile(RULEBOOK_PATH) },
    canonical_data: { path: relative(CANONICAL_PATH), sha256: hashFile(CANONICAL_PATH) },
    approved_starters: { path: relative(STARTERS_PATH), sha256: hashFile(STARTERS_PATH) },
    source_provenance: { path: relative(PROVENANCE_PATH), sha256: hashFile(PROVENANCE_PATH) },
    card_anatomy_figure: { path: relative(CARD_ANATOMY_PATH), sha256: hashFile(CARD_ANATOMY_PATH) },
  },
  counts: {
    playable_cards: canonical?.gameplay?.cards?.length ?? provenance.counts?.playable_cards,
    territories: canonical?.gameplay?.territories?.length ?? provenance.counts?.territories,
    factions: canonical?.gameplay?.factions?.length ?? provenance.counts?.factions,
    leaders: provenance.counts?.leaders,
    starter_decks: starters?.decks?.length ?? provenance.counts?.starter_decks,
    print_pdfs: 1,
    json_exports: 3,
    static_figures: 1,
  },
  public_defaults: {
    website: RELEASE_VERSION,
    browser_tools: RELEASE_VERSION,
    rules_arbiter: RELEASE_VERSION,
    digital_rules: RELEASE_VERSION,
  },
  public_routes: publicRoutes,
  json_exports: [
    path.basename(CANONICAL_PATH),
    path.basename(STARTERS_PATH),
    path.basename(PROVENANCE_PATH),
  ],
  pdf_outputs: [
    {
      key: 'rulebook-booklet',
      path: path.basename(BOOKLET_PATH),
      pages: bookletPages,
      sha256: hash(bookletBytes),
      bytes: bookletBytes.length,
    },
  ],
  payload_files: payloadFiles,
  rulebook_booklet_provenance: {
    source_version: SOURCE_VERSION,
    logical_pages: logicalPages,
    imposed_sides: bookletPages,
    physical_sheets: physicalSheets,
    padding_pages: Number(report.reader?.report?.intentionalBlanks || 0),
    duplex_flip: 'short-edge',
    approved_v063_production_adapter_reused: true,
    card_anatomy_figure: {
      path: relative(CARD_ANATOMY_PATH),
      sha256: hashFile(CARD_ANATOMY_PATH),
      source_card: 'military-unbroken-ranks',
      renderer: 'rulebook/card-anatomy.js + card-design/card-print-render.html?fit=production&card=military-unbroken-ranks',
    },
  },
};

fs.writeFileSync(MANIFEST_PATH, jsonText(manifest));
console.log(`Materialized ${RELEASE_VERSION} booklet: ${logicalPages} logical pages, ${bookletPages} imposed sides.`);
console.log(`Booklet SHA-256: ${manifest.pdf_outputs[0].sha256}`);
