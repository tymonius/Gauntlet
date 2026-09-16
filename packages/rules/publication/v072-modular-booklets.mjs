export const V072_BOOKLET_RELEASE_VERSION = 'v0.7.2';
export const V072_BOOKLET_AUTHORITY_PREFIX = 'v0.7.2';
export const V072_BOOKLET_OUTPUT_ROOT = 'artifacts/rules-booklets/v0.7.2';
export const V072_BOOKLET_MANIFEST = 'Gauntlet_v0.7.2_Modular_Rules_Manifest.json';

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

export function v072BookletManifestPath() {
  return `${V072_BOOKLET_OUTPUT_ROOT}/${V072_BOOKLET_MANIFEST}`;
}
