import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  V070_COMMAND_TENT_ID,
  V070_QUICKSAND_ID,
  V070_REFUGE_ID,
  V070_SMUGGLERS_PASS_ID,
  V070_SUPPLY_DEPOT_ID,
  V070_NON_BATTLE_TERRITORY_IDS,
  resolveV070RuinedStorehouseReplacementDraw,
  resolveV070SmugglersPassControlLoss,
  resolveV070SmugglersPassStartTurn,
  resolveV070TollBridgeAdvanceCost,
  stashV070SmugglersPassCard,
  useV070SmugglersPassStash,
  v070CommandTentActionPlan,
  v070DifficultTerrainTurnState,
  v070DisruptedSupplyLinesActiveAssets,
  v070KingsRoadAdditionalMovement,
  v070MonasteryAllowsGraveyardExit,
  v070MonasterySuppressesArcaneEffect,
  v070QuicksandMovementRule,
  v070RefugeCardBonus,
  v070SupplyDepotStartTurnCardBonus,
} from './territories';
import {
  V070_BATTLE_TERRITORY_IDS,
  V070_POISONOUS_GAS_ID,
  resolveV070FieldHospitalSave,
  resolveV070NoQuarterAdditionalRetreat,
  resolveV070OldBattlefieldReserveOverride,
  resolveV070PoisonousGasNoTacticPenalty,
  resolveV070SpoilsOfWarReserveOverride,
  v070ArenaDefensiveEdgeApplies,
  v070ExposedFlankOccupierCanSetGambit,
  v070FortifiedPassAttackerAssetsActive,
  v070GarrisonInitialReserveBonus,
  v070GrandMeleeBattleBonus,
  v070HighGroundDefenderHasAdvantage,
  v070InsurgencyPlayerAssetsActive,
  v070PoisonousGasAllowsCommitment,
  v070PoisonousGasTacticDestination,
  v070SingleCombatAssetsActive,
  v070TrainingGroundsReplacementPlan,
  v070WatchtowerGambitPlan,
} from './territory-battles';

const c1 = { instanceId: 'copy-1', cardId: 'neutral-rallying-cry' };
const c2 = { instanceId: 'copy-2', cardId: 'neutral-fealty' };
const c3 = { instanceId: 'copy-3', cardId: 'neutral-forced-march' };

describe('v0.7.0 Territory procedure authority', () => {
  test('the promoted procedure inventory covers all 25 released Territories exactly once', () => {
    const promoted = [
      ...V070_NON_BATTLE_TERRITORY_IDS,
      ...V070_BATTLE_TERRITORY_IDS,
    ];
    const canonical = v070CanonicalContent.content.territories
      .map(territory => territory.id)
      .sort();

    expect(promoted).toHaveLength(25);
    expect(new Set(promoted).size).toBe(25);
    expect([...promoted].sort()).toEqual(canonical);
  });

  test('locks the material v0.7.0 text changes used by the promoted procedures', () => {
    expect(
      v070CanonicalContent.territoriesById.get(V070_QUICKSAND_ID)?.text,
    ).toBe(
      'A player who begins their Movement here cannot Advance or Fall Back more than one Position or use an effect to increase their movement that turn. Retreat is unaffected.',
    );
    expect(
      v070CanonicalContent.territoriesById.get(V070_REFUGE_ID)?.text,
    ).toBe(
      'After a player Falls Back or withdraws to this Territory: +1 Card.',
    );
    expect(
      v070CanonicalContent.territoriesById.get(V070_SUPPLY_DEPOT_ID)?.text,
    ).toBe(
      "If Supply Depot's controller starts their turn here, +1 Card.",
    );
    expect(
      v070CanonicalContent.territoriesById.get(V070_COMMAND_TENT_ID)?.text,
    ).toBe(
      "If Command Tent's controller starts their turn here, +1 Action. They may take Actions during both Opening and Denouement that turn. Their first Action in each phase must be used to play a card for its Action effect.",
    );
    expect(
      v070CanonicalContent.territoriesById.get(V070_POISONOUS_GAS_ID)?.text,
    ).toBe(
      'During battles here, each player may employ Gambits or Tactics, but not both. In the Aftermath, Tactics go to the Graveyard. A player who chose no Tactic puts 1 card from their Reserve in the Graveyard.',
    );
    expect(
      v070CanonicalContent.territoriesById.get(V070_SMUGGLERS_PASS_ID)?.text,
    ).toContain(
      'may stash 1 card from Hand face down beneath it',
    );
  });
});

describe('v0.7.0 non-battle Territory procedures', () => {
  test('Quicksand caps voluntary Movement at one but does not prohibit a one-Position Fall Back', () => {
    expect(v070QuicksandMovementRule(true)).toEqual({
      maxVoluntaryPositions: 1,
      movementIncreaseEffectsAllowed: false,
      retreatAffected: false,
    });
    expect(v070QuicksandMovementRule(false)).toEqual({
      maxVoluntaryPositions: null,
      movementIncreaseEffectsAllowed: true,
      retreatAffected: false,
    });
  });

  test('Difficult Terrain ends Movement on entry and blocks Denouement card Actions after start or entry', () => {
    expect(v070DifficultTerrainTurnState({
      beginsTurnHere: false,
      entersDuringTurn: true,
    })).toEqual({
      movementEndsOnEntry: true,
      denouementCardActionBlocked: true,
    });
    expect(v070DifficultTerrainTurnState({
      beginsTurnHere: true,
      entersDuringTurn: false,
    })).toEqual({
      movementEndsOnEntry: false,
      denouementCardActionBlocked: true,
    });
  });

  test('Disrupted Supply Lines leaves only one chosen Asset active while a player is there', () => {
    expect(
      v070DisruptedSupplyLinesActiveAssets(
        ['asset-1', 'asset-2', 'asset-3'],
        true,
        'asset-2',
      ),
    ).toEqual(['asset-2']);
    expect(
      v070DisruptedSupplyLinesActiveAssets(
        ['asset-1', 'asset-2'],
        false,
      ),
    ).toEqual(['asset-1', 'asset-2']);
    expect(() =>
      v070DisruptedSupplyLinesActiveAssets(
        ['asset-1', 'asset-2'],
        true,
      )
    ).toThrow(/choose one active Asset/);
  });

  test('Ruined Storehouse replaces a draw with the actual top Discard card', () => {
    expect(resolveV070RuinedStorehouseReplacementDraw({
      drawPile: ['draw-top', 'draw-next'],
      discardPile: ['old', 'discard-top'],
    }, true)).toEqual({
      drawPile: ['draw-top', 'draw-next'],
      discardPile: ['old'],
      card: 'discard-top',
      source: 'discard_top',
    });
  });

  test('Supply Depot is a start-turn +1 Card trigger for its controller', () => {
    expect(v070SupplyDepotStartTurnCardBonus(true)).toBe(1);
    expect(v070SupplyDepotStartTurnCardBonus(false)).toBe(0);
  });

  test('Refuge rewards both Fall Back and withdrawal arrivals, but not Retreat', () => {
    expect(v070RefugeCardBonus({
      arrivedOnRefuge: true,
      movementKind: 'fall_back',
    })).toBe(1);
    expect(v070RefugeCardBonus({
      arrivedOnRefuge: true,
      movementKind: 'withdrawal',
    })).toBe(1);
    expect(v070RefugeCardBonus({
      arrivedOnRefuge: true,
      movementKind: 'retreat',
    })).toBe(0);
  });

  test('Command Tent grants +1 Action and constrains the first Action in each available phase', () => {
    expect(v070CommandTentActionPlan(true)).toEqual({
      additionalActions: 1,
      actionsAllowedInOpening: true,
      actionsAllowedInDenouement: true,
      firstActionInOpeningMustBeCardAction: true,
      firstActionInDenouementMustBeCardAction: true,
    });
    expect(v070CommandTentActionPlan(false)).toBeNull();
  });

  test('Monastery blocks Graveyard exit while its controller is there and suppresses Arcane battle effects', () => {
    expect(v070MonasteryAllowsGraveyardExit(true)).toBe(false);
    expect(v070MonasteryAllowsGraveyardExit(false)).toBe(true);
    expect(v070MonasterySuppressesArcaneEffect({
      battleHere: true,
      cardHasArcaneTrait: true,
    })).toBe(true);
    expect(v070MonasterySuppressesArcaneEffect({
      battleHere: true,
      cardHasArcaneTrait: false,
    })).toBe(false);
  });

  test("King's Road grants one additional Movement position only from a qualifying turn start", () => {
    expect(v070KingsRoadAdditionalMovement(true)).toBe(1);
    expect(v070KingsRoadAdditionalMovement(false)).toBe(0);
  });

  test('Toll Bridge taxes only voluntary Advance with one chosen Hand card', () => {
    expect(resolveV070TollBridgeAdvanceCost({
      voluntaryAdvance: true,
      hand: ['one', 'two'],
      discardPile: ['old'],
      discardInstanceId: 'two',
    })).toEqual({
      canAdvance: true,
      hand: ['one'],
      discardPile: ['old', 'two'],
      paidCard: 'two',
    });
    expect(resolveV070TollBridgeAdvanceCost({
      voluntaryAdvance: true,
      hand: [],
      discardPile: [],
    }).canAdvance).toBe(false);
    expect(resolveV070TollBridgeAdvanceCost({
      voluntaryAdvance: false,
      hand: [],
      discardPile: [],
    }).canAdvance).toBe(true);
  });

  test("Smuggler's Pass keeps physical stash identity and enforces use/control timing", () => {
    const stashed = stashV070SmugglersPassCard({
      phase: 'opening',
      player: 'A',
      playerIsHere: true,
      controls: true,
      hand: [c1, c2],
      handInstanceId: c2.instanceId,
      state: { stash: null },
    });
    expect(stashed.hand).toEqual([c1]);
    expect(stashed.state.stash).toEqual({
      owner: 'A',
      card: c2,
    });

    expect(useV070SmugglersPassStash({
      player: 'A',
      playerIsHere: true,
      controls: true,
      state: stashed.state,
      use: 'gambit',
      eligible: true,
    })).toEqual({
      state: { stash: null },
      card: c2,
      use: 'gambit',
      countsAsFromHand: true,
    });

    expect(resolveV070SmugglersPassStartTurn({
      player: 'A',
      controls: true,
      returnToHand: true,
      hand: [c1],
      state: stashed.state,
    })).toEqual({
      state: { stash: null },
      hand: [c1, c2],
      returned: c2,
    });

    expect(resolveV070SmugglersPassControlLoss(stashed.state)).toEqual({
      state: { stash: null },
      discarded: {
        owner: 'A',
        card: c2,
      },
    });
  });
});

describe('v0.7.0 battle Territory and Arena procedures', () => {
  test('Poisonous Gas allows multiple same-kind commitments but never mixes Gambits and Tactics', () => {
    expect(v070PoisonousGasAllowsCommitment([], 'gambit')).toBe(true);
    expect(v070PoisonousGasAllowsCommitment(['gambit'], 'gambit'))
      .toBe(true);
    expect(v070PoisonousGasAllowsCommitment(['tactic'], 'tactic'))
      .toBe(true);
    expect(v070PoisonousGasAllowsCommitment(['gambit'], 'tactic'))
      .toBe(false);
    expect(v070PoisonousGasAllowsCommitment(['tactic'], 'gambit'))
      .toBe(false);
    expect(v070PoisonousGasTacticDestination()).toBe('graveyard');
  });

  test('Poisonous Gas no-Tactic penalty chooses one card from the current Reserve, if able', () => {
    expect(resolveV070PoisonousGasNoTacticPenalty({
      choseTactic: false,
      reserve: [c1, c2],
      chosenPenaltyInstanceId: c2.instanceId,
    })).toEqual({
      graveyardCard: c2,
    });
    expect(resolveV070PoisonousGasNoTacticPenalty({
      choseTactic: true,
      reserve: [c1],
    })).toEqual({
      graveyardCard: null,
    });
    expect(resolveV070PoisonousGasNoTacticPenalty({
      choseTactic: false,
      reserve: [],
    })).toEqual({
      graveyardCard: null,
    });
  });

  test('battle setup and persistent Territory modifiers preserve their released v0.7.0 conditions', () => {
    expect(v070GarrisonInitialReserveBonus(true)).toBe(1);
    expect(v070GarrisonInitialReserveBonus(false)).toBe(0);

    expect(v070ExposedFlankOccupierCanSetGambit(true)).toBe(false);
    expect(v070ExposedFlankOccupierCanSetGambit(false)).toBe(true);

    expect(v070HighGroundDefenderHasAdvantage(true)).toBe(true);
    expect(v070FortifiedPassAttackerAssetsActive(true)).toBe(false);
    expect(v070FortifiedPassAttackerAssetsActive(false)).toBe(true);
    expect(v070InsurgencyPlayerAssetsActive(true)).toBe(false);
    expect(v070InsurgencyPlayerAssetsActive(false)).toBe(true);

    expect(v070WatchtowerGambitPlan(true)).toEqual({
      order: ['attacker', 'defender'],
      attackerSetsFaceUp: true,
      defenderSetsNormally: true,
    });
    expect(v070WatchtowerGambitPlan(false)).toBeNull();
  });

  test('Field Hospital may redirect one controller-owned Graveyard-bound battle card', () => {
    expect(resolveV070FieldHospitalSave({
      territoryController: 'A',
      candidates: [
        {
          card: c1,
          owner: 'A',
          destination: 'graveyard',
        },
        {
          card: c2,
          owner: 'B',
          destination: 'graveyard',
        },
      ],
      chosenInstanceId: c1.instanceId,
    })).toEqual({
      savedCard: c1,
      destination: 'discard',
    });
    expect(() => resolveV070FieldHospitalSave({
      territoryController: 'A',
      candidates: [{
        card: c2,
        owner: 'B',
        destination: 'graveyard',
      }],
      chosenInstanceId: c2.instanceId,
    })).toThrow(/controller/);
  });

  test('Old Battlefield and Spoils of War redirect one qualifying Reserve card', () => {
    expect(resolveV070OldBattlefieldReserveOverride({
      territoryController: 'A',
      player: 'A',
      reserve: [c1, c2],
      chosenInstanceId: c2.instanceId,
    })).toEqual({
      card: c2,
      destination: 'graveyard',
    });

    expect(resolveV070SpoilsOfWarReserveOverride({
      winner: 'B',
      player: 'B',
      reserve: [c1, c2],
      chosenInstanceId: c1.instanceId,
    })).toEqual({
      card: c1,
      destination: 'hand',
    });
  });

  test('Training Grounds replaces the entire Reserve with the same number before Tactics', () => {
    expect(v070TrainingGroundsReplacementPlan({
      controllerDefends: true,
      invoke: true,
      reserve: [c1, c2, c3],
    })).toEqual({
      discardEntireReserve: true,
      discarded: [c1, c2, c3],
      replacementDrawCount: 3,
    });
    expect(v070TrainingGroundsReplacementPlan({
      controllerDefends: true,
      invoke: false,
      reserve: [c1],
    })).toEqual({
      discardEntireReserve: false,
      discarded: [],
      replacementDrawCount: 0,
    });
  });

  test('all four Arenas remove Defensive Edge and apply their individual battle rules', () => {
    expect(v070ArenaDefensiveEdgeApplies(true)).toBe(false);
    expect(v070ArenaDefensiveEdgeApplies(false)).toBe(true);

    expect(resolveV070NoQuarterAdditionalRetreat({
      loser: 'A',
      positionAfterNormalRetreat: 2,
      territoryCount: 6,
    })).toBe(1);
    expect(resolveV070NoQuarterAdditionalRetreat({
      loser: 'A',
      positionAfterNormalRetreat: -1,
      territoryCount: 6,
    })).toBe(-1);

    expect(v070SingleCombatAssetsActive(true)).toBe(false);
    expect(v070SingleCombatAssetsActive(false)).toBe(true);

    expect(v070GrandMeleeBattleBonus(true)).toEqual({
      additionalInitialReserve: 1,
      additionalTactics: 1,
    });
    expect(v070GrandMeleeBattleBonus(false)).toBeNull();
  });
});
