from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {path}, found {count} for:\n{old}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "src/types/neutral.ts",
    """export interface DecoysAssetExit {
  exitId: string;
  cardId: CardID;
  destination?: Exclude<DecoysAssetZone, 'asset_bank'>;
}

export interface DecoysSourceLocation {
  sourceId: string;
  zone: DecoysAssetZone;
}

export interface DecoysAssetQueueEntry {
  id: string;
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  affectedAssets: DecoysAssetExit[];
  decoySources: DecoysSourceLocation[];
  triggersRemaining: number;
}""",
    """export interface DecoysAssetExit {
  exitId: string;
  cardId: CardID;
  destination?: Exclude<DecoysAssetZone, 'asset_bank'>;
  faceDown?: boolean;
}

export interface DecoysSourceLocation {
  sourceId: string;
  zone: DecoysAssetZone;
  exitId?: string;
}

export interface DecoysAssetQueueEntry {
  id: string;
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  affectedAssets: DecoysAssetExit[];
  deferredExits: DecoysAssetExit[];
  decoySources: DecoysSourceLocation[];
  triggersRemaining: number;
}""",
)

replace_once(
    "src/state/neutral-redemption.ts",
    """  game.neutralRedemptionDiscardQueue = queue.length > 0 ? queue : undefined;
  return registered;
}

function trimDiscardQueue""",
    """  game.neutralRedemptionDiscardQueue = queue.length > 0 ? queue : undefined;
  return registered;
}

/** Registers a known set of cards that entered one player's Discard Pile. */
export function registerRedemptionDiscardCardIds(
  game: GameState,
  playerId: PlayerID,
  cardIds: CardID[],
  sourcePlayerId: PlayerID | undefined,
): number {
  if (!sourcePlayerId || playerId === sourcePlayerId || cardIds.length < 1) return 0;
  if (!bankedAssetUseAllowed(game, playerId)) return 0;
  const assetCount = activeBankedAssetCopies(game, playerId, REDEMPTION);
  if (assetCount < 1) return 0;

  const player = game.players[playerId];
  if (!player) return 0;
  const available = [...player.zones.discard];
  const entered = cardIds.filter((cardId) => removeOne(available, cardId));
  if (entered.length < 1) return 0;

  const queue = game.neutralRedemptionDiscardQueue ?? [];
  queue.push({
    id: `${game.id}-redemption-discard-${game.turn}-${queue.length + 1}`,
    playerId,
    sourcePlayerId,
    cardIds: entered,
    triggersRemaining: Math.min(assetCount, entered.length),
  });
  game.neutralRedemptionDiscardQueue = queue;
  return 1;
}

function trimDiscardQueue""",
)

replace_once(
    "src/state/apply-neutral.ts",
    """  registerRedemptionDiscardEntries,
  resolveRedemptionChoice,""",
    """  registerRedemptionDiscardCardIds,
  registerRedemptionDiscardEntries,
  resolveRedemptionChoice,""",
)

replace_once(
    "src/state/apply-neutral.ts",
    """      : pendingKind === 'decoys_asset'
        ? (resolveDecoysChoice(next, action), {})""",
    """      : pendingKind === 'decoys_asset'
        ? resolveDecoysChoice(next, action)""",
)

replace_once(
    "src/state/apply-neutral.ts",
    """    if (sequestrationDiscardBefore && sequestrationSourcePlayerId) {
      registerRedemptionDiscardEntries(next, sequestrationDiscardBefore, sequestrationSourcePlayerId);
    }
    reconcileSabotageAssetState(next);""",
    """    if (sequestrationDiscardBefore && sequestrationSourcePlayerId) {
      registerRedemptionDiscardEntries(next, sequestrationDiscardBefore, sequestrationSourcePlayerId);
    }
    if ('decoysFinalized' in resolved
      && resolved.decoysFinalized
      && resolved.sourcePlayerId
      && resolved.affectedPlayerId
      && resolved.discardedCardIds.length > 0) {
      registerRedemptionDiscardCardIds(
        next,
        resolved.affectedPlayerId,
        resolved.discardedCardIds,
        resolved.sourcePlayerId,
      );
    }
    reconcileSabotageAssetState(next);""",
)

replace_once(
    "src/state/neutral-decoys.test.ts",
    """import { DECOYS } from './neutral-decoys-battle';
import { initializeGame } from './initialize';

const ASSET_A = 'neutral-entrenchment';
const ASSET_B = 'neutral-fortifications';""",
    """import { DECOYS } from './neutral-decoys-battle';
import { initializeGame } from './initialize';
import { registerRedemptionDiscardCardIds } from './neutral-redemption';

const ASSET_A = 'neutral-entrenchment';
const ASSET_B = 'neutral-fortifications';
const REDEMPTION = 'neutral-redemption';""",
)

replace_once(
    "src/state/neutral-decoys.test.ts",
    """  it('does not respond to the controller own effect or from an inactive copy', () => {""",
    """  it('exposes only unprotected opposing discards to Redemption', () => {
    const state = game();
    state.players.player_2.zones.assetBank = [DECOYS, REDEMPTION, ASSET_A, ASSET_B];
    const before = moveAssets(state, [ASSET_A, ASSET_B], 'discard');
    registerDecoysAssetExits(state, before, 'player_1');
    openNextDecoysChoice(state);

    const result = resolveDecoysChoice(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey: pendingTargetKey(state, ASSET_A),
    });
    expect(result.discardedCardIds).toEqual([ASSET_B]);
    expect(registerRedemptionDiscardCardIds(
      state,
      'player_2',
      result.discardedCardIds,
      'player_1',
    )).toBe(1);
    expect(state.neutralRedemptionDiscardQueue).toContainEqual(expect.objectContaining({
      playerId: 'player_2',
      sourcePlayerId: 'player_1',
      cardIds: [ASSET_B],
    }));
    expect(state.neutralRedemptionDiscardQueue?.[0].cardIds).not.toContain(DECOYS);
    expect(state.neutralRedemptionDiscardQueue?.[0].cardIds).not.toContain(ASSET_A);
  });

  it('does not respond to the controller own effect or from an inactive copy', () => {""",
)

standard_workflow = """name: Test

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm install

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test
"""
Path(".github/workflows/test.yml").write_text(standard_workflow)
Path(__file__).unlink()
