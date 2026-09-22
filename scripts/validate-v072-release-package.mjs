import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { V072_MODULAR_BOOKLETS } from '../packages/rules/publication/v072-modular-booklets.mjs';

const ROOT = process.cwd();
const RELEASE = 'v0.7.2';
const RELEASE_ROOT = path.join(ROOT, 'releases', RELEASE);
const MANIFEST_PATH = path.join(RELEASE_ROOT, 'Gauntlet_v0.7.2_Manifest.json');
const EXPECTED_AUTHORITY_SET = 'ab0125ae280accfb03d53bdadf5b6ae006f98aeab897e20a4b2269d89ed9eb84';

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

assert.equal(manifest.release_version, RELEASE, 'Release manifest version drifted.');
assert.equal(manifest.status, 'candidate', 'Pre-cutover v0.7.2 manifest must remain candidate.');
assert.equal(manifest.authority_set_id, EXPECTED_AUTHORITY_SET, 'Frozen authority set drifted.');
assert.equal(manifest.public_defaults?.website, 'v0.7.1', 'Pre-cutover website default must remain v0.7.1.');
assert.equal(manifest.public_defaults?.rules_arbiter, 'v0.7.1', 'Pre-cutover Rules Arbiter default must remain v0.7.1.');

const documents = manifest.modular_rules?.documents;
assert(Array.isArray(documents), 'Manifest is missing modular_rules.documents.');
assert.equal(documents.length, V072_MODULAR_BOOKLETS.length, 'Manifest must contain all eight modular rules documents.');
assert.equal(manifest.modular_rules?.default_document, 'player-guide', 'Player Guide must remain the default modular document.');

const byId = new Map(documents.map(document => [document.id, document]));
assert.equal(byId.size, V072_MODULAR_BOOKLETS.length, 'Modular document ids must be unique.');

for (const publication of V072_MODULAR_BOOKLETS) {
  const document = byId.get(publication.id);
  assert(document, `Missing modular document ${publication.id}.`);
  assert.equal(document.title, publication.title, `${publication.id} title drifted.`);
  assert.equal(document.maintained_source, publication.source, `${publication.id} maintained source drifted.`);

  const sourcePath = path.join(ROOT, document.source.path);
  assert(fs.existsSync(sourcePath), `Missing promoted source ${document.source.path}.`);
  const sourceBytes = fs.readFileSync(sourcePath);
  assert.equal(hash(sourceBytes), document.source.sha256, `${publication.id} source hash drifted.`);
  assert.equal(sourceBytes.length, document.source.bytes, `${publication.id} source byte count drifted.`);

  const bookletPath = path.join(RELEASE_ROOT, document.booklet.path);
  assert(fs.existsSync(bookletPath), `Missing promoted booklet ${document.booklet.path}.`);
  const bookletBytes = fs.readFileSync(bookletPath);
  assert.equal(hash(bookletBytes), document.booklet.sha256, `${publication.id} booklet hash drifted.`);
  assert.equal(bookletBytes.length, document.booklet.bytes, `${publication.id} booklet byte count drifted.`);
  const pdf = await PDFDocument.load(bookletBytes);
  assert.equal(pdf.getPageCount(), document.booklet.pages, `${publication.id} booklet page count drifted.`);
}

const completeRules = byId.get('complete-rules');
assert.equal(
  completeRules.source.sha256,
  manifest.binding_sources?.complete_rules?.sha256,
  'Complete Rules modular source must match the frozen Rules Arbiter binding.',
);

const pdfOutputs = manifest.pdf_outputs;
assert(Array.isArray(pdfOutputs), 'Manifest is missing pdf_outputs.');
assert.equal(pdfOutputs.length, V072_MODULAR_BOOKLETS.length, 'Manifest must declare eight booklet PDF outputs.');
for (const document of documents) {
  const output = pdfOutputs.find(item => item.key === `${document.id}-booklet`);
  assert(output, `Missing pdf_outputs entry for ${document.id}.`);
  assert.equal(output.path, document.booklet.path, `${document.id} PDF path drifted.`);
  assert.equal(output.sha256, document.booklet.sha256, `${document.id} PDF hash drifted.`);
  assert.equal(output.bytes, document.booklet.bytes, `${document.id} PDF bytes drifted.`);
  assert.equal(output.pages, document.booklet.pages, `${document.id} PDF pages drifted.`);
}

const payloads = manifest.payload_files;
assert(Array.isArray(payloads) && payloads.length > 0, 'Manifest is missing payload_files.');
const payloadNames = new Set();
for (const payload of payloads) {
  assert(!payloadNames.has(payload.path), `Duplicate payload path ${payload.path}.`);
  payloadNames.add(payload.path);
  const target = path.join(RELEASE_ROOT, payload.path);
  assert(fs.existsSync(target), `Missing release payload ${payload.path}.`);
  const bytes = fs.readFileSync(target);
  assert.equal(hash(bytes), payload.sha256, `Release payload hash drifted: ${payload.path}.`);
  assert.equal(bytes.length, payload.bytes, `Release payload byte count drifted: ${payload.path}.`);
}

for (const document of documents) {
  assert(payloadNames.has(path.basename(document.source.path)), `Source is absent from payload_files: ${document.source.path}.`);
  assert(payloadNames.has(document.booklet.path), `Booklet is absent from payload_files: ${document.booklet.path}.`);
}
for (const required of [
  'Gauntlet_v0.7.2_Canonical_Data.json',
  'Gauntlet_v0.7.2_Starter_Decks.json',
  'Gauntlet_v0.7.2_Source_Provenance.json',
]) {
  assert(payloadNames.has(required), `Required payload is missing: ${required}.`);
}

for (const [key, binding] of Object.entries(manifest.binding_sources || {})) {
  const target = path.join(ROOT, binding.path);
  assert(fs.existsSync(target), `Binding source is missing: ${key} -> ${binding.path}.`);
  assert.equal(hash(fs.readFileSync(target)), binding.sha256, `Binding source hash drifted: ${key}.`);
}

assert.equal(manifest.counts?.rules_documents, 8, 'Manifest rules_documents count must be eight.');
assert.equal(manifest.counts?.print_pdfs, 8, 'Manifest print_pdfs count must be eight.');

console.log('Validated staged v0.7.2 modular release package: 8 sources, 8 booklet PDFs, frozen authority bindings, and payload hashes are complete.');
