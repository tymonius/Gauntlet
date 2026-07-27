export * from './types';
export * from './registry';
export * from './battle';
export * from './disruption';

import { baseBattleEffectHandlers } from './battle';
import { disruptionBattleHandler } from './disruption';

if (!baseBattleEffectHandlers.some((handler) => handler.id === disruptionBattleHandler.id)) {
  baseBattleEffectHandlers.splice(1, 0, disruptionBattleHandler);
}
