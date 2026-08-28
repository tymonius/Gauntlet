import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Diplomat Peace Treaty threshold', () => {
  it('keeps all current player-facing surfaces at six Treaty Articles', () => {
    const currentGame = JSON.parse(read('game-data/current-game.json'));
    const threshold = currentGame.gameplay?.factions
      ?.find((faction: { id?: string }) => faction.id === 'diplomats')
      ?.factionRules?.peace_treaty_threshold;

    expect(threshold).toBe(6);

    for (const path of [
      'rulebook/player-facing/current-rulebook.md',
      'faction-sheets/diplomat.js',
      'rules-assistant/answer-presentation.js',
      'rules-assistant/rules-deterministic.js',
    ]) {
      const source = read(path);
      expect(source, path).toContain('six different Proposals');
      expect(source, path).not.toContain('five different Proposals');
    }
  });

  it('keeps the maintained v0.7.0 Rulebook at six Treaty Articles and the correction idempotent', async () => {
    const { applyV070RulebookCorrections } = await import('../rulebook/player-facing/v070-corrections.js');
    const source = read('releases/v0.7.0/Gauntlet_v0.7.0_Rulebook.md');
    const corrected = applyV070RulebookCorrections(source);

    expect(source).toContain('Ratify six different Proposals');
    expect(source).toContain('if six different Proposals are ratified');
    expect(source).not.toContain('five different Proposals');
    expect(corrected).toContain('Ratify six different Proposals');
    expect(corrected).toContain('if six different Proposals are ratified');
    expect(corrected).not.toContain('five different Proposals');

    const legacySnippet = [
      'Accepted or successfully imposed Proposals become Treaty Articles. Ratify five different Proposals and survive until the start of your next turn to win through the **Peace Treaty**.',
      "At the start of the Diplomat's turn, after the Capture step and before the Draw step, if five different Proposals are ratified, the Diplomat wins through the Peace Treaty.",
    ].join('\n');
    const correctedLegacy = applyV070RulebookCorrections(legacySnippet);
    expect(correctedLegacy).toContain('Ratify six different Proposals');
    expect(correctedLegacy).toContain('if six different Proposals are ratified');
    expect(correctedLegacy).not.toContain('five different Proposals');
  });
});
