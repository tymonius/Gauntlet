export const V072_BOOKLET_RELEASE_VERSION = 'v0.7.2';
export const V072_BOOKLET_AUTHORITY_PREFIX = 'v0.7.2';
export const V072_BOOKLET_OUTPUT_ROOT = 'artifacts/rules-booklets/v0.7.2';
export const V072_BOOKLET_MANIFEST = 'Gauntlet_v0.7.2_Modular_Rules_Manifest.json';

export const V072_BOOKLET_HERO_WOODCUTS = Object.freeze([
  Object.freeze({
    id: 'hero-1',
    source: 'images/woodcuts/hero compositions/hero 1.png',
    publicUrl: '/images/woodcuts/hero compositions/hero 1.png',
  }),
  Object.freeze({
    id: 'hero-2',
    source: 'images/woodcuts/hero compositions/hero 2.png',
    publicUrl: '/images/woodcuts/hero compositions/hero 2.png',
  }),
  Object.freeze({
    id: 'hero-3',
    source: 'images/woodcuts/hero compositions/hero 3.png',
    publicUrl: '/images/woodcuts/hero compositions/hero 3.png',
  }),
  Object.freeze({
    id: 'hero-4',
    source: 'images/woodcuts/hero compositions/hero 4.png',
    publicUrl: '/images/woodcuts/hero compositions/hero 4.png',
  }),
]);

export const V072_MODULAR_BOOKLETS = Object.freeze([
  Object.freeze({
    id: 'player-guide',
    title: "Player's Guide",
    source: 'packages/rules/player-guide/player-guide.md',
    filename: 'Gauntlet_v0.7.2_Player_Guide_Booklet.pdf',
  }),
  Object.freeze({
    id: 'military',
    title: 'Military Guide',
    source: 'packages/rules/faction-guides/military.md',
    filename: 'Gauntlet_v0.7.2_Military_Guide_Booklet.pdf',
  }),
  Object.freeze({
    id: 'diplomats',
    title: 'Diplomats Guide',
    source: 'packages/rules/faction-guides/diplomats.md',
    filename: 'Gauntlet_v0.7.2_Diplomats_Guide_Booklet.pdf',
  }),
  Object.freeze({
    id: 'financiers',
    title: 'Financiers Guide',
    source: 'packages/rules/faction-guides/financiers.md',
    filename: 'Gauntlet_v0.7.2_Financiers_Guide_Booklet.pdf',
  }),
  Object.freeze({
    id: 'intelligence',
    title: 'Intelligence Guide',
    source: 'packages/rules/faction-guides/intelligence.md',
    filename: 'Gauntlet_v0.7.2_Intelligence_Guide_Booklet.pdf',
  }),
  Object.freeze({
    id: 'mystics',
    title: 'Mystics Guide',
    source: 'packages/rules/faction-guides/mystics.md',
    filename: 'Gauntlet_v0.7.2_Mystics_Guide_Booklet.pdf',
  }),
  Object.freeze({
    id: 'inquisition',
    title: 'Inquisition Guide',
    source: 'packages/rules/faction-guides/inquisition.md',
    filename: 'Gauntlet_v0.7.2_Inquisition_Guide_Booklet.pdf',
  }),
  Object.freeze({
    id: 'complete-rules',
    title: 'Complete Rules',
    source: 'packages/rules/comprehensive/comprehensive-rules.md',
    filename: 'Gauntlet_v0.7.2_Complete_Rules_Booklet.pdf',
  }),
]);

export function v072BookletOutputPath(publication) {
  return `${V072_BOOKLET_OUTPUT_ROOT}/${publication.filename}`;
}

export function v072BookletReaderFilename(publication) {
  const filename = String(publication?.filename || '');
  if (!filename.endsWith('_Booklet.pdf')) {
    throw new Error(`Cannot derive reader-order PDF filename from ${filename || "missing filename"}.`);
  }
  return filename.replace(/_Booklet\.pdf$/u, '_Reader.pdf');
}

export function v072BookletReaderOutputPath(publication) {
  return `${V072_BOOKLET_OUTPUT_ROOT}/${v072BookletReaderFilename(publication)}`;
}

export function v072BookletManifestPath() {
  return `${V072_BOOKLET_OUTPUT_ROOT}/${V072_BOOKLET_MANIFEST}`;
}

export function v072BookletImposition(paddedPages, sheetIndex) {
  if (!Number.isInteger(paddedPages) || paddedPages < 4 || paddedPages % 4 !== 0) {
    throw new Error(`Booklet page count must be a positive multiple of four; received ${paddedPages}.`);
  }
  const sheets = paddedPages / 4;
  if (!Number.isInteger(sheetIndex) || sheetIndex < 0 || sheetIndex >= sheets) {
    throw new Error(`Booklet sheet index ${sheetIndex} is outside 0-${sheets - 1}.`);
  }
  return Object.freeze({
    front: Object.freeze([paddedPages - (2 * sheetIndex), 1 + (2 * sheetIndex)]),
    back: Object.freeze([2 + (2 * sheetIndex), paddedPages - 1 - (2 * sheetIndex)]),
  });
}