import { elementFromMarkup } from './common.mjs';
import {
  loadReferenceRecordForFaceSpec,
  referenceCardMarkup,
} from '../reference-card.js';

export async function render(spec) {
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
