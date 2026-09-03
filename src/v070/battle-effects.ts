import { v070CanonicalContent } from '../content/v070';
import { appendV070Event, type V070GameState } from './engine';
import { drawV070Cards } from './turn-engine';
import type { PlayerId } from './rules';
import { faceUpV070AssetInstanceIds } from './asset-face-state';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';
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
    cardId: 'neutral-fealty',
    expectedText: 'Ignore one Disadvantage affecting you during this battle. If you have no Disadvantage, +1 Battle Total instead.',
    timing: 'reveal',
    apply: ({ state, owner }) => {
      const current = participant(state, owner);
      if (current.disadvantage > 0) current.disadvantage -= 1;
      else current.battleModifier += 1;
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

function participant(state: V070GameState, playerId: PlayerId) {
  if (!state.battleRuntime) throw new Error('Battle effects require an active battle runtime.');
  return state.battleRuntime.participants[playerId];
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
