import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  V072_BOOKLET_MANIFEST,
  V072_BOOKLET_OUTPUT_ROOT,
  V072_BOOKLET_RELEASE_VERSION,
  v072BookletImposition,
} from '../packages/rules/publication/v072-modular-booklets.mjs';

const ROOT = process.cwd();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BASE_RENDERER = path.join(SCRIPT_DIR, 'render-v072-modular-booklets.mjs');
const RUNTIME_RENDERER = path.join(SCRIPT_DIR, '.render-v072-dedicated-runtime.mjs');
const BOOKLET_SOURCE = path.join(ROOT, 'apps', 'rules', 'booklet');
const RUNTIME_BOOKLET = path.join(ROOT, 'legacy', 'rulebook-browser', 'booklet');
const MARKDOWN_SOURCE = path.join(ROOT, 'apps', 'rules', 'markdown.js');
const MANIFEST_PATH = path.join(ROOT, V072_BOOKLET_OUTPUT_ROOT, V072_BOOKLET_MANIFEST);
const HALF_LETTER_WIDTH = 396;
const BUILD_EPOCH = new Date('2000-01-01T00:00:00.000Z');

function prepareDedicatedRuntime() {
  if (fs.existsSync(RUNTIME_BOOKLET)) {
    throw new Error(`Dedicated booklet runtime path already exists: ${path.relative(ROOT, RUNTIME_BOOKLET)}`);
  }
  fs.cpSync(BOOKLET_SOURCE, RUNTIME_BOOKLET, { recursive: true });
  fs.copyFileSync(MARKDOWN_SOURCE, path.join(RUNTIME_BOOKLET, 'markdown.js'));

  const original = fs.readFileSync(BASE_RENDERER, 'utf8');
  const browserUrl = '/rulebook/?rules=candidate&doc=';
  const printUrl = '/rulebook/booklet/?doc=';
  if (!original.includes(browserUrl)) {
    throw new Error('Base modular renderer no longer exposes the expected Browser Rulebook candidate URL; review the dedicated print adapter.');
  }
  let runtime = original.replace(browserUrl, printUrl);
  runtime = runtime.replace('displayHeaderFooter: true,', 'displayHeaderFooter: false,');
  fs.writeFileSync(RUNTIME_RENDERER, runtime);
}

function cleanupDedicatedRuntime() {
  fs.rmSync(RUNTIME_RENDERER, { force: true });
  fs.rmSync(RUNTIME_BOOKLET, { recursive: true, force: true });
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function furnitureLabel(title) {
  return `${title.toUpperCase()} · ${V072_BOOKLET_RELEASE_VERSION.toUpperCase()}`;
}

async function addPublicationFurniture(file, output) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const bytes = fs.readFileSync(file);
  const pdf = await PDFDocument.load(bytes);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const muted = rgb(0.36, 0.33, 0.29);
  const rule = rgb(0.58, 0.43, 0.27);
  const paddedPages = output.paddedPages;
  const sheets = paddedPages / 4;
  const label = furnitureLabel(output.title);

  const drawFurniture = (sheetPage, readerPage, half) => {
    if (readerPage === 1 || readerPage === paddedPages) return;
    const x = half * HALF_LETTER_WIDTH;
    const left = x + 30;
    const right = x + HALF_LETTER_WIDTH - 30;
    const headerSize = 5.6;
    const folioSize = 6.4;
    const folio = String(readerPage);
    const folioWidth = bold.widthOfTextAtSize(folio, folioSize);

    sheetPage.drawText(label, {
      x: left,
      y: 590,
      size: headerSize,
      font: bold,
      color: muted,
      characterSpacing: 0.45,
    });
    sheetPage.drawLine({
      start: { x: left, y: 584 },
      end: { x: right, y: 584 },
      thickness: 0.55,
      color: rule,
      opacity: 0.75,
    });
    sheetPage.drawLine({
      start: { x: left, y: 29 },
      end: { x: right, y: 29 },
      thickness: 0.35,
      color: muted,
      opacity: 0.55,
    });
    sheetPage.drawText('GAUNTLET', {
      x: left,
      y: 16,
      size: 5.5,
      font: regular,
      color: muted,
      characterSpacing: 0.7,
    });
    sheetPage.drawText(folio, {
      x: right - folioWidth,
      y: 15.5,
      size: folioSize,
      font: bold,
      color: muted,
    });
  };

  for (let sheet = 0; sheet < sheets; sheet += 1) {
    const order = v072BookletImposition(paddedPages, sheet);
    const front = pdf.getPage(sheet * 2);
    const back = pdf.getPage((sheet * 2) + 1);
    drawFurniture(front, order.front[0], 0);
    drawFurniture(front, order.front[1], 1);
    drawFurniture(back, order.back[0], 0);
    drawFurniture(back, order.back[1], 1);
  }

  pdf.setModificationDate(BUILD_EPOCH);
  fs.writeFileSync(file, await pdf.save({ useObjectStreams: false }));
}

async function finishPublicationFurniture() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  for (const output of manifest.outputs) {
    const file = path.join(ROOT, V072_BOOKLET_OUTPUT_ROOT, output.file);
    await addPublicationFurniture(file, output);
    output.bytes = fs.statSync(file).size;
    output.sha256 = sha256(file);
  }
  manifest.renderContract.publicationSurface = 'dedicated print-only booklet composition; Browser Rulebook chrome is not part of the PDF surface';
  manifest.renderContract.runningFurniture = 'Applied after imposition to interior reader pages; covers remain free of generic browser print headers and footers.';
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

prepareDedicatedRuntime();
try {
  await import(`${pathToFileURL(RUNTIME_RENDERER).href}?dedicated=${Date.now()}`);
  await finishPublicationFurniture();
} finally {
  cleanupDedicatedRuntime();
}
