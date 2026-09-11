import type { V070GameState } from './engine';
import * as previous from './battle-effect-status-pre-capital-gains';
import { removeV070CapitalGainsBattleRegistration } from './capital-gains-battle';
import { removeV070ExcommunicationBattleRegistration } from './excommunication-battle';
import { removeV070SuppliesBattleRegistration } from './supplies-battle';

export * from './battle-effect-status-pre-capital-gains';

export function negateV070BattleCardEffect(
  state: V070GameState,
  targetInstanceId: string,
  sourceInstanceId: string,
  sourceCardId: string,
): void {
  previous.negateV070BattleCardEffect(
    state,
    targetInstanceId,
    sourceInstanceId,
    sourceCardId,
  );
  removeV070CapitalGainsBattleRegistration(state, targetInstanceId);
  removeV070ExcommunicationBattleRegistration(state, targetInstanceId);
  removeV070SuppliesBattleRegistration(state, targetInstanceId);
}
