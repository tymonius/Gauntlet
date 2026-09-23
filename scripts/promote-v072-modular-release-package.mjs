import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  V072_BOOKLET_MANIFEST,
  V072_BOOKLET_OUTPUT_ROOT,
  V072_MODULAR_BOOKLETS,
} from '../packages/rules/publication/v072-modular-booklets.mjs';

const ROOT = process.cwd();
const RELEASE = 'v0.7.2';
const RELEASE_ROOT = path.join(ROOT, 'releases', RELEASE);
const CURRENT_GAME = path.join(ROOT, 'packages', 'game-data', 'current-game.json');
const COMPLETE_RULES = path.join(ROOT, 'packages', 'rules', 'comprehensive', 'comprehensive-rules.md');
const MODULAR_MANIFEST = path.join(ROOT, V072_BOOKLET_OUTPUT_ROOT, V072_BOOKLET_MANIFEST);
const RELEASE_MANIFEST = path.join(RELEASE_ROOT, 'Gauntlet_v0.7.2_Manifest.json');

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const relative = file => path.relative(ROOT, file).replaceAll(path.sep, '/');

function releaseSourceFilename(publication) {
  return publication.filename.replace(/_Booklet\.pdf$/u, '.md');
}

function payloadEntry(file) {
  const bytes = fs.readFileSync(file);
  return {
    path: path.basename(file),
    sha256: hash(bytes),
    bytes: bytes.length,
  };
}

const releaseManifest = readJson(RELEASE_MANIFEST);
const modularManifest = readJson(MODULAR_MANIFEST);
const currentGameBytes = fs.readFileSync(CURRENT_GAME);
const completeRulesBytes = fs.readFileSync(COMPLETE_RULES);
const authoritySetId = hash(Buffer.concat([currentGameBytes, Buffer.from([0]), completeRulesBytes]));

if (releaseManifest.release_version !== RELEASE || !['candidate', 'current'].includes(releaseManifest.status)) {
  throw new Error('v0.7.2 release manifest is neither the staged candidate nor the current release.');
}
if (authoritySetId !== releaseManifest.authority_set_id) {
  throw new Error(`Current authority no longer matches frozen v0.7.2 authority set: ${authoritySetId}`);
}
if (modularManifest.releaseVersion !== RELEASE || modularManifest.status !== 'candidate-review-artifact') {
  throw new Error('Modular booklet manifest is not the v0.7.2 candidate artifact.');
}
if (modularManifest.authority?.sha256 !== hash(currentGameBytes)) {
  throw new Error('Modular booklet artifact was not rendered from the frozen current-game bytes.');
}

const outputById = new Map((modularManifest.outputs || []).map(output => [output.id, output]));
if (outputById.size !== V072_MODULAR_BOOKLETS.length) {
  throw new Error(`Expected ${V072_MODULAR_BOOKLETS.length} modular outputs; found ${outputById.size}.`);
}

const documents = [];
for (const publication of V072_MODULAR_BOOKLETS) {
  const output = outputById.get(publication.id);
  if (!output) throw new Error(`Missing modular output ${publication.id}.`);

  const sourceFrom = path.join(ROOT, publication.source);
  const sourceName = releaseSourceFilename(publication);
  const sourceTo = path.join(RELEASE_ROOT, sourceName);
  const bookletFrom = path.join(ROOT, V072_BOOKLET_OUTPUT_ROOT, publication.filename);
  const bookletTo = path.join(RELEASE_ROOT, publication.filename);

  if (!fs.existsSync(sourceFrom) || !fs.existsSync(bookletFrom)) {
    throw new Error(`Missing source or booklet for ${publication.id}.`);
  }
  if (hash(fs.readFileSync(bookletFrom)) !== output.sha256) {
    throw new Error(`${publication.id} booklet does not match the modular booklet manifest.`);
  }

  fs.copyFileSync(sourceFrom, sourceTo);
  fs.copyFileSync(bookletFrom, bookletTo);

  const sourcePayload = payloadEntry(sourceTo);
  const bookletPayload = payloadEntry(bookletTo);
  documents.push({
    id: publication.id,
    title: publication.title,
    maintained_source: publication.source,
    source: {
      path: relative(sourceTo),
      sha256: sourcePayload.sha256,
      bytes: sourcePayload.bytes,
    },
    booklet: {
      path: publication.filename,
      pages: output.bookletSides,
      sha256: bookletPayload.sha256,
      bytes: bookletPayload.bytes,
    },
  });
}

const completeRulesDocument = documents.find(document => document.id === 'complete-rules');
if (!completeRulesDocument) throw new Error('Complete Rules modular document is missing.');
if (completeRulesDocument.source.sha256 !== releaseManifest.binding_sources?.complete_rules?.sha256) {
  throw new Error('Promoted Complete Rules source drifted from the frozen release binding.');
}

releaseManifest.counts = {
  ...(releaseManifest.counts || {}),
  rules_documents: documents.length,
  print_pdfs: documents.length,
};
releaseManifest.modular_rules = {
  default_document: 'player-guide',
  documents,
};
releaseManifest.pdf_outputs = documents.map(document => ({
  key: `${document.id}-booklet`,
  path: document.booklet.path,
  pages: document.booklet.pages,
  sha256: document.booklet.sha256,
  bytes: document.booklet.bytes,
}));

const payloadFiles = [
  ...documents.map(document => path.join(RELEASE_ROOT, path.basename(document.source.path))),
  ...documents.map(document => path.join(RELEASE_ROOT, document.booklet.path)),
  path.join(RELEASE_ROOT, 'Gauntlet_v0.7.2_Canonical_Data.json'),
  path.join(RELEASE_ROOT, 'Gauntlet_v0.7.2_Starter_Decks.json'),
  path.join(RELEASE_ROOT, 'Gauntlet_v0.7.2_Source_Provenance.json'),
];
const uniquePayloadFiles = [...new Map(payloadFiles.map(file => [path.basename(file), file])).values()];
releaseManifest.payload_files = uniquePayloadFiles.map(payloadEntry);

writeJson(RELEASE_MANIFEST, releaseManifest);
console.log(`Promoted ${documents.length} modular rules sources and booklets into releases/v0.7.2/.`);
console.log(`Frozen authority set: ${authoritySetId}.`);
