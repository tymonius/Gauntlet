import { v070CanonicalContent } from '../content/v070';
import {
  appendV070Event,
  type V070GameState,
} from './engine';
import type {
  V070BattleCardCommitment,
  V070UnsupportedBattleEffect,
} from './battle-types';
import * as previous from './battle-effects-pre-capital-gains';
import {
  hasV070BattleCardEffectApplied,
  isV070BattleCardEffectNegated,
  markV070BattleCardEffectApplied,
} from './battle-effect-status';
import {
  V070_CAPITAL_GAINS_BATTLE_TEXT,
  V070_CAPITAL_GAINS_ID,
  registerV070CapitalGainsBattleEffect,
} from './capital-gains-battle';
import {
  V070_EXCOMMUNICATION_BATTLE_TEXT,
  V070_EXCOMMUNICATION_ID,
  registerV070ExcommunicationBattleEffect,
} from './excommunication-battle';
import {
  V070_SUPPLIES_BATTLE_TEXT,
  V070_SUPPLIES_ID,
  registerV070SuppliesBattleEffect,
} from './supplies-battle';
import {
  V070_REND_THE_VEIL_ID,
  V070_WITCHCRAFT_ID,
} from './copied-effect-callers';
import {
  V070_RECONNAISSANCE_ID,
  deferV070ReconnaissanceGambit,
  takeV070DeferredReconnaissanceGambits,
} from './reconnaissance-battle';
import {
  V070_OPERATIONAL_REASSESSMENT_BATTLE_TEXT,
  V070_OPERATIONAL_REASSESSMENT_ID,
  deferV070OperationalReassessmentGambit,
  registerV070OperationalReassessmentBattleEffect,
  takeV070DeferredOperationalReassessmentGambits,
} from './operational-reassessment-battle';
import {
  registerV070DeferredBattleAftermathCarrier,
} from './battle-aftermath-carrier';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';
import {
  configureV070WitchcraftBattleEffectHandlerResolver,
} from './witchcraft-handler-resolver';
import {
  V070_REARGUARD_BATTLE_TEXT,
  V070_REARGUARD_ID,
  registerV070RearguardBattleEffect,
} from './rearguard';
import {
  V070_PATHS_OF_SHADOW_BATTLE_TEXT,
  V070_PATHS_OF_SHADOW_ID,
  registerV070PathsOfShadowBattleEffect,
} from './paths-of-shadow-battle';
import {
  CURRENT_DIVINE_MERCY_BATTLE_TEXT,
  V070_DIVINE_MERCY_ID,
} from './divine-mercy-battle';
import {
  V070_NATURES_ALTAR_BATTLE_TEXT,
  V070_NATURES_ALTAR_ID,
  V070_SCORCHED_EARTH_BATTLE_TEXT,
  V070_SCORCHED_EARTH_ID,
  registerV070NaturesAltarBattleEffect,
  registerV070ScorchedEarthBattleEffect,
} from './aftermath-overlay-cards';
import {
  V070_BATTLEFIELD_PROMOTION_BATTLE_TEXT,
  V070_BATTLEFIELD_PROMOTION_ID,
  V070_SECOND_LINE_BATTLE_TEXT,
  V070_SECOND_LINE_ID,
  V070_SALVAGE_BATTLE_TEXT,
  V070_SALVAGE_ID,
  V070_STRATEGIC_WITHDRAWAL_BATTLE_TEXT,
  V070_STRATEGIC_WITHDRAWAL_ID,
  registerV070BattlefieldPromotionBattleEffect,
  registerV070SecondLineBattleEffect,
  registerV070SalvageBattleEffect,
  registerV070StrategicWithdrawalBattleEffect,
} from './aftermath-destination-cards';
import {
  V070_GRAVE_WARD_BATTLE_TEXT,
  V070_GRAVE_WARD_ID,
  V070_NECROMANCY_BATTLE_TEXT,
  V070_NECROMANCY_ID,
  V070_SOUL_FOR_SOUL_BATTLE_TEXT,
  V070_SOUL_FOR_SOUL_ID,
  registerV070PostClearMysticBattleEffect,
} from './post-clear-mystic-cards';
import {
  V070_FATES_TOLL_BATTLE_TEXT,
  V070_FATES_TOLL_ID,
  V070_VALOR_BATTLE_TEXT,
  V070_VALOR_ID,
  registerV070PostRollRerollEffect,
} from './post-roll-reroll-cards';
import {
  V070_REVOLUTION_BATTLE_TEXT,
  V070_REVOLUTION_ID,
  registerV070RevolutionBattleEffect,
} from './post-roll-exchange-cards';
import {
  CURRENT_ASSIMILATION_BATTLE_TEXT,
  CURRENT_FORECLOSURE_BATTLE_TEXT,
  V070_ASSIMILATION_BATTLE_TEXT,
  V070_ASSIMILATION_ID,
  V070_FORECLOSURE_BATTLE_TEXT,
  V070_FORECLOSURE_ID,
  registerV070AssimilationBattleEffect,
  registerV070ForeclosureBattleEffect,
} from './aftermath-capture-cards';
import {
  V070_REINFORCEMENTS_ID,
} from './additional-tactic-battle';
import {
  V070_DIVESTMENT_BATTLE_TEXT,
  V070_DIVESTMENT_ID,
  V070_LIQUIDATION_BATTLE_TEXT,
  V070_LIQUIDATION_ID,
  V070_MARGIN_LOAN_BATTLE_TEXT,
  V070_MARGIN_LOAN_ID,
  registerV070DivestmentBattleEffect,
  registerV070LiquidationBattleEffect,
  registerV070MarginLoanBattleEffect,
} from './financier-pre-dice-battle';
import {
  V070_UNDERWRITING_BATTLE_TEXT,
  V070_UNDERWRITING_ID,
  registerV070UnderwritingBattleEffect,
} from './underwriting-battle';
import {
  V070_BLACK_COVENANT_BATTLE_TEXT,
  V070_BLACK_COVENANT_ID,
  registerV070BlackCovenantBattleEffect,
} from './black-covenant-battle';
import {
  V070_HELLFIRE_BATTLE_TEXT,
  V070_HELLFIRE_ID,
  registerV070HellfireBattleEffect,
} from './hellfire-battle';
import {
  V070_CONFESSION_BATTLE_TEXT,
  V070_CONFESSION_ID,
} from './confession-battle';
import {
  V070_SCOUTING_REPORT_BATTLE_TEXT,
  V070_SCOUTING_REPORT_ID,
} from './scouting-report-battle';
import {
  V070_REDEMPTION_BATTLE_TEXT,
  V070_REDEMPTION_ID,
  registerV070RedemptionBattleEffect,
  v070RedemptionAftermathEffects,
} from './redemption-battle';
import {
  V070_CONTRABAND_BATTLE_TEXT,
  V070_CONTRABAND_ID,
  registerV070ContrabandBattleEffect,
} from './contraband-battle';
import {
  V070_GUILT_BY_ASSOCIATION_BATTLE_TEXT,
  V070_GUILT_BY_ASSOCIATION_ID,
  registerV070GuiltByAssociationBattleEffect,
  v070GuiltByAssociationAftermathEffects,
} from './guilt-by-association-battle';
import {
  V070_CORNER_THE_MARKET_BATTLE_TEXT,
  V070_CORNER_THE_MARKET_ID,
  V070_LEVERAGED_BUYOUT_BATTLE_TEXT,
  V070_LEVERAGED_BUYOUT_ID,
  V070_MONETARY_CRISIS_BATTLE_TEXT,
  V070_MONETARY_CRISIS_ID,
  registerV070FinancierAftermathBattleEffect,
} from './financier-aftermath-battle';

export * from './battle-effects-pre-capital-gains';

declare module './battle-types' {
  interface V070BattleRuntime {
    deferredWitchcraftGambitCommitments?: V070BattleCardCommitment[];
    deferredRendTheVeilGambitCommitments?: V070BattleCardCommitment[];
    deferredReinforcementsGambitCommitments?: V070BattleCardCommitment[];
    deferredHellfireGambitCommitments?: V070BattleCardCommitment[];
  }
}

const capitalGainsHandler: previous.V070BattleEffectHandler = {
  cardId: V070_CAPITAL_GAINS_ID,
  expectedText: V070_CAPITAL_GAINS_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070CapitalGainsBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
    registerV070DeferredBattleAftermathCarrier(
      state,
      owner,
      commitment.instanceId,
      V070_CAPITAL_GAINS_ID,
      'owner_win',
    );
  },
};

const excommunicationHandler: previous.V070BattleEffectHandler = {
  cardId: V070_EXCOMMUNICATION_ID,
  expectedText: V070_EXCOMMUNICATION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070ExcommunicationBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
    registerV070DeferredBattleAftermathCarrier(
      state,
      owner,
      commitment.instanceId,
      V070_EXCOMMUNICATION_ID,
      'always',
    );
  },
};

const suppliesHandler: previous.V070BattleEffectHandler = {
  cardId: V070_SUPPLIES_ID,
  expectedText: V070_SUPPLIES_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070SuppliesBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
    registerV070DeferredBattleAftermathCarrier(
      state,
      owner,
      commitment.instanceId,
      V070_SUPPLIES_ID,
      'always',
    );
  },
};

const rearguardHandler: previous.V070BattleEffectHandler = {
  cardId: V070_REARGUARD_ID,
  expectedText: V070_REARGUARD_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070RearguardBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const pathsOfShadowHandler: previous.V070BattleEffectHandler = {
  cardId: V070_PATHS_OF_SHADOW_ID,
  expectedText: V070_PATHS_OF_SHADOW_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PathsOfShadowBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const naturesAltarHandler: previous.V070BattleEffectHandler = {
  cardId: V070_NATURES_ALTAR_ID,
  expectedText: V070_NATURES_ALTAR_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070NaturesAltarBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const scorchedEarthHandler: previous.V070BattleEffectHandler = {
  cardId: V070_SCORCHED_EARTH_ID,
  expectedText: V070_SCORCHED_EARTH_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070ScorchedEarthBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const battlefieldPromotionHandler: previous.V070BattleEffectHandler = {
  cardId: V070_BATTLEFIELD_PROMOTION_ID,
  expectedText: V070_BATTLEFIELD_PROMOTION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070BattlefieldPromotionBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const secondLineHandler: previous.V070BattleEffectHandler = {
  cardId: V070_SECOND_LINE_ID,
  expectedText: V070_SECOND_LINE_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070SecondLineBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const salvageHandler: previous.V070BattleEffectHandler = {
  cardId: V070_SALVAGE_ID,
  expectedText: V070_SALVAGE_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070SalvageBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const strategicWithdrawalHandler: previous.V070BattleEffectHandler = {
  cardId: V070_STRATEGIC_WITHDRAWAL_ID,
  expectedText: V070_STRATEGIC_WITHDRAWAL_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070StrategicWithdrawalBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const graveWardHandler: previous.V070BattleEffectHandler = {
  cardId: V070_GRAVE_WARD_ID,
  expectedText: V070_GRAVE_WARD_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PostClearMysticBattleEffect(
      state,
      owner,
      commitment.instanceId,
      V070_GRAVE_WARD_ID,
    );
  },
};

const soulForSoulHandler: previous.V070BattleEffectHandler = {
  cardId: V070_SOUL_FOR_SOUL_ID,
  expectedText: V070_SOUL_FOR_SOUL_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PostClearMysticBattleEffect(
      state,
      owner,
      commitment.instanceId,
      V070_SOUL_FOR_SOUL_ID,
    );
  },
};

const necromancyHandler: previous.V070BattleEffectHandler = {
  cardId: V070_NECROMANCY_ID,
  expectedText: V070_NECROMANCY_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PostClearMysticBattleEffect(
      state,
      owner,
      commitment.instanceId,
      V070_NECROMANCY_ID,
    );
  },
};

const valorHandler: previous.V070BattleEffectHandler = {
  cardId: V070_VALOR_ID,
  expectedText: V070_VALOR_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PostRollRerollEffect(
      state,
      owner,
      commitment.instanceId,
      V070_VALOR_ID,
    );
  },
};

const fatesTollHandler: previous.V070BattleEffectHandler = {
  cardId: V070_FATES_TOLL_ID,
  expectedText: V070_FATES_TOLL_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PostRollRerollEffect(
      state,
      owner,
      commitment.instanceId,
      V070_FATES_TOLL_ID,
    );
  },
};

const revolutionHandler: previous.V070BattleEffectHandler = {
  cardId: V070_REVOLUTION_ID,
  expectedText: V070_REVOLUTION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070RevolutionBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const assimilationHandler: previous.V070BattleEffectHandler = {
  cardId: V070_ASSIMILATION_ID,
  expectedText: V070_ASSIMILATION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070AssimilationBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const foreclosureHandler: previous.V070BattleEffectHandler = {
  cardId: V070_FORECLOSURE_ID,
  expectedText: V070_FORECLOSURE_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070ForeclosureBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const blackCovenantHandler: previous.V070BattleEffectHandler = {
  cardId: V070_BLACK_COVENANT_ID,
  expectedText: V070_BLACK_COVENANT_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070BlackCovenantBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const guiltByAssociationHandler: previous.V070BattleEffectHandler = {
  cardId: V070_GUILT_BY_ASSOCIATION_ID,
  expectedText: V070_GUILT_BY_ASSOCIATION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070GuiltByAssociationBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const hellfireHandler: previous.V070BattleEffectHandler = {
  cardId: V070_HELLFIRE_ID,
  expectedText: V070_HELLFIRE_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070HellfireBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const confessionHandler: previous.V070BattleEffectHandler = {
  cardId: V070_CONFESSION_ID,
  expectedText: V070_CONFESSION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    // Confession's real timing is before the normal Tactic reveal. The
    // pre-reveal procedure marks a physical source applied before this ordinary
    // reveal pass reaches it. A Confession introduced only at/after normal
    // reveal has missed its printed timing and does not reopen that window.
    markV070BattleCardEffectApplied(state, commitment.instanceId);
    appendV070Event(state, {
      type: 'confession_battle_timing_passed',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: commitment.instanceId,
        sourceCardId: V070_CONFESSION_ID,
      },
    });
  },
};

const scoutingReportHandler: previous.V070BattleEffectHandler = {
  cardId: V070_SCOUTING_REPORT_ID,
  expectedText: V070_SCOUTING_REPORT_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    // Scouting Report is reveal-stage interference and is consumed by the
    // pre-normal-reveal scheduler. If a copy appears only after that window,
    // its reveal timing has passed and replacing it cannot reopen the window.
    markV070BattleCardEffectApplied(state, commitment.instanceId);
    appendV070Event(state, {
      type: 'scouting_report_battle_timing_passed',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: commitment.instanceId,
        sourceCardId: V070_SCOUTING_REPORT_ID,
        role: commitment.role,
      },
    });
  },
};

const redemptionHandler: previous.V070BattleEffectHandler = {
  cardId: V070_REDEMPTION_ID,
  expectedText: V070_REDEMPTION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070RedemptionBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};


const operationalReassessmentHandler: previous.V070BattleEffectHandler = {
  cardId: V070_OPERATIONAL_REASSESSMENT_ID,
  expectedText: V070_OPERATIONAL_REASSESSMENT_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070OperationalReassessmentBattleEffect(
      state,
      owner,
      commitment.instanceId,
      commitment.role,
    );
  },
};

const contrabandHandler: previous.V070BattleEffectHandler = {
  cardId: V070_CONTRABAND_ID,
  expectedText: V070_CONTRABAND_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070ContrabandBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const underwritingHandler: previous.V070BattleEffectHandler = {
  cardId: V070_UNDERWRITING_ID,
  expectedText: V070_UNDERWRITING_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070UnderwritingBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const divestmentHandler: previous.V070BattleEffectHandler = {
  cardId: V070_DIVESTMENT_ID,
  expectedText: V070_DIVESTMENT_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070DivestmentBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const liquidationHandler: previous.V070BattleEffectHandler = {
  cardId: V070_LIQUIDATION_ID,
  expectedText: V070_LIQUIDATION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070LiquidationBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const marginLoanHandler: previous.V070BattleEffectHandler = {
  cardId: V070_MARGIN_LOAN_ID,
  expectedText: V070_MARGIN_LOAN_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070MarginLoanBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const cornerTheMarketHandler: previous.V070BattleEffectHandler = {
  cardId: V070_CORNER_THE_MARKET_ID,
  expectedText: V070_CORNER_THE_MARKET_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070FinancierAftermathBattleEffect(
      state,
      owner,
      commitment.instanceId,
      V070_CORNER_THE_MARKET_ID,
    );
  },
};

const leveragedBuyoutHandler: previous.V070BattleEffectHandler = {
  cardId: V070_LEVERAGED_BUYOUT_ID,
  expectedText: V070_LEVERAGED_BUYOUT_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070FinancierAftermathBattleEffect(
      state,
      owner,
      commitment.instanceId,
      V070_LEVERAGED_BUYOUT_ID,
    );
  },
};

const monetaryCrisisHandler: previous.V070BattleEffectHandler = {
  cardId: V070_MONETARY_CRISIS_ID,
  expectedText: V070_MONETARY_CRISIS_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070FinancierAftermathBattleEffect(
      state,
      owner,
      commitment.instanceId,
      V070_MONETARY_CRISIS_ID,
    );
  },
};

const deferredHandlers = new Map<string, previous.V070BattleEffectHandler>([
  [V070_REARGUARD_ID, rearguardHandler],
  [V070_PATHS_OF_SHADOW_ID, pathsOfShadowHandler],
  [V070_NATURES_ALTAR_ID, naturesAltarHandler],
  [V070_SCORCHED_EARTH_ID, scorchedEarthHandler],
  [V070_BATTLEFIELD_PROMOTION_ID, battlefieldPromotionHandler],
  [V070_SECOND_LINE_ID, secondLineHandler],
  [V070_SALVAGE_ID, salvageHandler],
  [V070_STRATEGIC_WITHDRAWAL_ID, strategicWithdrawalHandler],
  [V070_GRAVE_WARD_ID, graveWardHandler],
  [V070_SOUL_FOR_SOUL_ID, soulForSoulHandler],
  [V070_NECROMANCY_ID, necromancyHandler],
  [V070_VALOR_ID, valorHandler],
  [V070_FATES_TOLL_ID, fatesTollHandler],
  [V070_REVOLUTION_ID, revolutionHandler],
  [V070_ASSIMILATION_ID, assimilationHandler],
  [V070_FORECLOSURE_ID, foreclosureHandler],
  [V070_UNDERWRITING_ID, underwritingHandler],
  [V070_BLACK_COVENANT_ID, blackCovenantHandler],
  [V070_HELLFIRE_ID, hellfireHandler],
  [V070_CONFESSION_ID, confessionHandler],
  [V070_SCOUTING_REPORT_ID, scoutingReportHandler],
  [V070_REDEMPTION_ID, redemptionHandler],
  [V070_OPERATIONAL_REASSESSMENT_ID, operationalReassessmentHandler],
  [V070_CONTRABAND_ID, contrabandHandler],
  [V070_GUILT_BY_ASSOCIATION_ID, guiltByAssociationHandler],
  [V070_DIVESTMENT_ID, divestmentHandler],
  [V070_LIQUIDATION_ID, liquidationHandler],
  [V070_MARGIN_LOAN_ID, marginLoanHandler],
  [V070_CORNER_THE_MARKET_ID, cornerTheMarketHandler],
  [V070_LEVERAGED_BUYOUT_ID, leveragedBuyoutHandler],
  [V070_MONETARY_CRISIS_ID, monetaryCrisisHandler],
  [V070_CAPITAL_GAINS_ID, capitalGainsHandler],
  [V070_EXCOMMUNICATION_ID, excommunicationHandler],
  [V070_SUPPLIES_ID, suppliesHandler],
]);

export const V070_SUPPORTED_REVEAL_EFFECT_IDS = [
  ...previous.V070_SUPPORTED_REVEAL_EFFECT_IDS,
  ...deferredHandlers.keys(),
] as readonly string[];

export function v070BattleEffectHandler(
  cardId: string,
): previous.V070BattleEffectHandler | undefined {
  return deferredHandlers.get(cardId) ?? previous.v070BattleEffectHandler(cardId);
}

export function applyV070LateAdditionalTacticRevealEffect(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): V070UnsupportedBattleEffect[] {
  const cardId =
    state.cardInstances[commitment.instanceId]?.cardId ?? '';
  const handler = deferredHandlers.get(cardId);
  if (!handler) {
    return previous.applyV070LateAdditionalTacticRevealEffect(
      state,
      commitment,
    );
  }

  const card = v070CanonicalContent.cardsById.get(cardId);
  const relevant = card?.effects.filter(effect =>
    effect.label === 'Tactic'
    || effect.label === 'Gambit/Tactic'
  ) ?? [];
  if (relevant.length !== 1
    || relevant[0]?.text !== handler.expectedText) {
    return relevant.map(effect => ({
      owner: commitment.owner,
      instanceId: commitment.instanceId,
      cardId,
      role: 'tactic' as const,
      label: effect.label,
      text: effect.text,
      encounteredAt: 'reveal_tactics' as const,
    }));
  }

  if (isV070BattleCardEffectNegated(
    state,
    commitment.instanceId,
  )) {
    appendV070Event(state, {
      type: 'battle_card_effect_skipped_negated',
      actor: commitment.owner,
      visibility: 'public',
      payload: {
        instanceId: commitment.instanceId,
        cardId,
        role: commitment.role,
      },
    });
    return [];
  }

  if (card?.trait === 'Arcane'
    && v070MonasterySuppressesArcaneBattleEffects(state)) {
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
    return [];
  }

  handler.apply({
    state,
    owner: commitment.owner,
    opponent: commitment.owner === 'A' ? 'B' : 'A',
    commitment,
  });
  markV070BattleCardEffectApplied(
    state,
    commitment.instanceId,
  );
  appendV070Event(state, {
    type: 'battle_card_effect_applied',
    actor: commitment.owner,
    visibility: 'public',
    payload: {
      instanceId: commitment.instanceId,
      cardId,
      role: commitment.role,
      timing: 'reveal',
      revealClass: 'ordinary',
      lateAdditionalTactic: true,
    },
  });
  return [];
}

export function applyV070PostTacticsReplacementRevealEffect(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): V070UnsupportedBattleEffect[] {
  const cardId =
    state.cardInstances[commitment.instanceId]?.cardId ?? '';
  const card = v070CanonicalContent.cardsById.get(cardId);
  const relevant = card?.effects.filter(effect =>
    effect.label === (commitment.role === 'gambit' ? 'Gambit' : 'Tactic')
    || effect.label === 'Gambit/Tactic'
  ) ?? [];
  const handler = v070BattleEffectHandler(cardId);

  if (!handler
    || relevant.length !== 1
    || relevant[0]?.text !== handler.expectedText) {
    return relevant.map(effect => ({
      owner: commitment.owner,
      instanceId: commitment.instanceId,
      cardId,
      role: commitment.role,
      label: effect.label,
      text: effect.text,
      encounteredAt: 'reveal_tactics' as const,
    }));
  }

  if (isV070BattleCardEffectNegated(
    state,
    commitment.instanceId,
  )) {
    appendV070Event(state, {
      type: 'battle_card_effect_skipped_negated',
      actor: commitment.owner,
      visibility: 'public',
      payload: {
        instanceId: commitment.instanceId,
        cardId,
        role: commitment.role,
      },
    });
    return [];
  }

  if (card?.trait === 'Arcane'
    && v070MonasterySuppressesArcaneBattleEffects(state)) {
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
    return [];
  }

  handler.apply({
    state,
    owner: commitment.owner,
    opponent: commitment.owner === 'A' ? 'B' : 'A',
    commitment,
  });
  markV070BattleCardEffectApplied(
    state,
    commitment.instanceId,
  );
  appendV070Event(state, {
    type: 'battle_card_effect_applied',
    actor: commitment.owner,
    visibility: 'public',
    payload: {
      instanceId: commitment.instanceId,
      cardId,
      role: commitment.role,
      timing: 'reveal',
      revealClass: 'ordinary',
      postTacticsReplacement: true,
    },
  });
  return [];
}

/**
 * Current-release audit adapter. Runtime resolution remains on the frozen
 * v0.7.0 handler graph until migrated deliberately; reviewed wording-only
 * changes can expose the current exact text here when behavior is unchanged.
 */
export function currentBattleEffectHandler(
  cardId: string,
): previous.V070BattleEffectHandler | undefined {
  const handler = v070BattleEffectHandler(cardId);
  if (!handler) return undefined;
  if (cardId === V070_DIVINE_MERCY_ID) {
    return {
      ...handler,
      expectedText: CURRENT_DIVINE_MERCY_BATTLE_TEXT,
    };
  }
  if (cardId === V070_ASSIMILATION_ID) {
    return {
      ...handler,
      expectedText: CURRENT_ASSIMILATION_BATTLE_TEXT,
    };
  }
  if (cardId === V070_FORECLOSURE_ID) {
    return {
      ...handler,
      expectedText: CURRENT_FORECLOSURE_BATTLE_TEXT,
    };
  }
  return handler;
}

configureV070WitchcraftBattleEffectHandlerResolver(v070BattleEffectHandler);

export function v070BattleRevealEffectClass(
  cardId: string,
): previous.V070RevealEffectClass {
  if (cardId === V070_SCOUTING_REPORT_ID) return 'interference';
  if (deferredHandlers.has(cardId)) return 'ordinary';
  return previous.v070BattleRevealEffectClass(cardId);
}

export function v070BattleRoleSupportsPreReveal(
  state: V070GameState,
  role: 'gambit' | 'tactic',
): boolean {
  const runtime = state.battleRuntime;
  if (!runtime) return false;
  const commitments = (['A', 'B'] as const).flatMap(playerId => {
    const participant = runtime.participants[playerId];
    return role === 'gambit'
      ? [
          ...(participant.gambit ? [participant.gambit] : []),
          ...participant.additionalGambits,
        ]
      : [
          ...(participant.tactic ? [participant.tactic] : []),
          ...participant.additionalTactics,
        ];
  });
  return commitments.every(commitment =>
    unsupportedRevealEffect(state, commitment, role).length === 0
  );
}

export function resolveV070SupportedRevealEffects(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const deferredPostTactics = encounteredAt === 'reveal_tactics'
    ? [
        ...takeDeferredWitchcraftGambits(state),
        ...takeDeferredRendTheVeilGambits(state),
        ...takeV070DeferredReconnaissanceGambits(state),
        ...takeV070DeferredOperationalReassessmentGambits(state),
        ...takeDeferredReinforcementsGambits(state),
        ...takeDeferredHellfireGambits(state),
      ]
    : [];
  const effectiveCommitments = [...commitments, ...deferredPostTactics];
  const unsupported = effectiveCommitments.flatMap(commitment =>
    unsupportedRevealEffect(
      state,
      commitment,
      commitment.role,
      encounteredAt,
    )
  );
  if (unsupported.length > 0) return unsupported;

  const forwarded: V070BattleCardCommitment[] = [];
  for (const commitment of effectiveCommitments) {
    const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';

    // Witchcraft, Rend the Veil, and Reconnaissance have printed
    // Gambit/Tactic text that resolves only after Tactics are revealed. A
    // copy set as the Gambit remains a legal revealed commitment, but its own
    // effect joins the reveal queue only at the post-Tactics timing.
    if (encounteredAt === 'reveal_gambits'
      && commitment.role === 'gambit'
      && (
        cardId === V070_WITCHCRAFT_ID
        || cardId === V070_REND_THE_VEIL_ID
        || cardId === V070_RECONNAISSANCE_ID
        || cardId === V070_OPERATIONAL_REASSESSMENT_ID
        || cardId === V070_REINFORCEMENTS_ID
        || cardId === V070_HELLFIRE_ID
      )) {
      if (cardId === V070_WITCHCRAFT_ID) {
        deferWitchcraftGambit(state, commitment);
      } else if (cardId === V070_REND_THE_VEIL_ID) {
        deferRendTheVeilGambit(state, commitment);
      } else if (cardId === V070_RECONNAISSANCE_ID) {
        deferV070ReconnaissanceGambit(state, commitment);
      } else if (cardId === V070_OPERATIONAL_REASSESSMENT_ID) {
        deferV070OperationalReassessmentGambit(state, commitment);
      } else if (cardId === V070_REINFORCEMENTS_ID) {
        deferReinforcementsGambit(state, commitment);
      } else {
        deferHellfireGambit(state, commitment);
      }
      continue;
    }

    const handler = deferredHandlers.get(cardId);
    if (!handler) {
      forwarded.push(commitment);
      continue;
    }

    if (isV070BattleCardEffectNegated(state, commitment.instanceId)) {
      appendV070Event(state, {
        type: 'battle_card_effect_skipped_negated',
        actor: commitment.owner,
        visibility: 'public',
        payload: {
          instanceId: commitment.instanceId,
          cardId,
          role: commitment.role,
        },
      });
      continue;
    }

    const card = v070CanonicalContent.cardsById.get(cardId);
    if (card?.trait === 'Arcane'
      && v070MonasterySuppressesArcaneBattleEffects(state)) {
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

    if (!deferredRegistrationExists(state, cardId, commitment.instanceId)) {
      handler.apply({
        state,
        owner: commitment.owner,
        opponent: commitment.owner === 'A' ? 'B' : 'A',
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
          timing: 'reveal',
          revealClass: 'ordinary',
          deferredUntil: 'aftermath',
        },
      });
    }
  }

  if (forwarded.length === 0) return [];
  return previous.resolveV070SupportedRevealEffects(
    state,
    forwarded,
    encounteredAt,
  );
}

function deferWitchcraftGambit(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.deferredWitchcraftGambitCommitments ??= [];
  if (runtime.deferredWitchcraftGambitCommitments.some(
    candidate => candidate.instanceId === commitment.instanceId,
  )) return;
  runtime.deferredWitchcraftGambitCommitments.push({ ...commitment });
}

function takeDeferredWitchcraftGambits(
  state: V070GameState,
): V070BattleCardCommitment[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const deferred = runtime.deferredWitchcraftGambitCommitments ?? [];
  runtime.deferredWitchcraftGambitCommitments = [];
  return deferred.filter(commitment =>
    state.cardInstances[commitment.instanceId]?.cardId === V070_WITCHCRAFT_ID
    && !isV070BattleCardEffectNegated(state, commitment.instanceId)
    && battleContainsCommitment(state, commitment)
  );
}

function deferRendTheVeilGambit(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.deferredRendTheVeilGambitCommitments ??= [];
  if (runtime.deferredRendTheVeilGambitCommitments.some(
    candidate => candidate.instanceId === commitment.instanceId,
  )) return;
  runtime.deferredRendTheVeilGambitCommitments.push({ ...commitment });
}

function takeDeferredRendTheVeilGambits(
  state: V070GameState,
): V070BattleCardCommitment[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const deferred = runtime.deferredRendTheVeilGambitCommitments ?? [];
  runtime.deferredRendTheVeilGambitCommitments = [];
  return deferred.filter(commitment =>
    state.cardInstances[commitment.instanceId]?.cardId === V070_REND_THE_VEIL_ID
    && !isV070BattleCardEffectNegated(state, commitment.instanceId)
    && battleContainsCommitment(state, commitment)
  );
}

function deferHellfireGambit(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.deferredHellfireGambitCommitments ??= [];
  if (runtime.deferredHellfireGambitCommitments.some(
    candidate => candidate.instanceId === commitment.instanceId,
  )) return;
  runtime.deferredHellfireGambitCommitments.push({ ...commitment });
}

function takeDeferredHellfireGambits(
  state: V070GameState,
): V070BattleCardCommitment[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const deferred = runtime.deferredHellfireGambitCommitments ?? [];
  runtime.deferredHellfireGambitCommitments = [];
  return deferred.filter(commitment =>
    state.cardInstances[commitment.instanceId]?.cardId === V070_HELLFIRE_ID
    && !isV070BattleCardEffectNegated(state, commitment.instanceId)
    && battleContainsCommitment(state, commitment)
  );
}

function deferReinforcementsGambit(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.deferredReinforcementsGambitCommitments ??= [];
  if (runtime.deferredReinforcementsGambitCommitments.some(
    candidate => candidate.instanceId === commitment.instanceId,
  )) return;
  runtime.deferredReinforcementsGambitCommitments.push({
    ...commitment,
  });
}

function takeDeferredReinforcementsGambits(
  state: V070GameState,
): V070BattleCardCommitment[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const deferred =
    runtime.deferredReinforcementsGambitCommitments ?? [];
  runtime.deferredReinforcementsGambitCommitments = [];
  return deferred.filter(commitment =>
    state.cardInstances[commitment.instanceId]?.cardId
      === V070_REINFORCEMENTS_ID
    && !isV070BattleCardEffectNegated(state, commitment.instanceId)
    && battleContainsCommitment(state, commitment)
  );
}

function battleContainsCommitment(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): boolean {
  const participant = state.battleRuntime?.participants[commitment.owner];
  if (!participant) return false;
  const candidates = commitment.role === 'gambit'
    ? [
        ...(participant.gambit ? [participant.gambit] : []),
        ...participant.additionalGambits,
      ]
    : [
        ...(participant.tactic ? [participant.tactic] : []),
        ...participant.additionalTactics,
      ];
  return candidates.some(candidate => candidate.instanceId === commitment.instanceId);
}

function deferredRegistrationExists(
  state: V070GameState,
  cardId: string,
  sourceInstanceId: string,
): boolean {
  if (cardId === V070_PATHS_OF_SHADOW_ID) {
    return state.battleRuntime?.pathsOfShadowBattleSourceInstanceIds
      ?.includes(sourceInstanceId) ?? false;
  }
  if (cardId === V070_CAPITAL_GAINS_ID) {
    return state.battleRuntime?.capitalGainsBattleSourceInstanceIds
      ?.includes(sourceInstanceId) ?? false;
  }
  if (cardId === V070_EXCOMMUNICATION_ID) {
    return state.battleRuntime?.excommunicationBattleSourceInstanceIds
      ?.includes(sourceInstanceId) ?? false;
  }
  if (cardId === V070_SUPPLIES_ID) {
    return state.battleRuntime?.suppliesBattleSourceInstanceIds
      ?.includes(sourceInstanceId) ?? false;
  }
  if (cardId === V070_HELLFIRE_ID) {
    return state.battleRuntime?.hellfireResolvedSourceInstanceIds
      ?.includes(sourceInstanceId) ?? false;
  }
  if (cardId === V070_CONFESSION_ID) {
    return hasV070BattleCardEffectApplied(state, sourceInstanceId);
  }
  if (cardId === V070_SCOUTING_REPORT_ID) {
    return hasV070BattleCardEffectApplied(state, sourceInstanceId);
  }
  if (cardId === V070_REDEMPTION_ID) {
    return v070RedemptionAftermathEffects(state).some(
      effect => effect.sourceInstanceId === sourceInstanceId,
    );
  }
  if (cardId === V070_CONTRABAND_ID) {
    return state.battleRuntime?.contrabandResolvedSourceInstanceIds
      ?.includes(sourceInstanceId) ?? false;
  }
  if (cardId === V070_GUILT_BY_ASSOCIATION_ID) {
    return v070GuiltByAssociationAftermathEffects(state).some(
      effect => effect.sourceInstanceId === sourceInstanceId,
    );
  }
  if (cardId === V070_REARGUARD_ID) {
    return state.battleRuntime?.battleCardAftermathAssetBanks.some(bank =>
      bank.sourceCardId === V070_REARGUARD_ID
      && bank.sourceInstanceId === sourceInstanceId
    ) ?? false;
  }
  if (cardId === V070_NATURES_ALTAR_ID
    || cardId === V070_SCORCHED_EARTH_ID) {
    return state.battleRuntime?.battleCardAftermathOverlayPlacements.some(
      placement =>
        placement.sourceCardId === cardId
        && placement.sourceInstanceId === sourceInstanceId,
    ) ?? false;
  }
  if (cardId === V070_BATTLEFIELD_PROMOTION_ID
    || cardId === V070_SECOND_LINE_ID
    || cardId === V070_SALVAGE_ID
    || cardId === V070_STRATEGIC_WITHDRAWAL_ID) {
    return state.battleRuntime?.battleCardAftermathDestinationChoices.some(
      choice =>
        choice.sourceCardId === cardId
        && choice.sourceInstanceId === sourceInstanceId,
    ) ?? false;
  }
  if (cardId === V070_GRAVE_WARD_ID
    || cardId === V070_SOUL_FOR_SOUL_ID
    || cardId === V070_NECROMANCY_ID) {
    return state.battleRuntime?.battleCardPostClearAftermathEffects.some(
      effect =>
        effect.sourceCardId === cardId
        && effect.sourceInstanceId === sourceInstanceId,
    ) ?? false;
  }
  if (cardId === V070_VALOR_ID || cardId === V070_FATES_TOLL_ID) {
    return state.battleRuntime?.battleCardPostRollRerolls.some(
      effect =>
        effect.sourceCardId === cardId
        && effect.sourceInstanceId === sourceInstanceId,
    ) ?? false;
  }
  if (cardId === V070_REVOLUTION_ID) {
    return state.battleRuntime?.battleCardPostRollExchanges.some(
      effect =>
        effect.sourceCardId === cardId
        && effect.sourceInstanceId === sourceInstanceId,
    ) ?? false;
  }
  if (cardId === V070_ASSIMILATION_ID
    || cardId === V070_FORECLOSURE_ID) {
    return state.battleRuntime?.battleCardAftermathCaptures.some(
      effect =>
        effect.sourceCardId === cardId
        && effect.sourceInstanceId === sourceInstanceId,
    ) ?? false;
  }
  return false;
}

function unsupportedRevealEffect(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
  role: 'gambit' | 'tactic',
  encounteredAt: 'reveal_gambits' | 'reveal_tactics' =
    role === 'gambit' ? 'reveal_gambits' : 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
  const card = v070CanonicalContent.cardsById.get(cardId);
  if (!card) {
    return [{
      owner: commitment.owner,
      instanceId: commitment.instanceId,
      cardId,
      role: commitment.role,
      label: role === 'gambit' ? 'Gambit' : 'Tactic',
      text: 'Unknown canonical card.',
      encounteredAt,
    }];
  }
  if (card.trait === 'Arcane'
    && v070MonasterySuppressesArcaneBattleEffects(state)) {
    return [];
  }

  const relevant = card.effects.filter(effect =>
    effect.label === (role === 'gambit' ? 'Gambit' : 'Tactic')
    || effect.label === 'Gambit/Tactic'
  );
  if (relevant.length === 0) return [];

  const handler = v070BattleEffectHandler(cardId);
  if (handler
    && relevant.length === 1
    && relevant[0]?.text === handler.expectedText) {
    return [];
  }

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
