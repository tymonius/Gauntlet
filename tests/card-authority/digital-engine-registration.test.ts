import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../../src/content/v070';
import { V070_EXECUTABLE_ACTION_CARD_IDS } from '../../src/v070/turn-engine-core';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from '../../src/v070/battle-effects';

const OUTPUT = path.join(
  process.cwd(),
  'artifacts/card-authority/digital-engine-registration.json',
);
const BASELINE = path.join(
  process.cwd(),
  'config/v070-digital-engine-registration-authority.json',
);

interface V070DigitalEngineRegistrationBaseline {
  schemaVersion: 1;
  releaseVersion: string;
  actionSurfaces: number;
  executableActionSurfaces: number;
  battleSurfaces: number;
  registeredBattleSurfaces: number;
  unsupportedActionSurfaceIds: string[];
  unsupportedBattleSurfaceKeys: string[];
  note: string;
}

function battleEffects(cardId: string) {
  const card = v070CanonicalContent.cardsById.get(cardId);
  return card?.effects.filter(effect =>
    effect.label === 'Gambit'
    || effect.label === 'Tactic'
    || effect.label === 'Gambit/Tactic'
  ) ?? [];
}

function battleSurfaceKey(
  cardId: string,
  index: number,
  label: string,
): string {
  return `${cardId}::${index}::${label}`;
}

function registrationBaseline(): V070DigitalEngineRegistrationBaseline {
  return JSON.parse(
    fs.readFileSync(BASELINE, 'utf8'),
  ) as V070DigitalEngineRegistrationBaseline;
}

describe('v0.7.0 digital engine effect registration', () => {
  test('locks Action and battle registration against the reviewed parity baseline', () => {
    const baseline = registrationBaseline();
    const executableActions = new Set<string>(V070_EXECUTABLE_ACTION_CARD_IDS);
    const supportedBattle = new Set<string>(V070_SUPPORTED_REVEAL_EFFECT_IDS);

    expect(baseline.schemaVersion).toBe(1);
    expect(v070CanonicalContent.rulesVersion).toBe(baseline.releaseVersion);
    expect(
      supportedBattle.size,
      'Battle registration must not contain duplicate card IDs.',
    ).toBe(V070_SUPPORTED_REVEAL_EFFECT_IDS.length);

    for (const cardId of executableActions) {
      const card = v070CanonicalContent.cardsById.get(cardId);
      expect(card, `Executable Action card ${cardId} must be canonical`).toBeDefined();
      expect(
        card?.effects.some(effect => effect.label === 'Action'),
        `Executable Action card ${cardId} must have a released Action surface`,
      ).toBe(true);
    }

    for (const cardId of supportedBattle) {
      const card = v070CanonicalContent.cardsById.get(cardId);
      expect(card, `Supported battle card ${cardId} must be canonical`).toBeDefined();
      const relevant = battleEffects(cardId);
      expect(
        relevant.length,
        `Supported battle card ${cardId} must have a released Gambit/Tactic surface`,
      ).toBeGreaterThan(0);
      const handler = v070BattleEffectHandler(cardId);
      expect(handler, `Supported battle card ${cardId} must resolve to a handler`).toBeDefined();
      expect(
        relevant.some(effect => effect.text === handler?.expectedText),
        `Battle handler ${cardId} expectedText must equal a released battle effect`,
      ).toBe(true);
    }

    const cards = v070CanonicalContent.content.cards.map(card => {
      const action = card.effects.find(effect => effect.label === 'Action');
      const battles = card.effects
        .map((effect, index) => ({ effect, index }))
        .filter(({ effect }) =>
          effect.label === 'Gambit'
          || effect.label === 'Tactic'
          || effect.label === 'Gambit/Tactic'
        );
      const handler = v070BattleEffectHandler(card.id);

      return {
        id: card.id,
        name: card.name,
        allegiance: card.allegiance,
        action: action
          ? {
              text: action.text,
              executable: executableActions.has(card.id),
            }
          : null,
        battle: battles.map(({ effect, index }) => ({
          key: battleSurfaceKey(card.id, index, effect.label),
          index,
          label: effect.label,
          text: effect.text,
          registered:
            supportedBattle.has(card.id)
            && handler?.expectedText === effect.text,
          handlerExpectedTextMatches: handler?.expectedText === effect.text,
        })),
      };
    });

    const actionSurfaces = cards.filter(card => card.action);
    const battleSurfaces = cards.flatMap(card => card.battle);
    const unsupportedActionSurfaces = actionSurfaces
      .filter(card => !card.action?.executable)
      .map(card => card.id)
      .sort();
    const unsupportedBattleSurfaces = cards
      .flatMap(card => card.battle
        .filter(effect => !effect.registered)
        .map(effect => ({
          key: effect.key,
          cardId: card.id,
          cardName: card.name,
          index: effect.index,
          label: effect.label,
          text: effect.text,
        })))
      .sort((left, right) => left.key.localeCompare(right.key));
    const unsupportedBattleSurfaceKeys = unsupportedBattleSurfaces
      .map(effect => effect.key);

    const report = {
      schemaVersion: 2,
      releaseVersion: v070CanonicalContent.rulesVersion,
      actionSurfaces: actionSurfaces.length,
      executableActionSurfaces: actionSurfaces.filter(card => card.action?.executable).length,
      unsupportedActionSurfaces,
      battleSurfaces: battleSurfaces.length,
      registeredBattleSurfaces: battleSurfaces.filter(effect => effect.registered).length,
      unsupportedBattleSurfaceKeys,
      unsupportedBattleSurfaces,
      cards,
    };

    expect(report.actionSurfaces).toBe(baseline.actionSurfaces);
    expect(report.executableActionSurfaces).toBe(
      baseline.executableActionSurfaces,
    );
    expect(report.unsupportedActionSurfaces).toEqual(
      baseline.unsupportedActionSurfaceIds,
    );
    expect(report.battleSurfaces).toBe(baseline.battleSurfaces);
    expect(report.registeredBattleSurfaces).toBe(
      baseline.registeredBattleSurfaces,
    );
    expect(report.unsupportedBattleSurfaceKeys).toEqual(
      baseline.unsupportedBattleSurfaceKeys,
    );
    expect(
      report.registeredBattleSurfaces
        + report.unsupportedBattleSurfaceKeys.length,
    ).toBe(report.battleSurfaces);

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
    console.log(
      `v0.7.0 engine registration: ${report.executableActionSurfaces}/${report.actionSurfaces} Action surfaces executable; ${report.registeredBattleSurfaces}/${report.battleSurfaces} battle surfaces registered; ${report.unsupportedBattleSurfaceKeys.length} battle surfaces explicitly queued.`,
    );
  });
});
