import { elementFromMarkup } from './common.mjs';

export async function render(spec) {
  // reference-card.js intentionally follows the stable browser /game-data route.
  // Keep that browser-only dependency out of Node authority-model imports; Vitest
  // and browser/render contexts resolve it only when this renderer is executed.
  const {
    loadReferenceRecordForFaceSpec,
    referenceCardMarkup,
  } = await import('../reference-card.js');

  const record = await loadReferenceRecordForFaceSpec(spec);
  const element = elementFromMarkup(referenceCardMarkup(record, spec.side, {
    version: spec.provenance.displayVersion || spec.provenance.version,
  }));
  element.dataset.faceId = spec.id;
  element.dataset.faceTemplate = spec.template;
  return {
    element,
    preparation: {
      parchment: false,
      fit: 'reference',
    },
  };
}
