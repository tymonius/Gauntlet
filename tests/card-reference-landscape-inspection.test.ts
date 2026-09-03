import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sharedInspection = readFileSync('card-reference/card-inspection.js', 'utf8');

describe('shared card inspector orientation', () => {
  it('uses renderer-reported orientation for unified face inspection', () => {
    expect(sharedInspection).toContain("portrait: Object.freeze({ width: 240, height: 336 })");
    expect(sharedInspection).toContain("landscape: Object.freeze({ width: 336, height: 240 })");
    expect(sharedInspection).toContain("data.type === 'gauntlet-face-inspect'");
    expect(sharedInspection).toContain("data.type === 'gauntlet-territory-inspect' || data.orientation === 'landscape'");
    expect(sharedInspection).toContain('data-face-inspection-host="true"');
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

  it('uses the inspection-host bridge instead of adding behavior parameters to unified face URLs', () => {
    expect(sharedInspection).toContain("if (!url.pathname.endsWith('/card-design/face-render.html'))");
    expect(sharedInspection).toContain("url.searchParams.set('inspection', '1')");
    expect(sharedInspection).toContain("data.type === 'gauntlet-face-art-inspect'");
  });
});
