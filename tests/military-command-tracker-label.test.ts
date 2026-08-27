import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const supplementalRenderer = readFileSync('card-design/supplemental-card.js', 'utf8');
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const componentContract = currentGame.componentContract;
const militaryTracker = componentContract.components.find((component: { id?: string }) => component.id === 'military-command-tracker');

describe('Military Command tracker label', () => {
  it('prints the tracked resource as an X Tracker title while keeping bare resource labels on the scale', () => {
    expect(militaryTracker?.name).toBe('Military Command Tracker');
    expect(militaryTracker?.trackedValue?.name).toBe('Command');
    expect(supplementalRenderer).toContain("resourceName: component.family === 'tracker'");
    expect(supplementalRenderer).toContain('component.trackedValue?.name');
    expect(supplementalRenderer).toContain('const resourceName = component.resourceName ||');
    expect(supplementalRenderer).toContain('<h3>${esc(resourceName)} Tracker</h3>');
    expect(supplementalRenderer).toContain('${trackerMarks(component, resourceName)}');
  });
});
