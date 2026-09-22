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
  String(manifest.current_package_path || '').replace(/\\/g, '/').replace(/\/+$/, '/'),
  String(release.current_package_path).replace(/\\/g, '/').replace(/\/+$/, '/'),
  'Current release manifest package path disagrees with lifecycle metadata.',
);

const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const payloads = manifest.payload_files;
assert(Array.isArray(payloads) && payloads.length > 0, 'Current release manifest has no payload_files.');

const mismatches = [];
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
  const actualSha256 = hash(bytes);
  if (bytes.length !== item.bytes || actualSha256 !== item.sha256) {
    mismatches.push({
      kind: 'payload',
      path: item.path,
      manifest_bytes: item.bytes,
      actual_bytes: bytes.length,
      manifest_sha256: item.sha256,
      actual_sha256: actualSha256,
    });
  }
  payloadByPath.set(item.path, { item, target, bytes, actualSha256 });
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

  const pdf = await PDFDocument.load(payload.bytes);
  const actualPages = pdf.getPageCount();
  if (
    payload.bytes.length !== output.bytes ||
    payload.actualSha256 !== output.sha256 ||
    actualPages !== output.pages
  ) {
    mismatches.push({
      kind: 'pdf_output',
      key: output.key,
      path: output.path,
      manifest_bytes: output.bytes,
      actual_bytes: payload.bytes.length,
      manifest_sha256: output.sha256,
      actual_sha256: payload.actualSha256,
      manifest_pages: output.pages,
      actual_pages: actualPages,
    });
  }
}

if (Number.isInteger(manifest.counts?.print_pdfs) && manifest.counts.print_pdfs !== pdfOutputs.length) {
  mismatches.push({
    kind: 'count',
    field: 'counts.print_pdfs',
    manifest_value: manifest.counts.print_pdfs,
    actual_value: pdfOutputs.length,
  });
}

const packagePrefix = String(release.current_package_path).replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '/');
const bindings = Object.entries(manifest.binding_sources ?? {});
assert(bindings.length > 0, 'Current release manifest has no binding_sources.');
for (const [key, binding] of bindings) {
  assert(binding && typeof binding.path === 'string' && binding.path.trim(), `Binding source ${key} has no path.`);
  const normalized = binding.path.replace(/\\/g, '/').replace(/^\/+/, '');
  const relative = normalized.startsWith(packagePrefix) ? normalized.slice(packagePrefix.length) : normalized;
  const payload = payloadByPath.get(relative);
  assert(payload, `Current release binding source is not present in payload_files: ${key} -> ${relative}`);
  if (binding.sha256) {
    assert.equal(payload.actualSha256, binding.sha256, `Current release binding source hash drifted: ${key}`);
  }
}

const modularDocuments = manifest.modular_rules?.documents;
if (Array.isArray(modularDocuments) && modularDocuments.length > 0) {
  assert.equal(
    manifest.modular_rules?.default_document,
    'player-guide',
    'Modular current release must identify the Player Guide as its default rules document.',
  );
  const requiredIds = [
    'player-guide',
    'military',
    'diplomats',
    'financiers',
    'intelligence',
    'mystics',
    'inquisition',
    'complete-rules',
  ];
  const documentById = new Map(modularDocuments.map((document) => [document?.id, document]));
  assert.equal(documentById.size, requiredIds.length, 'Modular current release must contain exactly eight uniquely identified rules documents.');

  for (const id of requiredIds) {
    const document = documentById.get(id);
    assert(document, `Modular current release is missing rules document: ${id}`);
    assert(document.source?.path, `Modular rules document ${id} has no source path.`);
    assert(document.booklet?.path, `Modular rules document ${id} has no booklet path.`);

    const sourceNormalized = String(document.source.path).replace(/\\/g, '/').replace(/^\/+/, '');
    const sourceRelative = sourceNormalized.startsWith(packagePrefix)
      ? sourceNormalized.slice(packagePrefix.length)
      : sourceNormalized;
    const sourcePayload = payloadByPath.get(sourceRelative);
    assert(sourcePayload, `Modular rules source is not present in payload_files: ${id} -> ${sourceRelative}`);
    if (document.source.sha256) {
      assert.equal(sourcePayload.actualSha256, document.source.sha256, `Modular rules source hash drifted: ${id}`);
    }
    if (Number.isInteger(document.source.bytes)) {
      assert.equal(sourcePayload.bytes.length, document.source.bytes, `Modular rules source byte count drifted: ${id}`);
    }

    const bookletPayload = payloadByPath.get(document.booklet.path);
    assert(bookletPayload, `Modular rules booklet is not present in payload_files: ${id} -> ${document.booklet.path}`);
    assert(pdfKeys.has(`${id}-booklet`), `Modular current release is missing PDF output ${id}-booklet.`);
    if (document.booklet.sha256) {
      assert.equal(bookletPayload.actualSha256, document.booklet.sha256, `Modular rules booklet hash drifted: ${id}`);
    }
  }

  for (const requiredBinding of ['complete_rules', 'canonical_data', 'approved_starters', 'source_provenance']) {
    assert(
      manifest.binding_sources?.[requiredBinding],
      `Modular current release manifest is missing required binding source: ${requiredBinding}`,
    );
  }
} else {
  for (const requiredBinding of ['rulebook', 'canonical_data', 'approved_starters']) {
    assert(manifest.binding_sources?.[requiredBinding], `Current release manifest is missing required binding source: ${requiredBinding}`);
  }
  assert(pdfKeys.has('rulebook-booklet'), 'Current release manifest is missing the canonical Rulebook booklet PDF output.');
}

if (mismatches.length) {
  console.error(`Current release payload manifest has ${mismatches.length} mismatch(es):`);
  console.error(JSON.stringify(mismatches, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    `Current release payload integrity passed: ${version}; ${payloads.length} declared files and ${pdfOutputs.length} PDFs match manifest bytes, hashes, and page counts.`,
  );
}
