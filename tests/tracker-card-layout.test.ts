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
  it('uses authoritative rules caps rather than the printed physical endpoint', () => {
    expect(trackerById.get('military-command-tracker')?.trackedValue?.maximum).toBe(2);
    expect(trackerById.get('diplomats-influence-tracker')?.trackedValue?.maximum).toBe(10);
    expect(trackerById.get('intelligence-intel-tracker')?.trackedValue?.maximum).toBeNull();
    expect(trackerById.get('intelligence-operation-progress-tracker')?.trackedValue?.maximum).toBeNull();
    expect(trackerById.get('inquisition-conviction-tracker')?.trackedValue?.maximum).toBe(4);
    expect(renderer).toContain('component.trackedValue?.maximum');
    expect(renderer).toContain('Rules cap · ${component.resourceMaximum}');
    expect(renderer).toContain("'Rules cap · none'");
  });

  it('removes explanatory copy and gives the tracking field more vertical space', () => {
    expect(renderer).not.toContain('Physical scale ·');
    expect(renderer).not.toContain('tracker-instructions');
    expect(renderer).not.toContain('0 = fully covered');
    expect(styles).not.toContain('.tracker-instructions');
    expect(styles).toContain('height: 2.66in;');
  });
});
