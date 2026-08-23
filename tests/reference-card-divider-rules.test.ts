import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ruleColumns = readFileSync('card-design/card-rule-columns.css', 'utf8');
const dividerRules = readFileSync('card-design/reference-divider-rules.css', 'utf8');

describe('reference-card divider policy', () => {
  it('loads one shared divider policy on every production reference render surface', () => {
    expect(ruleColumns).toContain('@import url("reference-divider-rules.css")');
  });

  it('keeps horizontal rules out of reference-card bodies', () => {
    expect(dividerRules).toContain('.reference-card .reference-panel + .reference-panel');
    expect(dividerRules).toContain('.reference-card .reference-callout + .reference-callout');
    expect(dividerRules).toContain('.reference-card .reference-step-list li + li');
    expect(dividerRules).toContain('.reference-card .reference-option-list li + li');
    expect(dividerRules).toContain('.reference-card .reference-inline-banner');
    expect(dividerRules).toContain('border-top: 0 !important');
    expect(dividerRules).toContain('border-bottom: 0 !important');
  });

  it('restores the Universal header divider without restoring body dividers', () => {
    expect(dividerRules).toContain('.reference-card[data-component-id="universal-reference"] .reference-type-line span:last-child');
    expect(dividerRules).toContain('padding-top: 0.022in !important');
    expect(dividerRules).toContain('border-top: 0.65px solid color-mix(in srgb, var(--component-accent-ink) 38%, transparent) !important');
  });
});
