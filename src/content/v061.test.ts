import { describe, expect, it } from 'vitest';
import { isCanonicalBattleRulesV061 } from './types';
import { loadV061CanonicalContent, V061_RULES_VERSION } from './v061';

describe('v0.6.1 canonical content', () => {
  it('loads the first-playtest revision and builds stable lookup indexes', () => {
    const canonical = loadV061CanonicalContent();

    expect(canonical.rulesVersion).toBe(V061_RULES_VERSION);
    expect(canonical.content.factions).toHaveLength(6);
    expect(canonical.leadersByName.size).toBe(12);
    expect(canonical.content.cards).toHaveLength(122);
    expect(canonical.content.territories).toHaveLength(25);
    expect(canonical.factionsById.get('military')?.leaders.map((leader) => leader.name)).toEqual([
      'General',
      'Commandant',
    ]);
    expect(canonical.leadersByName.get('Spirit Walker')?.factionId).toBe('mystics');
    expect(canonical.cardsById.get('neutral-counterintelligence')?.effects.map((effect) => effect.label)).toEqual([
      'Action',
      'Battle',
    ]);
    expect(canonical.cardsById.get('neutral-counterintelligence')?.action).toContain('Reserve');
    expect(canonical.territoriesById.get('territory-arena-grand-melee')?.arena).toBe(true);
  });

  it('exposes the authoritative Gambit, Reserve, Tactic, and Aftermath metadata', () => {
    const canonical = loadV061CanonicalContent();
    const { battle } = canonical.content;

    expect(isCanonicalBattleRulesV061(battle)).toBe(true);
    if (!isCanonicalBattleRulesV061(battle)) throw new Error('Expected v0.6.1 battle metadata.');

    expect(battle.normal_reserve_size).toBe(3);
    expect(battle.normal_gambits).toBe(1);
    expect(battle.normal_tactics).toBe(1);
    expect(battle.gambit_destination).toBe('Graveyard');
    expect(battle.tactic_destination).toBe('Discard Pile');
    expect(battle.remaining_reserve_destination).toBe('Discard Pile');
    expect(battle.sequence).toEqual([
      'opening_effects',
      'set_gambits',
      'form_reserves',
      'reveal_gambits',
      'choose_tactics',
      'reveal_tactics',
      'resolve_battle',
      'aftermath',
    ]);
  });

  it('keeps the v0.6.0 loader available during the staged migration', async () => {
    const { loadV06CanonicalContent, V06_RULES_VERSION } = await import('./v06');
    expect(loadV06CanonicalContent().rulesVersion).toBe(V06_RULES_VERSION);
  });
});
