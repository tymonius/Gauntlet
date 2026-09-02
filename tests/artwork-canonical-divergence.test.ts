import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const compositor = readFileSync('card-design/artwork-compositor.js', 'utf8');
const authoringClient = readFileSync('card-design/artwork-authoring-client.js', 'utf8');
const compositorCss = readFileSync('card-design/artwork-compositor.css', 'utf8');
const targets = readFileSync('card-design/artwork-compositor-targets.js', 'utf8');

describe('artwork composition canonical guardrails', () => {
  it('publishes the approved Banker composition into current-game authority', () => {
    expect(currentGame.artDirection['financiers-banker']).toEqual({ focusY: 0 });
  });

  it('visibly identifies unpublished browser/working-batch composition drift', () => {
    expect(compositor).toContain('draftDiffersFromCanonical(target)');
    expect(compositor).toContain('art-compositor-divergent-source');
    expect(compositor).toContain('UNPUBLISHED ART POSITION');
    expect(compositor).toContain('GAUNTLET_ART_DIRECTION_DIVERGENCES');
    expect(compositorCss).toContain('outline: 4px solid #c62828');
    expect(compositorCss).toContain('art-compositor-divergence-summary');
  });

  it('never hydrates an idle working branch as Card Design authority', () => {
    expect(authoringClient).toContain('const WORKING_PR_API');
    expect(authoringClient).toContain('if (!openPr?.number)');
    expect(authoringClient).toContain('installWorkingDirections({})');
    expect(authoringClient).toContain('directionDelta(canonicalDirections, workingDirections)');
    expect(authoringClient).toContain('The working branch by itself is never authoritative');
  });

  it('supports unpublished removal of a canonical override without losing the distinction', () => {
    expect(authoringClient).toContain('drafts[payload.id] = null');
    expect(compositor).toContain("Object.prototype.hasOwnProperty.call(drafts, target.id)");
    expect(compositor).toContain("draft && typeof draft === 'object' ? draft : {}");
  });

  it('fails a save visibly instead of persisting a browser-only fallback', () => {
    expect(compositor).toContain('Save failed. Nothing was persisted outside this open editor');
    expect(compositor).toContain('if (unpublished) writeDraft(state.id, direction)');
    expect(compositor).toContain('else clearDraft(state.id)');
    expect(compositor).not.toContain('Saved as a browser draft and applied here');
  });

  it('forces browsers to load the guardrail-enabled authoring client', () => {
    expect(targets).toContain('artwork-authoring-client.js?v=20260902-1');
  });
});
