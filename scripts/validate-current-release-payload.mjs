import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const root = process.cwd();
const lifecycle = JSON.parse(fs.readFileSync(path.join(root, 'config/release-lifecycle.json'), 'utf8'));
const version = lifecycle.current_release;
const release = lifecycle.releases?.[version];

assert(version, 'Release lifecycle does not define current_release.');
assert(release, `Release lifecycle is missing ${version}.`);
assert.equal(release.status, 'current', `${version} is not marked current.`);
assert.equal(release.public_cutover, true, `${version} is not marked for public cutover.`);
assert(release.current_package_path, `${version} has no current_package_path.`);

const packageRoot = path.resolve(root, String(release.current_package_path));
assert(packageRoot.startsWith(root + path.sep), 'Current package path escapes repository root.');
assert(fs.statSync(packageRoot).isDirectory(), `Current package directory is missing: ${release.current_package_path}`);

const manifestName = `Gauntlet_${version}_Manifest.json`;
const manifestPath = path.join(packageRoot, manifestName);
assert(fs.existsSync(manifestPath), `Current release manifest is missing: ${manifestName}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.release_version, version, 'Current release manifest version drifted.');
assert.equal(manifest.status, 'current', 'Current release manifest is not marked current.');
assert.equal(
  String(manifest.current_package_path || '').replace(/\\/g, '/').replace(/\/+$/, '/') ,
  String(release.current_package_path).replace(/\\/g, '/').replace(/\/+$/, '/'),
  'Current release manifest package path disagrees with lifecycle metadata.',
);

const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const payloads = manifest.payload_files;
assert(Array.isArray(payloads) && payloads.length > 0, 'Current release manifest has no payload_files.');

const payloadByPath = new Map();
for (const item of payloads) {
  assert(item && typeof item.path === 'string' && item.path.trim(), 'Manifest payload has no path.');
  assert(!path.isAbsolute(item.path), `Manifest payload is absolute: ${item.path}`);
  const target = path.resolve(packageRoot, item.path);
  assert(target.startsWith(packageRoot + path.sep), `Manifest payload escapes package root: ${item.path}`);
  assert(!payloadByPath.has(item.path), `Manifest payload is duplicated: ${item.path}`);
  assert(fs.existsSync(target), `Declared current release payload is missing: ${item.path}`);
  assert(fs.statSync(target).isFile(), `Declared current release payload is not a file: ${item.path}`);

  const bytes = fs.readFileSync(target);
  assert.equal(bytes.length, item.bytes, `Payload byte count mismatch: ${item.path}`);
  assert.equal(hash(bytes), item.sha256, `Payload SHA-256 mismatch: ${item.path}`);
  payloadByPath.set(item.path, { item, target, bytes });
}

const pdfOutputs = manifest.pdf_outputs;
assert(Array.isArray(pdfOutputs) && pdfOutputs.length > 0, 'Current release manifest has no pdf_outputs.');
const pdfKeys = new Set();
for (const output of pdfOutputs) {
  assert(output && typeof output.key === 'string' && output.key.trim(), 'PDF output has no key.');
  assert(!pdfKeys.has(output.key), `PDF output key is duplicated: ${output.key}`);
  pdfKeys.add(output.key);
  const payload = payloadByPath.get(output.path);
  assert(payload, `PDF output is not present in payload_files: ${output.path}`);
  assert.equal(payload.item.bytes, output.bytes, `PDF output byte count disagrees with payload entry: ${output.path}`);
  assert.equal(payload.item.sha256, output.sha256, `PDF output hash disagrees with payload entry: ${output.path}`);
  const pdf = await PDFDocument.load(payload.bytes);
  assert.equal(pdf.getPageCount(), output.pages, `PDF page count mismatch: ${output.path}`);
}

if (Number.isInteger(manifest.counts?.print_pdfs)) {
  assert.equal(manifest.counts.print_pdfs, pdfOutputs.length, 'Manifest print_pdfs count disagrees with pdf_outputs.');
}

for (const required of [
  `Gauntlet_${version}_Rulebook.md`,
  `Gauntlet_${version}_Rulebook.pdf`,
  `Gauntlet_${version}_Rulebook_Booklet.pdf`,
  `Gauntlet_${version}_Canonical_Data.json`,
  `Gauntlet_${version}_Starter_Decks.json`,
  `Gauntlet_${version}_Deck_Export_Schema.json`,
  `Gauntlet_${version}_Card_and_Territory_Reference.md`,
  `Gauntlet_${version}_Card_and_Territory_Reference.pdf`,
  `Gauntlet_${version}_Starter_Deck_Catalog.md`,
  `Gauntlet_${version}_Starter_Deck_Catalog.pdf`,
]) {
  assert(payloadByPath.has(required), `Current release manifest is missing required payload: ${required}`);
}

console.log(
  `Current release payload integrity passed: ${version}; ${payloads.length} declared files and ${pdfOutputs.length} PDFs match manifest bytes, hashes, and page counts.`,
);
