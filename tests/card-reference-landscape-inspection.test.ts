import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sharedInspection = readFileSync('card-reference/card-inspection.js', 'utf8');

describe('shared card inspector orientation', () => {
  it('uses the landscape 3.5 × 2.5 proportions for Territory cards', () => {
    expect(sharedInspection).toContain("portrait: Object.freeze({ width: 240, height: 336 })");
    expect(sharedInspection).toContain("landscape: Object.freeze({ width: 336, height: 240 })");
    expect(sharedInspection).toContain("data.type === 'gauntlet-territory-inspect' ? 'landscape' : 'portrait'");
  });

  it('persists the active card format through inspection history', () => {
    expect(sharedInspection).toContain('cardFormat: currentCardFormat');
    expect(sharedInspection).toContain('const cardFormat = normalizeCardFormat(inspectionState.cardFormat)');
    expect(sharedInspection).toContain('openCard(cardHref, label, false, cardFormat)');
  });

  it('scales the stage from the active card dimensions instead of portrait constants', () => {
    expect(sharedInspection).toContain('const { width, height } = currentCardDimensions()');
    expect(sharedInspection).toContain('availableWidth / width');
    expect(sharedInspection).toContain('availableHeight / height');
    expect(sharedInspection).toContain('cardFrame.style.width = `${width}px`');
    expect(sharedInspection).toContain('cardFrame.style.height = `${height}px`');
  });
});
