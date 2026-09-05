import { describe, expect, test } from 'vitest';
import { v063CanonicalContent } from '../content/v063';
import {
  V063_COMMAND_TENT_ID,
  V063_DIFFICULT_TERRAIN_ID,
  V063_DISRUPTED_SUPPLY_LINES_ID,
  V063_KINGS_ROAD_ID,
  V063_MONASTERY_ID,
  V063_QUICKSAND_ID,
  V063_REFUGE_ID,
  V063_RUINED_STOREHOUSE_ID,
  V063_SMUGGLERS_RUN_ID,
  V063_SUPPLY_DEPOT_ID,
  V063_TOLL_BRIDGE_ID,
  resolveV063RuinedStorehouseReplacementDraw,
  resolveV063SmugglersRunControlLoss,
  resolveV063SmugglersRunStartTurn,
  resolveV063TollBridgeAdvanceCost,
  stashV063SmugglersRunCard,
  useV063SmugglersRunStash,
  v063CommandTentActionPlan,
  v063DifficultTerrainTurnState,
  v063DisruptedSupplyLinesActiveAssets,
  v063KingsRoadAdditionalMovement,
  v063MonasteryAllowsGraveyardExit,
  v063MonasterySuppressesArcaneEffect,
  v063QuicksandMovementRule,
  v063RefugeCardBonus,
  v063SupplyDepotNormalDrawCount,
} from './territories';

const publishedText: Record<string, string> = {
  [V063_QUICKSAND_ID]: 'If a player begins their Movement on Quicksand, they cannot voluntarily Fall Back or move more than one Position that turn. Forced displacement is unaffected.',
  [V063_DIFFICULT_TERRAIN_ID]: 'When a player enters Difficult Terrain, their movement ends. A player who begins their turn there or enters it during their turn cannot play a card for its Action effect during Denouement that turn.',
  [V063_DISRUPTED_SUPPLY_LINES_ID]: 'While a player occupies Disrupted Supply Lines, only 1 of their Assets can be active. They choose which one remains active; their other Assets are inactive until they leave.',
  [V063_RUINED_STOREHOUSE_ID]: 'Once during their Draw step, a player occupying Ruined Storehouse may draw the top card of their Discard Pile instead of drawing from their Draw Pile.',
  [V063_SUPPLY_DEPOT_ID]: 'During the Draw step, a player occupying and controlling Supply Depot draws one additional card as part of their normal draw.',
  [V063_REFUGE_ID]: 'After a player voluntarily Falls Back onto Refuge, they draw one card.',
  [V063_COMMAND_TENT_ID]: 'If a player begins their turn occupying and controlling Command Tent, they may take one Action during both Opening and Denouement that turn. If they do, both Actions may be used only to play cards for their Action effects.',
  [V063_MONASTERY_ID]: "While Monastery's controller occupies it, cards cannot leave either player's Graveyard. During battles on Monastery, cards with the Arcane trait have no effect.",
  [V063_KINGS_ROAD_ID]: "A player who begins their turn on King's Road gains one additional position of movement during that turn's Movement step.",
  [V063_TOLL_BRIDGE_ID]: 'To voluntarily advance from Toll Bridge, a player must discard one card from their Hand. If they cannot, they cannot advance from it.',
  [V063_SMUGGLERS_RUN_ID]: "During Opening or Denouement, as an Action, while occupying and controlling Smuggler's Run, a player may stash one card from their Hand face down beneath it. The stashed card does not count toward the Hand limit.\nWhile that player occupies and controls Smuggler's Run, they may play the stashed card for its Action effect or set it as a Gambit as though it were in their Hand, if eligible. It counts as a card played or set from Hand.\nAt the start of the stashing player's turn, if they control Smuggler's Run, they may return the stashed card to their Hand. If they lose control of Smuggler's Run, put the stashed card in its owner's Discard Pile. Only one card may be stashed here.",
};

describe('published v0.6.3 non-battle Territory authority', () => {
  test('locks exact released text for the migrated Territory set', () => {
    for (const [id, text] of Object.entries(publishedText)) {
      expect(v063CanonicalContent.territoriesById.get(id)?.text).toBe(text);
    }
  });
});

describe('Quicksand and Difficult Terrain', () => {
  test('Quicksand applies only when Movement begins there and never affects forced displacement', () => {
    expect(v063QuicksandMovementRule(true)).toEqual({
      maxVoluntaryPositions: 1,
      voluntaryFallBackAllowed: false,
      forcedDisplacementAffected: false,
    });
    expect(v063QuicksandMovementRule(false)).toEqual({
      maxVoluntaryPositions: null,
      voluntaryFallBackAllowed: true,
      forcedDisplacementAffected: false,
    });
  });

  test('Difficult Terrain ends movement on entry and blocks only the Denouement card-Action permission', () => {
    expect(v063DifficultTerrainTurnState({ beginsTurnHere: false, entersDuringTurn: true })).toEqual({
      movementEndsOnEntry: true,
      denouementCardActionBlocked: true,
    });
    expect(v063DifficultTerrainTurnState({ beginsTurnHere: true, entersDuringTurn: false })).toEqual({
      movementEndsOnEntry: false,
      denouementCardActionBlocked: true,
    });
  });
});

describe('persistent Territory state', () => {
  test('Disrupted Supply Lines leaves exactly the occupying player chosen Asset active', () => {
    expect(v063DisruptedSupplyLinesActiveAssets(['a', 'b', 'c'], true, 'b')).toEqual(['b']);
    expect(v063DisruptedSupplyLinesActiveAssets(['a', 'b', 'c'], false)).toEqual(['a', 'b', 'c']);
    expect(() => v063DisruptedSupplyLinesActiveAssets(['a', 'b'], true)).toThrow(/choose one active Asset/);
  });

  test('Monastery prevents Graveyard exit only while its controller occupies it and suppresses Arcane battle effects there', () => {
    expect(v063MonasteryAllowsGraveyardExit(true)).toBe(false);
    expect(v063MonasteryAllowsGraveyardExit(false)).toBe(true);
    expect(v063MonasterySuppressesArcaneEffect({ battleHere: true, cardHasArcaneTrait: true })).toBe(true);
    expect(v063MonasterySuppressesArcaneEffect({ battleHere: true, cardHasArcaneTrait: false })).toBe(false);
  });
});

describe('Draw and turn-start Territories', () => {
  test('Ruined Storehouse takes the actual top Discard card and leaves the Draw Pile untouched', () => {
    expect(resolveV063RuinedStorehouseReplacementDraw({
      drawPile: ['draw-top', 'draw-next'],
      discardPile: ['old', 'discard-top'],
    }, true)).toEqual({
      drawPile: ['draw-top', 'draw-next'],
      discardPile: ['old'],
      card: 'discard-top',
      source: 'discard_top',
    });
  });

  test('Supply Depot makes the normal Draw step two cards only while occupying and controlling it', () => {
    expect(v063SupplyDepotNormalDrawCount(true, true)).toBe(2);
    expect(v063SupplyDepotNormalDrawCount(true, false)).toBe(1);
    expect(v063SupplyDepotNormalDrawCount(false, true)).toBe(1);
  });

  test("King's Road grants exactly one extra movement position when the turn begins there", () => {
    expect(v063KingsRoadAdditionalMovement(true)).toBe(1);
    expect(v063KingsRoadAdditionalMovement(false)).toBe(0);
  });

  test('Command Tent can grant two phase-separated card Actions, but only when explicitly invoked from a qualifying start', () => {
    expect(v063CommandTentActionPlan({
      beginsTurnOccupyingAndControlling: true,
      invokeTerritoryEffect: true,
    })).toEqual({
      totalActions: 2,
      openingActionLimit: 1,
      denouementActionLimit: 1,
      bothActionsRestrictedToCardActionEffects: true,
    });
    expect(v063CommandTentActionPlan({
      beginsTurnOccupyingAndControlling: true,
      invokeTerritoryEffect: false,
    }).totalActions).toBe(1);
    expect(() => v063CommandTentActionPlan({
      beginsTurnOccupyingAndControlling: false,
      invokeTerritoryEffect: true,
    })).toThrow(/began the turn/);
  });
});

describe('movement consequences and costs', () => {
  test('Refuge rewards voluntary Fall Back only, not Retreat or other arrival', () => {
    expect(v063RefugeCardBonus({ arrivedOnRefuge: true, movementKind: 'fall_back', voluntary: true })).toBe(1);
    expect(v063RefugeCardBonus({ arrivedOnRefuge: true, movementKind: 'retreat', voluntary: false })).toBe(0);
    expect(v063RefugeCardBonus({ arrivedOnRefuge: true, movementKind: 'other', voluntary: true })).toBe(0);
  });

  test('Toll Bridge requires one Hand discard for voluntary Advance and does not tax other movement', () => {
    expect(resolveV063TollBridgeAdvanceCost({
      voluntaryAdvance: true,
      hand: ['one', 'two'],
      discardPile: ['old'],
      discardIndex: 1,
    })).toEqual({
      canAdvance: true,
      hand: ['one'],
      discardPile: ['old', 'two'],
      paidCard: 'two',
    });
    expect(resolveV063TollBridgeAdvanceCost({
      voluntaryAdvance: true,
      hand: [],
      discardPile: [],
    }).canAdvance).toBe(false);
    expect(resolveV063TollBridgeAdvanceCost({
      voluntaryAdvance: false,
      hand: [],
      discardPile: [],
    }).canAdvance).toBe(true);
  });
});

describe("Smuggler's Run", () => {
  const one = { instanceId: 'copy-1', cardId: 'neutral-rallying-cry' };
  const two = { instanceId: 'copy-2', cardId: 'neutral-rallying-cry' };

  test('stashes one physical Hand card and keeps duplicate copies unambiguous', () => {
    const result = stashV063SmugglersRunCard({
      phase: 'opening',
      player: 'A',
      occupies: true,
      controls: true,
      hand: [one, two],
      handIndex: 1,
      state: { stash: null },
    });
    expect(result.hand).toEqual([one]);
    expect(result.state.stash).toEqual({ owner: 'A', card: two });
    expect(() => stashV063SmugglersRunCard({
      phase: 'denouement',
      player: 'A',
      occupies: true,
      controls: true,
      hand: [one],
      handIndex: 0,
      state: result.state,
    })).toThrow(/Only one card/);
  });

  test('uses the stashed card as an Action or Gambit from Hand only while the stasher occupies and controls the Territory', () => {
    const state = { stash: { owner: 'A' as const, card: two } };
    expect(useV063SmugglersRunStash({
      player: 'A',
      occupies: true,
      controls: true,
      state,
      use: 'gambit',
      eligible: true,
    })).toEqual({
      state: { stash: null },
      card: two,
      use: 'gambit',
      countsAsFromHand: true,
    });
    expect(() => useV063SmugglersRunStash({
      player: 'A',
      occupies: false,
      controls: true,
      state,
      use: 'action',
      eligible: true,
    })).toThrow(/occupy and control/);
  });

  test('may return the stash at the stashing player start of turn while control is retained', () => {
    const result = resolveV063SmugglersRunStartTurn({
      player: 'A',
      controls: true,
      returnToHand: true,
      hand: [one],
      state: { stash: { owner: 'A', card: two } },
    });
    expect(result.hand).toEqual([one, two]);
    expect(result.returned).toEqual(two);
    expect(result.state.stash).toBeNull();
  });

  test('control loss discards the exact stashed physical card to its owner', () => {
    expect(resolveV063SmugglersRunControlLoss({
      stash: { owner: 'B', card: two },
    })).toEqual({
      state: { stash: null },
      discarded: { owner: 'B', card: two },
    });
  });
});
