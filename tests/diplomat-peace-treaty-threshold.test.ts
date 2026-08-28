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

  it('corrects the inherited v0.7.0 Rulebook text without rewriting historical v0.6.3 rules', async () => {
    const { applyV070RulebookCorrections } = await import('../rulebook/player-facing/v070-corrections.js');
    const source = read('releases/v0.7.0/Gauntlet_v0.7.0_Rulebook.md');
    const corrected = applyV070RulebookCorrections(source);

    expect(source).toContain('five different Proposals');
    expect(corrected).toContain('Ratify six different Proposals');
    expect(corrected).toContain('if six different Proposals are ratified');
    expect(corrected).not.toContain('five different Proposals');
  });
});
