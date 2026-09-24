import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { currentCanonicalContent } from '../../src/content/current';
import { V070_EXECUTABLE_ACTION_CARD_IDS } from '../../src/v070/turn-engine-core';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from '../../src/v070/battle-effects';

const OUTPUT = path.join(
  process.cwd(),
  'artifacts/card-authority/current-digital-engine-registration.json',
);
const BASELINE = path.join(
  process.cwd(),
  'config/current-digital-engine-registration-authority.json',
);

interface CurrentDigitalEngineRegistrationBaseline {
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
  const card = currentCanonicalContent.cardsById.get(cardId);
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

function registrationBaseline(): CurrentDigitalEngineRegistrationBaseline {
  return JSON.parse(
    fs.readFileSync(BASELINE, 'utf8'),
  ) as CurrentDigitalEngineRegistrationBaseline;
}

describe('current digital engine effect registration', () => {
  test('locks existing engine registration against current-game authority', () => {
    const baseline = registrationBaseline();
    const executableActions = new Set<string>(V070_EXECUTABLE_ACTION_CARD_IDS);
    const supportedBattle = new Set<string>(V070_SUPPORTED_REVEAL_EFFECT_IDS);

    expect(baseline.schemaVersion).toBe(1);
    expect(currentCanonicalContent.authority).toBe('current-game');
    expect(currentCanonicalContent.rulesVersion).toBe(baseline.releaseVersion);
    expect(
      supportedBattle.size,
      'Battle registration must not contain duplicate card IDs.',
    ).toBe(V070_SUPPORTED_REVEAL_EFFECT_IDS.length);

    const cards = currentCanonicalContent.content.cards.map(card => {
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

    const staleExecutableActionIds = [...executableActions]
      .filter(cardId =>
        !currentCanonicalContent.cardsById.get(cardId)?.effects.some(
          effect => effect.label === 'Action',
        )
      )
      .sort();
    expect(staleExecutableActionIds).toEqual([]);

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
      schemaVersion: 1,
      releaseVersion: currentCanonicalContent.rulesVersion,
      actionSurfaces: actionSurfaces.length,
      executableActionSurfaces: actionSurfaces.filter(
        card => card.action?.executable,
      ).length,
      unsupportedActionSurfaces,
      battleSurfaces: battleSurfaces.length,
      registeredBattleSurfaces: battleSurfaces.filter(
        effect => effect.registered,
      ).length,
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
      `Current ${report.releaseVersion} engine registration: ${report.executableActionSurfaces}/${report.actionSurfaces} Action surfaces registered; ${report.registeredBattleSurfaces}/${report.battleSurfaces} battle surfaces exactly matched; ${report.unsupportedBattleSurfaceKeys.length} battle surfaces explicitly queued.`,
    );
  });
});
