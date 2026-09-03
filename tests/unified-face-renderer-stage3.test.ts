import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FACE_TEMPLATES } from '../card-design/face-authority.mjs';
import { FACE_TEMPLATE_RENDERERS } from '../card-design/face-template-registry.mjs';

const shell = readFileSync('card-design/face-render.html', 'utf8');
const runtime = readFileSync('card-design/face-render.mjs', 'utf8');
const registry = readFileSync('card-design/face-template-registry.mjs', 'utf8');
const faceSpec = readFileSync('card-design/face-spec.mjs', 'utf8');
const trackerTemplate = readFileSync('card-design/face-templates/tracker.mjs', 'utf8');
const referenceTemplate = readFileSync('card-design/face-templates/reference.mjs', 'utf8');
const referenceRenderer = readFileSync('card-design/reference-card.js', 'utf8');
const componentRenderer = readFileSync('card-design/component-render.js', 'utf8');
const productionPrint = readFileSync('deckbuilder/production-print.js', 'utf8');
const cardReference = readFileSync('card-reference/app.js', 'utf8');

describe('Stage 3 unified face renderer', () => {
  it('has exactly one public request input: canonical face id', () => {
    expect(runtime).toContain("query.get('id')");
    expect(runtime).not.toContain("query.get('kind')");
    expect(runtime).not.toContain("query.get('side')");
    expect(runtime).not.toContain("query.get('template')");
    expect(runtime).not.toContain("query.get('orientation')");
    expect(runtime).toContain('resolveFaceSpec(game, faceIdFromLocation())');
  });

  it('keeps all face-family dispatch inside the template registry', () => {
    expect(Object.keys(FACE_TEMPLATE_RENDERERS).sort()).toEqual(Object.keys(FACE_TEMPLATES).sort());
    expect(runtime).toContain('rendererForTemplate(spec.template)');
    expect(registry).toContain("'standard-back': standardBack");
    expect(runtime).not.toMatch(/spec\.template\s*===/);
    expect(runtime).not.toMatch(/spec\.template\s*!==/);
  });

  it('renders a single FaceSpec directly with no catalog extraction lifecycle', () => {
    expect(shell).toContain('id="renderTarget"');
    expect(shell).toContain('/card-design/face-render.mjs');
    expect(shell).not.toContain('leaderReviewSections');
    expect(shell).not.toContain('proposalReviewSections');
    expect(shell).not.toContain('riteReviewSections');
    expect(shell).not.toContain('supplementalReviewSections');

    for (const forbidden of [
      'MutationObserver',
      'dispatchEvent(new Event',
      'replaceChildren(card)',
      'selectedCard()',
      'waitForLeader',
      'querySelector(' + String.fromCharCode(96) + '#proposal-',
    ]) {
      expect(runtime).not.toContain(forbidden);
    }
  });

  it('fails closed when authority is incomplete instead of invoking a fallback renderer', () => {
    expect(runtime).toContain('if (!spec.readiness.productionReady)');
    expect(runtime).toContain('spec.readiness.issues.join');
    expect(faceSpec).toContain("'artwork-composition-not-final'");
    expect(faceSpec).not.toContain("'tracker-presentation-still-legacy'");
    expect(faceSpec).toContain("'tracker-presentation-missing'");
    expect(faceSpec).not.toContain("'reference-presentation-still-legacy'");
    expect(faceSpec).toContain("'reference-selector-missing'");
  });

  it('renders trackers directly from canonical presentation data', () => {
    expect(trackerTemplate).toContain('spec.content');
    expect(trackerTemplate).toContain('presentation.scaleMaximum');
    expect(trackerTemplate).toContain("fit: 'tracker'");
    expect(trackerTemplate).not.toContain('military-command-tracker');
    expect(trackerTemplate).not.toContain('intelligence-operation-progress-tracker');
    expect(runtime).toContain('tracker: fitTracker');
  });

  it('renders reference faces from canonical FaceSpec source data', () => {
    expect(referenceTemplate).toContain('loadReferenceRecordForFaceSpec(spec)');
    expect(referenceTemplate).toContain('referenceCardMarkup(record, spec.side');
    expect(referenceTemplate).toContain("fit: 'reference'");
    expect(referenceRenderer).not.toContain('REFERENCE_PRESENTATION');
    expect(referenceRenderer).not.toContain('installDiplomatReferenceStyles');
    expect(runtime).toContain('reference: fitReferenceCard');
  });

  it('does not cut any production consumer over during parallel construction', () => {
    expect(componentRenderer).not.toContain('/card-design/face-render.html');
    expect(productionPrint).not.toContain('/card-design/face-render.html');
    expect(cardReference).not.toContain('/card-design/face-render.html');
  });

  it('contains no compatibility routing or family-specific public aliases', () => {
    expect(runtime).not.toContain('window.location.replace');
    expect(shell).not.toContain('window.location.replace');
    expect(runtime).not.toContain('component-render.html');
    expect(runtime).not.toContain('card-review-render.html');
    expect(runtime).not.toContain('territory-review-render.html');
  });
});
