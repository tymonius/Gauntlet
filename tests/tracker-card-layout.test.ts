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
  it('uses standard resource caps and omits a cap line for Operation Progress', () => {
    expect(trackerById.get('military-command-tracker')?.trackedValue?.maximum).toBe(2);
    expect(trackerById.get('diplomats-influence-tracker')?.trackedValue?.maximum).toBe(10);
    expect(trackerById.get('intelligence-intel-tracker')?.trackedValue?.maximum).toBeNull();
    expect(trackerById.get('intelligence-operation-progress-tracker')?.trackedValue?.maximum).toBeNull();
    expect(trackerById.get('inquisition-conviction-tracker')?.trackedValue?.maximum).toBe(4);
    expect(renderer).toContain('Standard ${resourceName} cap · ${component.resourceMaximum}');
    expect(renderer).toContain('Standard ${resourceName} cap · none');
    expect(renderer).toContain("component.contractId === 'intelligence-operation-progress-tracker'");
  });

  it('restores a full-width Caslon italic usage note without the old zero header', () => {
    expect(renderer).not.toContain('Physical scale ·');
    expect(renderer).not.toContain('0 = fully covered');
    expect(renderer).toContain('tracker-instructions');
    expect(renderer).toContain('slide it upward or downward to align the bottom edge with the line above your current ${esc(resourceName)} value');
    expect(styles).toContain('font-family: "adobe-caslon-pro", Georgia, serif;');
    expect(styles).toContain('font-style: italic;');
    expect(styles).toContain('height: 2.56in;');
  });
});
