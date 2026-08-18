import { describe, expect, test } from 'vitest';
import { v063CanonicalContent } from '../content/v063';
import { createV063PendingBattle, defenderHasV063DefensiveEdge } from './rules';
import {
  V063_ARENA_GRAND_MELEE_ID,
  V063_ARENA_NO_QUARTER_ID,
  V063_ARENA_SINGLE_COMBAT_ID,
  V063_ARENA_SPOILS_OF_WAR_ID,
  V063_EXPOSED_FLANK_ID,
  V063_FIELD_HOSPITAL_ID,
  V063_FORTIFIED_PASS_ID,
  V063_GARRISON_ID,
  V063_HIGH_GROUND_ID,
  V063_INSURGENCY_ID,
  V063_OLD_BATTLEFIELD_ID,
  V063_POISONOUS_GAS_ID,
  V063_TRAINING_GROUNDS_ID,
  V063_WATCHTOWER_ID,
  applyV063ArenaDefensiveEdgeRule,
  resolveV063FieldHospitalSave,
  resolveV063NoQuarterAdditionalRetreat,
  resolveV063OldBattlefieldReserveOverride,
  resolveV063PoisonousGasNoTacticPenalty,
  resolveV063SpoilsOfWarReserveOverride,
  v063ExposedFlankOccupierCanSetGambit,
  v063FortifiedPassAttackerBankedAssetsActive,
  v063GarrisonInitialReserveBonus,
  v063GrandMeleeBattleBonus,
  v063HighGroundDefenderHasAdvantage,
  v063InsurgencyOccupierBankedAssetsActive,
  v063PoisonousGasAllowsCommitment,
  v063PoisonousGasTacticDestination,
  v063SingleCombatBankedAssetsActive,
  v063TrainingGroundsReplacementPlan,
  v063WatchtowerGambitPlan,
} from './territory-battles';

const publishedText: Record<string, string> = {
  [V063_POISONOUS_GAS_ID]: "During a battle on Poisonous Gas, each player may set a Gambit or choose a Tactic, but not both. A player cannot have more than one Gambit or Tactic in that battle.\nA Tactic chosen during that battle goes to its owner's Graveyard during the Aftermath of the battle instead of their Discard Pile. If a player chooses no Tactic, they put one unchosen card from their initial Reserve in their Graveyard during the Aftermath, if able.",
  [V063_GARRISON_ID]: "When Garrison's controller defends it, they draw one additional card when forming their initial Reserve.",
  [V063_FIELD_HOSPITAL_ID]: 'During the Aftermath of a battle on Field Hospital, when the battle cards are cleared, its controller may put one card they controlled in that battle that would enter their Graveyard in their Discard Pile instead.',
  [V063_EXPOSED_FLANK_ID]: "When Exposed Flank's controller counterattacks an opponent occupying it, that opponent cannot set a Gambit.",
  [V063_HIGH_GROUND_ID]: 'The defending player in a battle on High Ground gains advantage.',
  [V063_FORTIFIED_PASS_ID]: "When Fortified Pass's controller defends it, the attacking player's banked Assets are inactive during that battle.",
  [V063_INSURGENCY_ID]: 'While an opponent occupies Insurgency without controlling it, their banked Assets are inactive.',
  [V063_WATCHTOWER_ID]: "When Watchtower's controller defends it, the attacker sets their Gambit face up or passes. The defender then sets their Gambit normally or passes.",
  [V063_OLD_BATTLEFIELD_ID]: 'During the Aftermath of a battle on Old Battlefield, when cards remaining in Reserve move to the Discard Pile, its controller may put one unchosen card from their Reserve in their Graveyard instead.',
  [V063_TRAINING_GROUNDS_ID]: "When Training Grounds's controller defends it, after forming their initial Reserve but before choosing Tactics, they may discard that entire Reserve and draw the same number of replacement cards. Those cards become their Reserve.",
  [V063_ARENA_SPOILS_OF_WAR_ID]: 'During battles on Spoils of War, Defensive Edge does not apply. If battle totals remain tied, make a Tiebreak Roll.\nDuring the Aftermath of the battle, when cards remaining in Reserve move to the Discard Pile, the winner may put one unchosen card from their Reserve in their Hand instead.',
  [V063_ARENA_NO_QUARTER_ID]: 'During battles on No Quarter, Defensive Edge does not apply. If battle totals remain tied, make a Tiebreak Roll. The losing player retreats one additional position, if able.',
  [V063_ARENA_SINGLE_COMBAT_ID]: 'During battles on Single Combat, Defensive Edge does not apply. If battle totals remain tied, make a Tiebreak Roll. All banked Assets are inactive during the battle.',
  [V063_ARENA_GRAND_MELEE_ID]: 'During battles on Grand Melee, Defensive Edge does not apply. If battle totals remain tied, make a Tiebreak Roll. Each player draws one additional card when forming their initial Reserve and may choose one additional Tactic from it.',
};

const c1 = { instanceId: 'copy-1', cardId: 'neutral-rallying-cry' };
const c2 = { instanceId: 'copy-2', cardId: 'neutral-rallying-cry' };
const c3 = { instanceId: 'copy-3', cardId: 'neutral-second-line' };

describe('published v0.6.3 battle Territory authority', () => {
  test('locks exact released text for all 14 remaining Territories and Arenas', () => {
    expect(Object.keys(publishedText)).toHaveLength(14);
    for (const [id, text] of Object.entries(publishedText)) {
      expect(v063CanonicalContent.territoriesById.get(id)?.text).toBe(text);
    }
  });
});

describe('battle commitment and setup modifiers', () => {
  test('Poisonous Gas allows only one Gambit-or-Tactic commitment and sends chosen Tactics to the Graveyard', () => {
    expect(v063PoisonousGasAllowsCommitment([], 'gambit')).toBe(true);
    expect(v063PoisonousGasAllowsCommitment([], 'tactic')).toBe(true);
    expect(v063PoisonousGasAllowsCommitment(['gambit'], 'tactic')).toBe(false);
    expect(v063PoisonousGasAllowsCommitment(['tactic'], 'gambit')).toBe(false);
    expect(v063PoisonousGasTacticDestination()).toBe('graveyard');
  });

  test('Poisonous Gas applies the no-Tactic penalty to one physical card from the initial Reserve, if able', () => {
    expect(resolveV063PoisonousGasNoTacticPenalty({
      choseTactic: false,
      initialReserve: [c1, c2],
      chosenPenaltyInstanceId: 'copy-2',
    })).toEqual({ graveyardCard: c2 });
    expect(resolveV063PoisonousGasNoTacticPenalty({
      choseTactic: true,
      initialReserve: [c1, c2],
    })).toEqual({ graveyardCard: null });
    expect(resolveV063PoisonousGasNoTacticPenalty({
      choseTactic: false,
      initialReserve: [],
    })).toEqual({ graveyardCard: null });
    expect(() => resolveV063PoisonousGasNoTacticPenalty({
      choseTactic: false,
      initialReserve: [c1],
      chosenPenaltyInstanceId: 'copy-2',
    })).toThrow(/initial Reserve/);
  });

  test('Garrison adds one card only when its controller defends it', () => {
    expect(v063GarrisonInitialReserveBonus(true)).toBe(1);
    expect(v063GarrisonInitialReserveBonus(false)).toBe(0);
  });

  test('Exposed Flank suppresses only the occupying opponent Gambit during the controller counterattack', () => {
    expect(v063ExposedFlankOccupierCanSetGambit(true)).toBe(false);
    expect(v063ExposedFlankOccupierCanSetGambit(false)).toBe(true);
  });

  test('High Ground grants defender advantage in its battle', () => {
    expect(v063HighGroundDefenderHasAdvantage(true)).toBe(true);
    expect(v063HighGroundDefenderHasAdvantage(false)).toBe(false);
  });

  test('Fortified Pass inactivates the attacker banked Assets only when its controller defends', () => {
    expect(v063FortifiedPassAttackerBankedAssetsActive(true)).toBe(false);
    expect(v063FortifiedPassAttackerBankedAssetsActive(false)).toBe(true);
  });

  test('Insurgency inactivates the opposing occupier banked Assets until they control it or leave', () => {
    expect(v063InsurgencyOccupierBankedAssetsActive(true)).toBe(false);
    expect(v063InsurgencyOccupierBankedAssetsActive(false)).toBe(true);
  });

  test('Watchtower forces attacker-first face-up Gambit setting while the controller defends', () => {
    expect(v063WatchtowerGambitPlan(true)).toEqual({
      order: ['attacker', 'defender'],
      attackerSetsFaceUp: true,
      defenderSetsNormally: true,
      eitherMayPass: true,
    });
    expect(v063WatchtowerGambitPlan(false)).toBeNull();
  });

  test('Training Grounds replaces the entire initial Reserve with the same number of cards before Tactics', () => {
    expect(v063TrainingGroundsReplacementPlan({
      controllerDefends: true,
      invoke: true,
      initialReserve: [c1, c2, c3],
    })).toEqual({
      discardEntireReserve: true,
      discarded: [c1, c2, c3],
      replacementDrawCount: 3,
    });
    expect(v063TrainingGroundsReplacementPlan({
      controllerDefends: true,
      invoke: false,
      initialReserve: [c1, c2],
    }).replacementDrawCount).toBe(0);
    expect(() => v063TrainingGroundsReplacementPlan({
      controllerDefends: false,
      invoke: true,
      initialReserve: [c1],
    })).toThrow(/controller defends/);
  });
});

describe('Aftermath destination overrides', () => {
  test('Field Hospital redirects one qualifying controller-owned Graveyard-bound battle card to Discard', () => {
    expect(resolveV063FieldHospitalSave({
      territoryController: 'A',
      candidates: [
        { card: c1, controller: 'A', destination: 'graveyard' },
        { card: c2, controller: 'B', destination: 'graveyard' },
      ],
      chosenInstanceId: 'copy-1',
    })).toEqual({ savedCard: c1, destination: 'discard' });
    expect(() => resolveV063FieldHospitalSave({
      territoryController: 'A',
      candidates: [{ card: c2, controller: 'B', destination: 'graveyard' }],
      chosenInstanceId: 'copy-2',
    })).toThrow(/Territory controller controlled/);
  });

  test('Old Battlefield may send one controller unchosen Reserve card to Graveyard instead of Discard', () => {
    expect(resolveV063OldBattlefieldReserveOverride({
      territoryController: 'A',
      player: 'A',
      unchosenReserve: [c1, c2],
      chosenInstanceId: 'copy-2',
    })).toEqual({ card: c2, destination: 'graveyard' });
    expect(resolveV063OldBattlefieldReserveOverride({
      territoryController: 'A',
      player: 'B',
      unchosenReserve: [c1],
      chosenInstanceId: 'copy-1',
    })).toEqual({ card: null, destination: null });
  });

  test('Spoils of War may put one winner unchosen Reserve card in Hand instead of Discard', () => {
    expect(resolveV063SpoilsOfWarReserveOverride({
      winner: 'B',
      player: 'B',
      unchosenReserve: [c1, c2],
      chosenInstanceId: 'copy-1',
    })).toEqual({ card: c1, destination: 'hand' });
    expect(resolveV063SpoilsOfWarReserveOverride({
      winner: 'B',
      player: 'A',
      unchosenReserve: [c1],
      chosenInstanceId: 'copy-1',
    })).toEqual({ card: null, destination: null });
  });
});

describe('Arena rules', () => {
  test('all Arenas remove Defensive Edge and therefore leave tied totals for the shared Tiebreak Roll procedure', () => {
    const battle = createV063PendingBattle({
      territoryCount: 6,
      attacker: 'A',
      defender: 'B',
      attackerOrigin: 2,
      contestedPosition: 3,
      positions: { A: 3, B: 3 },
      defenderControlsContested: true,
    });
    expect(defenderHasV063DefensiveEdge(battle)).toBe(true);
    expect(defenderHasV063DefensiveEdge(applyV063ArenaDefensiveEdgeRule(battle))).toBe(false);
  });

  test('No Quarter retreats the loser one additional Position after the normal retreat, if able', () => {
    expect(resolveV063NoQuarterAdditionalRetreat({
      loser: 'A',
      positionAfterNormalRetreat: 2,
      territoryCount: 6,
    })).toBe(1);
    expect(resolveV063NoQuarterAdditionalRetreat({
      loser: 'A',
      positionAfterNormalRetreat: -1,
      territoryCount: 6,
    })).toBe(-1);
  });

  test('Single Combat inactivates all banked Assets', () => {
    expect(v063SingleCombatBankedAssetsActive()).toBe(false);
  });

  test('Grand Melee gives each player one additional initial Reserve card and one additional Tactic', () => {
    expect(v063GrandMeleeBattleBonus()).toEqual({
      additionalInitialReserve: 1,
      additionalTactics: 1,
    });
  });
});
