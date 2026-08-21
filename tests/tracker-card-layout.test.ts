import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const renderer = readFileSync('card-design/supplemental-card.js', 'utf8');
const styles = readFileSync('card-design/supplemental-card.css', 'utf8');
const contract = JSON.parse(readFileSync('config/tts-component-contract.json', 'utf8'));

const trackerById = new Map(
  contract.components
    .filter((component: { family?: string }) => component.family === 'tracker')
    .map((component: { id: string }) => [component.id, component]),
);

describe('tracker card cap layout', () => {
  it('uses standard resource caps and preserves derived/uncapped tracker semantics', () => {
    expect(trackerById.get('military-command-tracker')?.trackedValue?.maximum).toBe(2);
    expect(trackerById.get('diplomats-influence-tracker')?.trackedValue?.maximum).toBe(10);
    expect(trackerById.get('financiers-capital-limit-tracker')?.trackedValue?.maximum).toBeNull();
    expect(trackerById.get('financiers-capital-limit-tracker')?.trackedValue?.starting).toBe(3);
    expect(trackerById.get('intelligence-intel-tracker')?.trackedValue?.maximum).toBeNull();
    expect(trackerById.get('intelligence-operation-progress-tracker')?.trackedValue?.maximum).toBeNull();
    expect(trackerById.get('inquisition-conviction-tracker')?.trackedValue?.maximum).toBe(4);
    expect(renderer).toContain('Standard ${resourceName} cap · ${component.resourceMaximum}');
    expect(renderer).toContain('Standard ${resourceName} cap · none');
    expect(renderer).toContain("component.contractId === 'financiers-capital-limit-tracker'");
    expect(renderer).toContain('Rules maximum · none');
    expect(renderer).toContain("component.contractId === 'intelligence-operation-progress-tracker'");
    expect(renderer).toContain('tracker-cap tracker-cap-empty');
    expect(styles).toContain('border-top: 0.65px solid var(--tracker-line-soft);');
  });

  it('measures the instruction block and fills the remaining tracker field with fixed gaps', () => {
    expect(renderer).not.toContain('Physical scale ·');
    expect(renderer).not.toContain('0 = fully covered');
    expect(renderer).toContain('tracker-instructions');
    expect(renderer).toContain('Place faction leader card on top of this tracker and slide it upward or downward');
    expect(renderer).toContain('current Capital Limit value.');
    expect(styles).toContain('font-family: "adobe-caslon-pro", Georgia, serif;');
    expect(styles).toContain('font-style: italic;');
    expect(styles).toContain('-webkit-text-size-adjust: 100%;');
    expect(styles).toContain('text-size-adjust: 100%;');
    expect(renderer).toContain('TRACKER_CAP_INSTRUCTION_GAP_IN = 0.02');
    expect(renderer).toContain('TRACKER_INSTRUCTION_SCALE_GAP_IN = 0.05');
    expect(renderer).toContain('instructionRect.bottom - interiorRect.top');
    expect(renderer).toContain('interiorRect.bottom - footerRect.top');
    expect(renderer).toContain("scale.style.height = 'auto'");
    expect(renderer).toContain("card.dataset.trackerLayout = 'measured'");
  });

  it('uses a 1–15 visible Capital Limit scale with zero represented by full cover', () => {
    expect(renderer).toMatch(/'financiers-capital-limit-tracker'\s*:\s*\{[\s\S]*?max:\s*15/);
    expect(renderer).toContain('Array.from({ length: max }, (_, index) => index + 1)');
    expect(renderer).toContain('Registration bands 1 through ${max}');
    expect(renderer).toContain('physical scale 0 through ${max}');
  });

  it('shortens only the Operation Progress face title while retaining the normal tracker-title pattern elsewhere', () => {
    expect(renderer).toContain('function trackerTitle(component, resourceName)');
    expect(renderer).toContain("component.contractId === 'intelligence-operation-progress-tracker'");
    expect(renderer).toContain('? resourceName');
    expect(renderer).toContain(': `${resourceName} Tracker`');
    expect(renderer).toContain('<h3>${esc(title)}</h3>');
  });

  it('shrinks tracker titles when needed instead of clipping long names', () => {
    expect(renderer).toContain('TRACKER_TITLE_MIN_PT = 9.5');
    expect(renderer).toContain('title.scrollWidth > title.clientWidth + 0.5');
    expect(renderer).toContain('title.style.fontSize = `${fontSize}px`');
    expect(renderer).toContain('fitTrackerTitle(card)');
  });

  it('prints the Intelligence nested-stack instructions and contract order', () => {
    expect(renderer).toContain('current Intel value.');
    expect(renderer).toContain('Place the Intel Tracker and faction leader card on top of this tracker. Slide them together upward or downward');
    expect(renderer).toContain('bottom edge of the Intel Tracker');

    const intel = trackerById.get('intelligence-intel-tracker');
    const progress = trackerById.get('intelligence-operation-progress-tracker');
    expect(intel?.cover).toEqual({ kind: 'leader' });
    expect(intel?.tts?.layer).toBe(2);
    expect(progress?.cover).toEqual({ kind: 'component', componentId: 'intelligence-intel-tracker' });
    expect(progress?.tts?.layer).toBe(1);
  });
});