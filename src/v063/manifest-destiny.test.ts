import { describe, expect, test } from 'vitest';
import { v063CanonicalContent } from '../content/v063';
import { createInitialFrontLineState } from './rules';
import {
  createV063GauntletState,
  insertV063TerritoryAtFrontLine,
  insertV063TerritoryAtPlayerEnd,
  setV063DeedOwner,
  v063AssetLimit,
  v063CapitalLimit,
  v063DeedCost,
  v063DeedIncome,
  v063HasControllingInterest,
} from './gauntlet';
import {
  V063_MANIFEST_DESTINY_ID,
  resolveV063ManifestDestinyAction,
  resolveV063ManifestDestinyBattle,
  v063ManifestDestinyInstanceId,
} from './manifest-destiny';

const initialTerritories = Array.from({ length: 6 }, (_, index) => ({
  instanceId: `territory-instance-${index}`,
  cardId: `territory-${index}`,
  name: `Territory ${index}`,
}));

function initialGauntlet() {
  return createV063GauntletState(initialTerritories, createInitialFrontLineState());
}

describe('published Manifest Destiny authority', () => {
  test('locks the v0.6.3 Action, Gambit/Tactic, and normal-Territory rule note', () => {
    const card = v063CanonicalContent.cardsById.get(V063_MANIFEST_DESTINY_ID);
    expect(card?.cost).toBe(5);
    expect(card?.effects.find((effect) => effect.label === 'Action')?.text).toBe(
      'Put all other cards in your Hand and at least one Asset, totaling a minimum of three cards, in your Graveyard. Add this card to your end of the Gauntlet as a blank Territory you control.',
    );
    expect(card?.effects.find((effect) => effect.label === 'Gambit/Tactic')?.text).toBe(
      'In the Aftermath, if you win as the attacker, insert this card into the Gauntlet at your Front Line as a blank Territory you control.',
    );
    expect(card?.rules_notes).toContain(
      'After entering the Gauntlet, this card is a normal Territory with a normal Deed.',
    );
  });
});

describe('dynamic v0.6.3 Gauntlet insertion', () => {
  test('inserting at player A end shifts existing physical Positions without movement or entry', () => {
    const result = insertV063TerritoryAtPlayerEnd(initialGauntlet(), 'A', {
      instanceId: 'added-a-instance',
      cardId: 'added-a',
      name: 'Added A',
      blank: true,
    });

    expect(result.insertedIndex).toBe(0);
    expect(result.state.territories.map((territory) => territory.instanceId)).toEqual([
      'added-a-instance',
      ...initialTerritories.map((territory) => territory.instanceId),
    ]);
    expect(result.state.frontLine).toEqual({
      territoryCount: 7,
      control: { A: 4, B: 3 },
      position: { A: 1, B: 6 },
    });
    expect(result.playerTokenMovementOccurred).toBe(false);
    expect(result.enteredTerritory).toBe(false);
  });

  test('inserting at player B end extends the right edge and shifts the old outside-right coordinate', () => {
    const gauntlet = initialGauntlet();
    gauntlet.frontLine.position.B = 6;
    const result = insertV063TerritoryAtPlayerEnd(gauntlet, 'B', {
      instanceId: 'added-b-instance',
      cardId: 'added-b',
      name: 'Added B',
      blank: true,
    });

    expect(result.insertedIndex).toBe(6);
    expect(result.state.territories.at(-1)?.instanceId).toBe('added-b-instance');
    expect(result.state.frontLine).toEqual({
      territoryCount: 7,
      control: { A: 3, B: 4 },
      position: { A: 0, B: 7 },
    });
  });

  test('Front Line insertion preserves the occupied physical Territory while expanding contiguous control', () => {
    const gauntlet = initialGauntlet();
    gauntlet.frontLine.position = { A: 3, B: 4 };
    const result = insertV063TerritoryAtFrontLine(gauntlet, 'A', {
      instanceId: 'front-line-added-instance',
      cardId: 'front-line-added',
      name: 'Front Line Added',
      blank: true,
    });

    expect(result.insertedIndex).toBe(3);
    expect(result.state.territories[3].instanceId).toBe('front-line-added-instance');
    expect(result.state.frontLine.control).toEqual({ A: 4, B: 3 });
    expect(result.state.frontLine.position).toEqual({ A: 4, B: 5 });
  });

  test('physical instance identity allows both players copies of the same Territory card identity', () => {
    const first = insertV063TerritoryAtFrontLine(initialGauntlet(), 'A', {
      instanceId: 'same-card:A',
      cardId: 'same-card',
      name: 'Same Card',
      blank: true,
    }).state;
    const second = insertV063TerritoryAtFrontLine(first, 'B', {
      instanceId: 'same-card:B',
      cardId: 'same-card',
      name: 'Same Card',
      blank: true,
    }).state;

    expect(second.territories.filter((territory) => territory.cardId === 'same-card')).toHaveLength(2);
    expect(new Set(second.territories.map((territory) => territory.instanceId)).size).toBe(8);
  });
});

describe('Manifest Destiny Action', () => {
  test('puts all other Hand cards and selected Assets in the Graveyard, then adds a blank Territory at your end', () => {
    const result = resolveV063ManifestDestinyAction({
      gauntlet: initialGauntlet(),
      zones: {
        hand: [V063_MANIFEST_DESTINY_ID, 'hand-one', 'hand-two'],
        assetBank: ['asset-one', 'asset-two'],
        graveyard: ['old'],
      },
    }, 'A', [0]);

    expect(result.zones).toEqual({
      hand: [],
      assetBank: ['asset-two'],
      graveyard: ['old', 'hand-one', 'hand-two', 'asset-one'],
    });
    expect(result.gauntlet.territories[0]).toMatchObject({
      instanceId: v063ManifestDestinyInstanceId('A'),
      cardId: V063_MANIFEST_DESTINY_ID,
      name: 'Manifest Destiny',
      blank: true,
      hasDeed: true,
      deedOwner: null,
    });
    expect(result.gauntlet.frontLine.control).toEqual({ A: 4, B: 3 });
    expect(result.sourceDestination).toBe('gauntlet');
  });

  test('requires at least one Asset and at least three sacrificed cards total', () => {
    const state = {
      gauntlet: initialGauntlet(),
      zones: {
        hand: [V063_MANIFEST_DESTINY_ID, 'only-other-card'],
        assetBank: ['only-asset'],
        graveyard: [] as string[],
      },
    };
    expect(() => resolveV063ManifestDestinyAction(state, 'A', [])).toThrow(/at least one Asset/);
    expect(() => resolveV063ManifestDestinyAction(state, 'A', [0])).toThrow(/at least three/);
  });
});

describe('Manifest Destiny battle mode', () => {
  test('after an attacker win, inserts at that player Front Line and replaces normal battle-card destination', () => {
    const gauntlet = initialGauntlet();
    gauntlet.frontLine.position = { A: 3, B: 4 };
    const result = resolveV063ManifestDestinyBattle(gauntlet, 'A', {
      role: 'attacker',
      result: 'win',
    });

    expect(result.insertedIndex).toBe(3);
    expect(result.gauntlet.territories[3]).toMatchObject({
      instanceId: v063ManifestDestinyInstanceId('A'),
      cardId: V063_MANIFEST_DESTINY_ID,
      blank: true,
      hasDeed: true,
      deedOwner: null,
    });
    expect(result.gauntlet.frontLine.position).toEqual({ A: 4, B: 5 });
    expect(result.sourceDestination).toBe('gauntlet');
  });

  test('both players may independently turn their Unique copy into a Territory', () => {
    const afterA = resolveV063ManifestDestinyBattle(initialGauntlet(), 'A', {
      role: 'attacker',
      result: 'win',
    }).gauntlet;
    const afterB = resolveV063ManifestDestinyBattle(afterA, 'B', {
      role: 'attacker',
      result: 'win',
    }).gauntlet;

    const manifests = afterB.territories.filter((territory) => territory.cardId === V063_MANIFEST_DESTINY_ID);
    expect(manifests.map((territory) => territory.instanceId).sort()).toEqual([
      v063ManifestDestinyInstanceId('A'),
      v063ManifestDestinyInstanceId('B'),
    ]);
  });

  test('does not insert after a defender win, attacker loss, or withdrawal', () => {
    expect(() => resolveV063ManifestDestinyBattle(initialGauntlet(), 'A', {
      role: 'defender',
      result: 'win',
    })).toThrow(/winning as the attacker/);
    expect(() => resolveV063ManifestDestinyBattle(initialGauntlet(), 'A', {
      role: 'attacker',
      result: 'loss',
    })).toThrow(/winning as the attacker/);
    expect(() => resolveV063ManifestDestinyBattle(initialGauntlet(), 'A', {
      role: 'attacker',
      result: 'withdrawal',
    })).toThrow(/winning as the attacker/);
  });
});

describe('normal rules for an added Territory', () => {
  test('the controlled Territory immediately increases Asset and Capital limits', () => {
    const result = resolveV063ManifestDestinyBattle(initialGauntlet(), 'A', {
      role: 'attacker',
      result: 'win',
    });
    expect(v063AssetLimit(result.gauntlet, 'A')).toBe(4);
    expect(v063CapitalLimit(result.gauntlet, 'A', [2, 3])).toBe(9);
  });

  test('its unowned Deed expands Controlling Interest and uses the normal capped cost formula', () => {
    let gauntlet = initialGauntlet();
    for (const territory of gauntlet.territories) {
      gauntlet = setV063DeedOwner(gauntlet, territory.instanceId, 'A');
    }
    expect(v063HasControllingInterest(gauntlet, 'A')).toBe(true);

    const inserted = resolveV063ManifestDestinyBattle(gauntlet, 'A', {
      role: 'attacker',
      result: 'win',
    }).gauntlet;
    const manifestInstance = v063ManifestDestinyInstanceId('A');
    expect(v063HasControllingInterest(inserted, 'A')).toBe(false);
    expect(v063DeedCost(inserted, 'A', manifestInstance)).toBe(5);

    const acquired = setV063DeedOwner(inserted, manifestInstance, 'A');
    expect(v063DeedIncome(acquired, 'A')).toBe(7);
    expect(v063HasControllingInterest(acquired, 'A')).toBe(true);
  });
});
