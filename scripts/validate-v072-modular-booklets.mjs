import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  V072_BOOKLET_HERO_WOODCUTS,
  V072_BOOKLET_MANIFEST,
  V072_BOOKLET_OUTPUT_ROOT,
  V072_BOOKLET_RELEASE_VERSION,
  V072_MODULAR_BOOKLETS,
} from '../packages/rules/publication/v072-modular-booklets.mjs';

const ROOT = process.cwd();
const OUTPUT_ROOT = path.resolve(ROOT, process.env.GAUNTLET_V072_BOOKLET_OUTPUT || V072_BOOKLET_OUTPUT_ROOT);
const MANIFEST_PATH = path.join(OUTPUT_ROOT, V072_BOOKLET_MANIFEST);
const AUTHORITY_PATH = path.join(ROOT, 'packages', 'game-data', 'current-game.json');
const LETTER_LANDSCAPE = Object.freeze({ width: 792, height: 612 });
const tolerance = 0.75;

const hashBytes = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = file => hashBytes(fs.readFileSync(file));

function closeEnough(actual, expected) {
  return Math.abs(actual - expected) <= tolerance;
}

if (!fs.existsSync(MANIFEST_PATH)) throw new Error(`Missing modular booklet manifest: ${MANIFEST_PATH}`);
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
if (manifest.releaseVersion !== V072_BOOKLET_RELEASE_VERSION) {
  throw new Error(`Manifest release version is ${manifest.releaseVersion}; expected ${V072_BOOKLET_RELEASE_VERSION}.`);
}
if (manifest.status !== 'candidate-review-artifact') throw new Error(`Unexpected modular booklet manifest status: ${manifest.status}.`);
if (manifest.authority?.sha256 !== hashFile(AUTHORITY_PATH)) throw new Error('Modular booklet authority hash is stale.');
if (!/hero-woodcut pages placed preferentially at semantic section boundaries/i.test(manifest.renderContract?.pagePadding || '')) {
  throw new Error('Modular booklet manifest does not declare semantic hero-woodcut padding.');
}

const heroById = new Map(V072_BOOKLET_HERO_WOODCUTS.map(hero => [hero.id, hero]));
for (const hero of V072_BOOKLET_HERO_WOODCUTS) {
  const heroPath = path.join(ROOT, hero.source);
  if (!fs.existsSync(heroPath) || !fs.statSync(heroPath).isFile()) {
    throw new Error(`Missing registered booklet hero woodcut: ${hero.source}.`);
  }
}

const outputById = new Map((manifest.outputs || []).map(output => [output.id, output]));
if (outputById.size !== V072_MODULAR_BOOKLETS.length) {
  throw new Error(`Manifest lists ${outputById.size} outputs; expected ${V072_MODULAR_BOOKLETS.length}.`);
}

const { PDFDocument } = await import('pdf-lib');
for (const publication of V072_MODULAR_BOOKLETS) {
  const output = outputById.get(publication.id);
  if (!output) throw new Error(`Manifest is missing ${publication.id}.`);
  if (output.file !== publication.filename) throw new Error(`${publication.id} filename drifted: ${output.file}.`);
  if (output.source?.path !== publication.source) throw new Error(`${publication.id} source path drifted: ${output.source?.path}.`);

  const sourcePath = path.join(ROOT, publication.source);
  if (output.source.sha256 !== hashFile(sourcePath)) throw new Error(`${publication.id} source hash is stale.`);

  const bookletPath = path.join(OUTPUT_ROOT, output.file);
  if (!fs.existsSync(bookletPath)) throw new Error(`Missing ${publication.id} booklet: ${bookletPath}`);
  const bytes = fs.readFileSync(bookletPath);
  if (bytes.length !== output.bytes) throw new Error(`${publication.id} byte count does not match the manifest.`);
  if (hashBytes(bytes) !== output.sha256) throw new Error(`${publication.id} SHA-256 does not match the manifest.`);
  if (bytes.length < 10000) throw new Error(`${publication.id} booklet is unexpectedly small: ${bytes.length} bytes.`);

  if (!Number.isInteger(output.logicalPages) || output.logicalPages < 1) throw new Error(`${publication.id} has invalid logical page count.`);
  if (!Number.isInteger(output.paddedPages) || output.paddedPages < output.logicalPages || output.paddedPages % 4 !== 0) {
    throw new Error(`${publication.id} has invalid padded page count ${output.paddedPages}.`);
  }
  if (!Array.isArray(output.interstitials)) throw new Error(`${publication.id} is missing interstitial metadata.`);
  if (output.interstitials.length !== output.paddedPages - output.logicalPages) {
    throw new Error(`${publication.id} interstitial count does not match its booklet padding.`);
  }
  if (output.interstitials.length > 3) throw new Error(`${publication.id} uses more than three padding interstitials.`);
  for (const interstitial of output.interstitials) {
    if (!interstitial.anchorId && !interstitial.id) {
      throw new Error(`${publication.id} interstitial is missing its semantic anchor.`);
    }
    const hero = heroById.get(interstitial.heroId);
    if (!hero) throw new Error(`${publication.id} interstitial uses unregistered hero ${interstitial.heroId}.`);
    if (interstitial.heroSource !== hero.source) {
      throw new Error(`${publication.id} interstitial hero source drifted for ${interstitial.heroId}.`);
    }
  }

  if (output.bookletSides !== output.paddedPages / 2) throw new Error(`${publication.id} booklet side count is inconsistent with imposition.`);
  if (output.physicalSheets !== output.paddedPages / 4) throw new Error(`${publication.id} physical sheet count is inconsistent with imposition.`);

  const pdf = await PDFDocument.load(bytes);
  if (pdf.getPageCount() !== output.bookletSides) {
    throw new Error(`${publication.id} PDF contains ${pdf.getPageCount()} sheet sides; manifest says ${output.bookletSides}.`);
  }
  for (const [index, page] of pdf.getPages().entries()) {
    const { width, height } = page.getSize();
    if (!closeEnough(width, LETTER_LANDSCAPE.width) || !closeEnough(height, LETTER_LANDSCAPE.height)) {
      throw new Error(`${publication.id} side ${index + 1} is ${width}x${height}pt; expected Letter landscape.`);
    }
  }
  console.log(
    `Validated ${publication.title}: ${output.logicalPages} logical pages + ${output.interstitials.length} woodcut interstitials -> ${output.bookletSides} booklet sides on ${output.physicalSheets} sheets.`,
  );
}

const expectedIds = new Set(V072_MODULAR_BOOKLETS.map(publication => publication.id));
for (const id of outputById.keys()) {
  if (!expectedIds.has(id)) throw new Error(`Manifest contains unexpected modular booklet output: ${id}.`);
}

console.log(`Validated all ${V072_MODULAR_BOOKLETS.length} v0.7.2 modular rules booklets.`);