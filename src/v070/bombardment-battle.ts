import { v070CanonicalContent } from '../content/v070';
import {
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { placeV070OverlayFromBattle } from './overlays';

export const V070_BOMBARDMENT_ID = 'neutral-bombardment' as const;

const bombardmentCard = v070CanonicalContent.cardsById.get(V070_BOMBARDMENT_ID);
const bombardmentBattleEffect = bombardmentCard?.effects.find(
  effect => effect.label === 'Gambit/Tactic',
);
if (!bombardmentBattleEffect) {
  throw new Error('Released v0.7.0 Bombardment is missing its Gambit/Tactic effect.');
}

export const V070_BOMBARDMENT_BATTLE_TEXT = bombardmentBattleEffect.text;

export function applyV070BombardmentBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  instanceId: string,
): boolean {
  const battle = state.battle;
  if (!battle || owner !== battle.attacker || battle.lastStand) return false;

  const territory = state.board.find(
    item => item.position === battle.contestedPosition,
  );
  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  if (!territory || territory.controller !== opponent) return false;

  placeV070OverlayFromBattle(
    state,
    owner,
    instanceId,
    battle.contestedPosition,
    'Bombardment Gambit/Tactic',
  );

  appendV070Event(state, {
    type: 'bombardment_battle_overlay_placed',
    actor: owner,
    visibility: 'public',
    payload: {
      instanceId,
      cardId: V070_BOMBARDMENT_ID,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
      territoryId: territory.territoryId,
    },
  });
  return true;
}
