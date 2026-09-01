export * from './types';
export * from './registry';
export * from './battle';
export * from './capital-punishment';
export * from './disruption';
export * from './sabotage';

import { baseBattleEffectHandlers } from './battle';
import { capitalPunishmentCleanupHandler } from './capital-punishment';
import { disruptionBattleHandler } from './disruption';
import { sabotageBattleHandler } from './sabotage';

if (!baseBattleEffectHandlers.some((handler) => handler.id === disruptionBattleHandler.id)) {
  baseBattleEffectHandlers.splice(1, 0, disruptionBattleHandler);
}

if (!baseBattleEffectHandlers.some((handler) => handler.id === sabotageBattleHandler.id)) {
  baseBattleEffectHandlers.splice(2, 0, sabotageBattleHandler);
}

if (!baseBattleEffectHandlers.some((handler) => handler.id === capitalPunishmentCleanupHandler.id)) {
  baseBattleEffectHandlers.push(capitalPunishmentCleanupHandler);
}
