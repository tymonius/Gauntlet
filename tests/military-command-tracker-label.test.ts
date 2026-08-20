import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const supplementalRenderer = readFileSync('card-design/supplemental-card.js', 'utf8');
const componentContract = JSON.parse(readFileSync('config/tts-component-contract.json', 'utf8'));
const militaryTracker = componentContract.components.find((component: { id?: string }) => component.id === 'military-command-tracker');

describe('Military Command tracker label', () => {
  it('prints the tracked resource name rather than the component inventory name', () => {
    expect(militaryTracker?.name).toBe('Military Command Tracker');
    expect(militaryTracker?.trackedValue?.name).toBe('Command');
    expect(supplementalRenderer).toContain("resourceName: component.family === 'tracker'");
    expect(supplementalRenderer).toContain('component.trackedValue?.name');
    expect(supplementalRenderer).toContain('const resourceName = component.resourceName ||');
  });
});
