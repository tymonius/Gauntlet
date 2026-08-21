import { describe, expect, it } from 'vitest';
import {
  loadTtsComponentContract,
  resolveFactionBackFile,
  resolveStandardBackFile,
} from '../scripts/tts-component-contract.mjs';

describe('Gauntlet card back policy', () => {
  it('uses one universal black standard back for playable cards and Territories', async () => {
    const contract = await loadTtsComponentContract();
    expect(resolveStandardBackFile(contract)).toBe(`backs/${contract.standardBack.universalVariant}.png`);
    expect(contract.standardBack.universalVariant).toBe('intelligence');
  });

  it('resolves faction-color backs independently for persistent faction components', async () => {
    const contract = await loadTtsComponentContract();
    for (const faction of contract.standardBack.variants) {
      expect(resolveFactionBackFile(contract, faction)).toBe(`backs/${faction}.png`);
    }
  });

  it('publishes the effective mixed policy to downstream generators', async () => {
    const contract = await loadTtsComponentContract();
    expect(contract.effectiveBackPolicy).toMatchObject({
      standardBack: 'universal-black',
      factionComponentBack: 'faction',
    });
  });
});