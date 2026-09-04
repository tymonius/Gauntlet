import { v070CanonicalContent } from '../content/v070';
import { appendV070Event, type V070GameState } from './engine';
import { drawV070Cards } from './turn-engine';
import type { PlayerId } from './rules';
import { faceUpV070AssetInstanceIds } from './asset-face-state';
import {
  activeV070PrintedBattleTerritory,
  v070MonasterySuppressesArcaneBattleEffects,
} from './territories';
import { retreatV070Position } from './rules';
import { gainV070MilitaryCommandFromEffect } from './military';
import type {
  V070BattleCardCommitment,
  V070UnsupportedBattleEffect,
} from './battle-types';
import { recordV070MysticBattleEffectApplied } from './mystics';

export type V070BattleEffectTiming = 'reveal';

export interface V070BattleEffectContext {
  state: V070GameState;
  owner: PlayerId;
  opponent: PlayerId;
  commitment: V070BattleCardCommitment;
}

export interface V070BattleEffectHandler {
  cardId: string;
  expectedText: string;
  timing: V070BattleEffectTiming;
  apply: (context: V070BattleEffectContext) => void;
}

const handlers: V070BattleEffectHandler[] = [
  {
    cardId: 'mystics-accursed-wager',
    expectedText: 'In the Aftermath, the losing player puts one card from their Hand in their Graveyard, if able.',
    timing: 'reveal',
    apply: ({ state, commitment }) => {
      const runtime = state.battleRuntime;
      if (!runtime) throw new Error('Battle effects require an active battle runtime.');
      if (!runtime.battleAccursedWagerInstanceIds.includes(
        commitment.instanceId,
      )) {
        runtime.battleAccursedWagerInstanceIds.push(
          commitment.instanceId,
        );
      }
    },
  },
  modifier('neutral-new-recruits', '+1 Battle Total.', 1),
  modifier('neutral-rallying-cry', '+1 Battle Total.', 1),
  modifier('diplomats-gunboat-diplomacy', '+2 Battle Total.', 2),
  {
    cardId: 'diplomats-trade-concessions',
    expectedText: 'Opponent: +1 Card. +2 Battle Total.',
    timing: 'reveal',
    apply: ({ state, owner, opponent }) => {
      const draw = drawV070Cards(state, opponent, 1, 'Trade Concessions battle effect');
      state.players[opponent].zones.hand.push(...draw.drawn);
      participant(state, owner).battleModifier += 2;

      appendV070Event(state, {
        type: 'cards_drawn',
        actor: opponent,
        visibility: 'public',
        payload: {
          count: draw.drawn.length,
          purpose: 'Trade Concessions battle effect',
          reshuffles: draw.reshuffles,
          exhausted: draw.exhausted,
        },
      });
      if (draw.drawn.length > 0) {
        appendV070Event(state, {
          type: 'drawn_card_identity',
          actor: opponent,
          visibility: opponent,
          payload: {
            cardInstanceIds: [...draw.drawn],
            purpose: 'Trade Concessions battle effect',
          },
        });
      }
    },
  },
  {
    cardId: 'neutral-forced-march',
    expectedText: 'Attacker — +1 Battle Total.',
    timing: 'reveal',
    apply: ({ state, owner }) => {
      if (state.battle?.attacker === owner) participant(state, owner).battleModifier += 1;
    },
  },
  {
    cardId: 'neutral-stand-ground',
    expectedText: 'Defender — gain Advantage.',
    timing: 'reveal',
    apply: ({ state, owner }) => {
      if (state.battle?.defender === owner) participant(state, owner).advantage += 1;
    },
  },
  {
    cardId: 'neutral-entrenchment',
    expectedText: 'Defender — opponent gains Disadvantage.',
    timing: 'reveal',
    apply: ({ state, owner, opponent }) => {
      if (state.battle?.defender === owner) participant(state, opponent).disadvantage += 1;
    },
  },
  {
    cardId: 'neutral-advance-guard',
    expectedText: 'Attacker without a Gambit — gain Advantage.',
    timing: 'reveal',
    apply: ({ state, owner }) => {
      if (state.battle?.attacker !== owner) return;
      if (participant(state, owner).gambit === null) participant(state, owner).advantage += 1;
    },
  },
  {
    cardId: 'neutral-consolidation',
    expectedText: 'In the Aftermath, if you won as the attacker on a Territory your opponent controls, +1 Card.',
    timing: 'reveal',
    apply: ({ state, owner, opponent, commitment }) => {
      const battle = state.battle;
      if (!battle || battle.attacker !== owner || battle.lastStand) return;
      const territory = state.board.find(
        item => item.position === battle.contestedPosition,
      );
      if (territory?.controller !== opponent) return;
      registerAftermathDraw(
        state,
        owner,
        commitment.instanceId,
        'neutral-consolidation',
        1,
      );
    },
  },
  {
    cardId: 'neutral-foothold',
    expectedText: 'If you are defending against a Counterattack, gain Advantage. In the Aftermath, if you win, +1 Card.',
    timing: 'reveal',
    apply: ({ state, owner, commitment }) => {
      if (state.battle?.defender === owner && isCounterattack(state)) {
        participant(state, owner).advantage += 1;
      }
      registerAftermathDraw(
        state,
        owner,
        commitment.instanceId,
        'neutral-foothold',
        1,
      );
    },
  },
  {
    cardId: 'neutral-resistance',
    expectedText: 'Counterattack — gain Advantage. In the Aftermath, if you win, bank this card.',
    timing: 'reveal',
    apply: ({ state, owner, commitment }) => {
      if (isCounterattack(state)) {
        participant(state, owner).advantage += 1;
      }
      registerBattleCardAftermathAssetBank(
        state,
        owner,
        commitment.instanceId,
        'neutral-resistance',
      );
    },
  },
  {
    cardId: 'mystics-circle-of-bones',
    expectedText: 'In the Aftermath, place this Overlay on the contested Territory.',
    timing: 'reveal',
    apply: ({ state, owner, commitment }) => {
      registerBattleCardAftermathOverlayPlacement(
        state,
        owner,
        commitment.instanceId,
        'mystics-circle-of-bones',
        'always',
      );
    },
  },
  {
    cardId: 'mystics-spirit-hollow',
    expectedText: 'In the Aftermath, place this Overlay on the contested Territory.',
    timing: 'reveal',
    apply: ({ state, owner, commitment }) => {
      registerBattleCardAftermathOverlayPlacement(
        state,
        owner,
        commitment.instanceId,
        'mystics-spirit-hollow',
        'always',
      );
    },
  },
  {
    cardId: 'neutral-battlefield-plunder',
    expectedText: 'In the Aftermath, if you win, place this Overlay on the contested Territory.',
    timing: 'reveal',
    apply: ({ state, owner, commitment }) => {
      registerBattleCardAftermathOverlayPlacement(
        state,
        owner,
        commitment.instanceId,
        'neutral-battlefield-plunder',
        'owner_win',
      );
    },
  },
  {
    cardId: 'neutral-manifest-destiny',
    expectedText: 'In the Aftermath, if you win as the attacker, insert this card into the Gauntlet at your Front Line as a blank Territory you control.',
    timing: 'reveal',
    apply: ({ state, owner, commitment }) => {
      registerBattleCardAftermathTerritoryInsertion(
        state,
        owner,
        commitment.instanceId,
        'neutral-manifest-destiny',
      );
    },
  },
  {
    cardId: 'neutral-contingency-plan',
    expectedText: 'If your opponent controls more Territories than you, +2 Battle Total.',
    timing: 'reveal',
    apply: ({ state, owner, opponent }) => {
      if (state.players[opponent].controlledTerritories.length
        > state.players[owner].controlledTerritories.length) {
        participant(state, owner).battleModifier += 2;
      }
    },
  },
  {
    cardId: 'neutral-insurrection',
    expectedText: 'Counterattack — gain double Advantage. Otherwise, Attacker — gain Advantage.',
    timing: 'reveal',
    apply: ({ state, owner }) => {
      if (isCounterattack(state)) {
        participant(state, owner).advantage += 2;
      } else if (state.battle?.attacker === owner) {
        participant(state, owner).advantage += 1;
      }
    },
  },
  {
    cardId: 'neutral-illegal-occupation',
    expectedText: 'Counterattack — their Assets are inactive during this battle; gain Advantage.',
    timing: 'reveal',
    apply: ({ state, owner, opponent }) => {
      if (!isCounterattack(state)) return;
      suppressBattleAssets(state, opponent);
      participant(state, owner).advantage += 1;
    },
  },
  {
    cardId: 'neutral-sequestration',
    expectedText: 'All Assets are inactive during this battle.',
    timing: 'reveal',
    apply: ({ state }) => {
      suppressBattleAssets(state, 'A');
      suppressBattleAssets(state, 'B');
    },
  },
  {
    cardId: 'neutral-rousing-speech',
    expectedText: 'If the opponent has more face-up Assets than you, gain Advantage.',
    timing: 'reveal',
    apply: ({ state, owner, opponent }) => {
      if (faceUpV070AssetInstanceIds(state, opponent).length
        > faceUpV070AssetInstanceIds(state, owner).length) {
        participant(state, owner).advantage += 1;
      }
    },
  },
  {
    cardId: 'neutral-resourcefulness',
    expectedText: 'If another active card you control in this battle has cost 1, gain Advantage.',
    timing: 'reveal',
    apply: ({ state, owner, commitment }) => {
      if (otherActiveBattleCardHasCost(state, owner, commitment.instanceId, 1)) {
        participant(state, owner).advantage += 1;
      }
    },
  },
  {
    cardId: 'intelligence-disinformation',
    expectedText: 'When Gambits are revealed, if the opponent also set a Gambit, gain Advantage. In the Aftermath, return this card to your Hand instead of putting it in your Graveyard.',
    timing: 'reveal',
    apply: ({ state, owner, opponent, commitment }) => {
      if (commitment.role !== 'gambit') return;
      const opponentParticipant = participant(state, opponent);
      if (opponentParticipant.gambit
        || opponentParticipant.additionalGambits.length > 0) {
        participant(state, owner).advantage += 1;
      }
      registerBattleCardAftermathDestination(
        state,
        owner,
        commitment.instanceId,
        'intelligence-disinformation',
        'hand',
      );
    },
  },
  {
    cardId: 'neutral-fealty',
    expectedText: 'Ignore one Disadvantage affecting you during this battle. If you have no Disadvantage, +1 Battle Total instead.',
    timing: 'reveal',
    apply: ({ state, owner }) => {
      const current = participant(state, owner);
      if (current.disadvantage > 0) current.disadvantage -= 1;
      else current.battleModifier += 1;
    },
  },
  {
    cardId: 'neutral-pathfinders',
    expectedText: 'If this battle is on a Territory with an active printed effect, +1 Battle Total.',
    timing: 'reveal',
    apply: ({ state, owner }) => {
      if (activeV070PrintedBattleTerritory(state)) {
        participant(state, owner).battleModifier += 1;
      }
    },
  },
  {
    cardId: 'neutral-conscription',
    expectedText: 'When Gambits are revealed: +1 Reserve, +1 Tactic.',
    timing: 'reveal',
    apply: ({ state, owner, commitment }) => {
      if (commitment.role !== 'gambit') return;
      const draw = drawV070Cards(
        state,
        owner,
        1,
        'Conscription battle Reserve',
      );
      const current = participant(state, owner);
      current.reserve.push(...draw.drawn);
      current.tacticLimit += 1;

      appendV070Event(state, {
        type: 'battle_reserve_cards_added',
        actor: owner,
        visibility: 'public',
        payload: {
          sourceInstanceId: commitment.instanceId,
          sourceCardId: 'neutral-conscription',
          count: draw.drawn.length,
          reshuffles: draw.reshuffles,
          exhausted: draw.exhausted,
          tacticLimitDelta: 1,
        },
      });
      if (draw.drawn.length > 0) {
        appendV070Event(state, {
          type: 'reserve_identity',
          actor: owner,
          visibility: owner,
          payload: {
            cardInstanceIds: [...draw.drawn],
            purpose: 'Conscription',
          },
        });
      }
    },
  },
  {
    cardId: 'neutral-tactical-planning',
    expectedText: 'When Gambits are revealed: +1 Reserve. Tactic limit unchanged.',
    timing: 'reveal',
    apply: ({ state, owner, commitment }) => {
      if (commitment.role !== 'gambit') return;
      const draw = drawV070Cards(
        state,
        owner,
        1,
        'Tactical Planning battle Reserve',
      );
      participant(state, owner).reserve.push(...draw.drawn);

      appendV070Event(state, {
        type: 'battle_reserve_cards_added',
        actor: owner,
        visibility: 'public',
        payload: {
          sourceInstanceId: commitment.instanceId,
          sourceCardId: 'neutral-tactical-planning',
          count: draw.drawn.length,
          reshuffles: draw.reshuffles,
          exhausted: draw.exhausted,
        },
      });
      if (draw.drawn.length > 0) {
        appendV070Event(state, {
          type: 'reserve_identity',
          actor: owner,
          visibility: owner,
          payload: {
            cardInstanceIds: [...draw.drawn],
            purpose: 'Tactical Planning',
          },
        });
      }
    },
  },
  {
    cardId: 'neutral-court-martial',
    expectedText: 'Opponent gains Disadvantage. If they lose, after their normal retreat: Retreat +1, if able.',
    timing: 'reveal',
    apply: ({ state, opponent, commitment }) => {
      participant(state, opponent).disadvantage += 1;
      state.battleRuntime!.additionalRetreatEffects.push({
        sourceInstanceId: commitment.instanceId,
        sourceCardId: 'neutral-court-martial',
        targetPlayer: opponent,
        steps: 1,
      });
    },
  },
  {
    cardId: 'military-unbroken-ranks',
    expectedText: 'If you win this battle and used no Orders during it, +1 Command.',
    timing: 'reveal',
    apply: ({ state, commitment }) => {
      if (!state.battleRuntime!.unbrokenRanksInstanceIds
        .includes(commitment.instanceId)) {
        state.battleRuntime!.unbrokenRanksInstanceIds.push(
          commitment.instanceId,
        );
      }
    },
  },
];

const handlersByCardId = new Map(handlers.map(handler => [handler.cardId, handler]));

validateHandlers();

export const V070_SUPPORTED_REVEAL_EFFECT_IDS = handlers.map(handler => handler.cardId) as readonly string[];

export function v070BattleEffectHandler(cardId: string): V070BattleEffectHandler | undefined {
  return handlersByCardId.get(cardId);
}

export function resolveV070SupportedRevealEffects(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const unsupported = commitments.flatMap(commitment =>
    unsupportedForCommitment(state, commitment, encounteredAt),
  );
  if (unsupported.length > 0) return unsupported;

  const battle = state.battle;
  if (!battle) throw new Error('Battle effect resolution requires an active battle.');

  const attackerQueue = commitments.filter(commitment => commitment.owner === battle.attacker);
  const defenderQueue = commitments.filter(commitment => commitment.owner === battle.defender);
  const ordered: V070BattleCardCommitment[] = [];
  while (attackerQueue.length > 0 || defenderQueue.length > 0) {
    const attackerCommitment = attackerQueue.shift();
    if (attackerCommitment) ordered.push(attackerCommitment);
    const defenderCommitment = defenderQueue.shift();
    if (defenderCommitment) ordered.push(defenderCommitment);
  }

  for (const commitment of ordered) {
    const cardId = requireCardId(state, commitment.instanceId);
    const card = v070CanonicalContent.cardsById.get(cardId);
    if (v070MonasterySuppressesArcaneBattleEffects(state)
      && card?.trait === 'Arcane') {
      appendV070Event(state, {
        type: 'battle_card_effect_suppressed',
        actor: commitment.owner,
        visibility: 'public',
        payload: {
          instanceId: commitment.instanceId,
          cardId,
          role: commitment.role,
          reason: 'Monastery',
        },
      });
      continue;
    }

    const handler = handlersByCardId.get(cardId);
    if (!handler) throw new Error(`Missing validated handler for ${cardId}.`);

    handler.apply({
      state,
      owner: commitment.owner,
      opponent: otherPlayer(commitment.owner),
      commitment,
    });

    appendV070Event(state, {
      type: 'battle_card_effect_applied',
      actor: commitment.owner,
      visibility: 'public',
      payload: {
        instanceId: commitment.instanceId,
        cardId,
        role: commitment.role,
        timing: handler.timing,
      },
    });
    recordV070MysticBattleEffectApplied(
      state,
      commitment.owner,
      commitment.instanceId,
    );
  }

  return [];
}

function unsupportedForCommitment(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const cardId = requireCardId(state, commitment.instanceId);
  const card = v070CanonicalContent.cardsById.get(cardId);
  if (!card) throw new Error(`Unknown canonical card ${cardId}.`);
  if (v070MonasterySuppressesArcaneBattleEffects(state)
    && card.trait === 'Arcane') {
    return [];
  }

  const relevant = card.effects.filter(effect =>
    effect.label === (commitment.role === 'gambit' ? 'Gambit' : 'Tactic')
    || effect.label === 'Gambit/Tactic',
  );

  const handler = handlersByCardId.get(cardId);
  if (handler && relevant.length === 1 && relevant[0].text === handler.expectedText) return [];

  return relevant.map(effect => ({
    owner: commitment.owner,
    instanceId: commitment.instanceId,
    cardId,
    role: commitment.role,
    label: effect.label,
    text: effect.text,
    encounteredAt,
  }));
}

export function applyV070BattleCardAdditionalRetreats(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || !battle.loser) return;

  const loser = battle.loser;
  for (const effect of runtime.additionalRetreatEffects) {
    if (effect.targetPlayer !== loser) continue;
    for (let step = 0; step < effect.steps; step += 1) {
      const from = battle.positions[loser];
      const to = retreatV070Position(
        loser,
        from,
        battle.territoryCount,
      );
      if (to === from) break;
      battle.positions[loser] = to;
      appendV070Event(state, {
        type: 'battle_card_aftermath_retreat',
        actor: loser,
        visibility: 'public',
        payload: {
          sourceInstanceId: effect.sourceInstanceId,
          sourceCardId: effect.sourceCardId,
          loser,
          from,
          to,
          additionalRetreat: 1,
        },
      });
    }
  }
}

export function resolveV070AftermathDrawEffects(
  state: V070GameState,
  winner: PlayerId,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || runtime.aftermathDrawEffects.length === 0) return;

  const effects = [...runtime.aftermathDrawEffects];
  runtime.aftermathDrawEffects = [];

  for (const effect of effects) {
    if (effect.owner !== winner) continue;

    const draw = drawV070Cards(
      state,
      effect.owner,
      effect.count,
      `${effect.sourceCardId} Aftermath`,
    );
    state.players[effect.owner].zones.hand.push(...draw.drawn);

    appendV070Event(state, {
      type: 'battle_card_aftermath_draw',
      actor: effect.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: effect.sourceInstanceId,
        sourceCardId: effect.sourceCardId,
        count: draw.drawn.length,
        reshuffles: draw.reshuffles,
        exhausted: draw.exhausted,
      },
    });
    if (draw.drawn.length > 0) {
      appendV070Event(state, {
        type: 'drawn_card_identity',
        actor: effect.owner,
        visibility: effect.owner,
        payload: {
          cardInstanceIds: [...draw.drawn],
          purpose: `${effect.sourceCardId} Aftermath`,
        },
      });
    }
  }
}

export function resolveV070UnbrokenRanksCommand(
  state: V070GameState,
  winner: PlayerId,
): void {
  const runtime = state.battleRuntime;
  if (!runtime
    || runtime.militaryOrderUsedPlayers.includes(winner)
    || runtime.unbrokenRanksInstanceIds.length === 0) {
    return;
  }

  for (const instanceId of runtime.unbrokenRanksInstanceIds) {
    if (state.cardInstances[instanceId]?.owner !== winner) continue;
    gainV070MilitaryCommandFromEffect(
      state,
      winner,
      1,
      'Unbroken Ranks',
      instanceId,
    );
  }
}

function modifier(cardId: string, expectedText: string, amount: number): V070BattleEffectHandler {
  return {
    cardId,
    expectedText,
    timing: 'reveal',
    apply: ({ state, owner }) => {
      participant(state, owner).battleModifier += amount;
    },
  };
}

function registerBattleCardAftermathAssetBank(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) throw new Error('Battle effects require an active battle runtime.');
  runtime.battleCardAftermathAssetBanks.push({
    owner,
    sourceInstanceId,
    sourceCardId,
    condition: 'owner_win',
  });
}

function registerBattleCardAftermathTerritoryInsertion(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) throw new Error('Battle effects require an active battle runtime.');
  runtime.battleCardAftermathTerritoryInsertions.push({
    owner,
    sourceInstanceId,
    sourceCardId,
    condition: 'owner_win_as_attacker',
    location: 'front_line',
  });
}

function registerBattleCardAftermathOverlayPlacement(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: string,
  condition: 'always' | 'owner_win',
): void {
  const runtime = state.battleRuntime;
  const battle = state.battle;
  if (!runtime || !battle) {
    throw new Error('Battle effects require an active battle runtime.');
  }
  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  if (!territory) return;

  runtime.battleCardAftermathOverlayPlacements.push({
    owner,
    sourceInstanceId,
    sourceCardId,
    territoryInstanceId: territory.territoryInstanceId,
    condition,
  });
}

function registerBattleCardAftermathDestination(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  sourceCardId: string,
  destination: 'discard' | 'graveyard' | 'hand',
): void {
  const runtime = state.battleRuntime;
  if (!runtime) throw new Error('Battle effects require an active battle runtime.');
  runtime.battleCardAftermathDestinationOverrides.push({
    sourceCardId,
    playerId,
    instanceId,
    destination,
  });
}

function registerAftermathDraw(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: string,
  count: number,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) throw new Error('Battle effects require an active battle runtime.');
  runtime.aftermathDrawEffects.push({
    owner,
    sourceInstanceId,
    sourceCardId,
    count,
  });
}

function participant(state: V070GameState, playerId: PlayerId) {
  if (!state.battleRuntime) throw new Error('Battle effects require an active battle runtime.');
  return state.battleRuntime.participants[playerId];
}

function suppressBattleAssets(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) throw new Error('Battle effects require an active battle runtime.');
  if (!runtime.assetInactivePlayers.includes(playerId)) {
    runtime.assetInactivePlayers.push(playerId);
  }
}

function isCounterattack(state: V070GameState): boolean {
  const battle = state.battle;
  if (!battle || battle.lastStand) return false;
  const territory = state.board.find(item => item.position === battle.contestedPosition);
  return territory?.controller === battle.attacker;
}

function otherActiveBattleCardHasCost(
  state: V070GameState,
  owner: PlayerId,
  excludedInstanceId: string,
  cost: number,
): boolean {
  if (!state.battleRuntime) return false;
  const runtime = state.battleRuntime.participants[owner];
  const commitments = [runtime.gambit, ...runtime.additionalGambits, runtime.tactic]
    .filter((item): item is V070BattleCardCommitment => Boolean(item))
    .filter(item => item.instanceId !== excludedInstanceId);

  return commitments.some(item => {
    const cardId = requireCardId(state, item.instanceId);
    return v070CanonicalContent.cardsById.get(cardId)?.cost === cost;
  });
}

function validateHandlers(): void {
  const seen = new Set<string>();
  for (const handler of handlers) {
    if (seen.has(handler.cardId)) throw new Error(`Duplicate v0.7.0 battle handler for ${handler.cardId}.`);
    seen.add(handler.cardId);

    const card = v070CanonicalContent.cardsById.get(handler.cardId);
    if (!card) throw new Error(`Battle handler references unknown v0.7.0 card ${handler.cardId}.`);
    const relevant = card.effects.filter(effect =>
      effect.label === 'Gambit'
      || effect.label === 'Tactic'
      || effect.label === 'Gambit/Tactic',
    );
    if (relevant.length !== 1 || relevant[0].text !== handler.expectedText) {
      throw new Error(`Battle handler text drift for ${handler.cardId}.`);
    }
  }
}

function requireCardId(state: V070GameState, instanceId: string): string {
  const instance = state.cardInstances[instanceId];
  if (!instance) throw new Error(`Unknown card instance ${instanceId}.`);
  return instance.cardId;
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}
