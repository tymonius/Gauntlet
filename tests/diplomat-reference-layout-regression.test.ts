import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('card-design/reference-card.css', 'utf8');
const parchmentCss = readFileSync('card-design/card-parchment.css', 'utf8');

describe('Diplomat reference visual regressions', () => {
  it('keeps faction parchment available even when runtime parchment hydration races', () => {
    expect(css).toContain('--reference-parchment-image: url("../images/artwork/card-backgrounds/diplomats-parchment-v2.png")');
    expect(css).toContain('var(--parchment-image, var(--reference-parchment-image))');
    expect(css).toContain('--reference-parchment-image: url("../images/artwork/card-backgrounds/financiers-parchment-v2.png")');
    expect(css).toContain('--reference-parchment-image: url("../images/artwork/card-backgrounds/intelligence-parchment-v2.png")');
    expect(css).toContain('--reference-parchment-image: url("../images/artwork/card-backgrounds/mystics-parchment-v2.png")');
    expect(css).toContain('--reference-parchment-image: url("../images/artwork/card-backgrounds/inquisition-parchment-v2.png")');

    // card-parchment.css deliberately initializes ordinary cards to `none` until
    // card-design.js hydrates them. Reference faces are asynchronously replaced,
    // so they must override that sentinel with their faction CSS source.
    expect(parchmentCss).toContain('.gauntlet-card {\n  --parchment-image: none;');
    expect(parchmentCss).toContain('.reference-card[data-faction] {\n  --parchment-image: var(--reference-parchment-image);');
  });

  it('renders the Diplomat front as one vertical flow rather than two columns', () => {
    const frontRule = css.match(/\.reference-card\[data-component-id="diplomats-reference"\]\[data-reference-side="front"\] \.reference-body \{([\s\S]*?)\n\}/)?.[1] || '';
    expect(frontRule).toContain('display: flex');
    expect(frontRule).toContain('flex-direction: column');
    expect(frontRule).not.toContain('grid-template-columns');
  });

  it('uses consistent section dividers and deliberate internal spacing on both faces', () => {
    expect(css).toContain('[data-reference-side] .reference-panel + .reference-panel');
    expect(css).toContain('border-top: 0.55px solid color-mix(in srgb, var(--component-accent-ink) 30%, transparent)');
    expect(css).toContain('[data-reference-side] .reference-callout + .reference-callout');
    expect(css).toContain('padding-top: calc(0.010in * var(--reference-rules-scale))');
    expect(css).toContain('[data-reference-section="leverage"] .reference-panel-content');
    expect(css).toContain('row-gap: calc(0.010in * var(--reference-rules-scale))');
  });
});
