from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {path}, found {count} for:\n{old}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "src/state/apply-neutral.ts",
    """import {
  ARMISTICE,
  expireArmisticeConditions,
  registerArmisticeActionCondition,
  requireArmisticeBattleAllowed,
  resolveArmisticeBattleAfterCancellation,
} from './neutral-armistice';""",
    """import {
  openNextArmisticeChoice,
  queueArmisticeAfterNormalDraw,
  requireArmisticeBattleAllowed,
  resolveArmisticeBattleAfterCancellation,
  resolveArmisticeChoice,
} from './neutral-armistice';""",
)

replace_once(
    "src/state/apply-neutral.ts",
    """  openNextSuppliesChoice(game);
  openNextFootholdChoice(game);""",
    """  openNextSuppliesChoice(game);
  openNextArmisticeChoice(game);
  openNextFootholdChoice(game);""",
)

replace_once(
    "src/state/apply-neutral.ts",
    """    const resolved = pendingKind === 'assimilation_asset'
      ? (resolveAssimilationChoice(next, action), {})
      : pendingKind === 'arcane_knowledge_battle'""",
    """    const resolved = pendingKind === 'assimilation_asset'
      ? (resolveAssimilationChoice(next, action), {})
      : pendingKind === 'armistice_asset'
        ? (resolveArmisticeChoice(next, action), {})
      : pendingKind === 'arcane_knowledge_battle'""",
)

replace_once(
    "src/state/apply-neutral.ts",
    """  if (action.type === 'play_action_card' && action.cardId === ARMISTICE) {
    registerArmisticeActionCondition(result.state, action.playerId);
  }
""",
    "",
)

replace_once(
    "src/state/apply-neutral.ts",
    "    expireArmisticeConditions(result.state, game.turn);\n",
    "",
)

replace_once(
    "src/state/apply-neutral.ts",
    """  if (normalDraw) {
    queueSuppliesAfterNormalDraw(result.state, action.playerId);
  }""",
    """  if (normalDraw) {
    queueSuppliesAfterNormalDraw(result.state, action.playerId);
    queueArmisticeAfterNormalDraw(result.state, action.playerId);
  }""",
)

replace_once(
    "src/state/views.ts",
    "    neutralArmisticeConditions: structuredClone(game.neutralArmisticeConditions),\n",
    "",
)

replace_once(
    "src/state/views.ts",
    """    || kind === 'revolution_battle'
    || kind === 'sequestration_action'""",
    """    || kind === 'revolution_battle'
    || kind === 'armistice_asset'
    || kind === 'sequestration_action'""",
)

replace_once(
    "src/types/neutral.ts",
    """export interface PendingDecoysAssetChoice {
  kind: 'decoys_asset';
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  entryId: string;
  assetOptions: DecoysAssetExit[];
  triggersRemaining: number;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}
""",
    """export interface PendingDecoysAssetChoice {
  kind: 'decoys_asset';
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  entryId: string;
  assetOptions: DecoysAssetExit[];
  triggersRemaining: number;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface ArmisticeAssetQueueEntry {
  id: string;
  playerId: PlayerID;
  triggersRemaining: number;
}

export interface PendingArmisticeAssetChoice {
  kind: 'armistice_asset';
  playerId: PlayerID;
  entryId: string;
  triggersRemaining: number;
  cardOptions: CardID[];
  options: Array<'select_cards' | 'use'>;
  resumePriorityPlayer?: PlayerID;
}
""",
)

replace_once(
    "src/types/neutral.ts",
    """export type PendingNeutralChoice =
  | PendingDecoysAssetChoice""",
    """export type PendingNeutralChoice =
  | PendingDecoysAssetChoice
  | PendingArmisticeAssetChoice""",
)

replace_once(
    "src/types/game.ts",
    """import type { CounterworksOverlayPlacementRequest, CourtMartialCleanupRequest, DecoysAssetQueueEntry, FootholdAssetQueueEntry, PendingNeutralChoice,""",
    """import type { ArmisticeAssetQueueEntry, CounterworksOverlayPlacementRequest, CourtMartialCleanupRequest, DecoysAssetQueueEntry, FootholdAssetQueueEntry, PendingNeutralChoice,""",
)

replace_once(
    "src/types/game.ts",
    "export interface NeutralArmisticeCondition { playerId: PlayerID; sourceCardId: CardID; playedTurn: number; expiresAtTurn: number; }\n",
    "",
)

replace_once(
    "src/types/game.ts",
    """  neutralAssimilationBattleResolution?: NeutralAssimilationBattleResolution;
  neutralArmisticeConditions?: NeutralArmisticeCondition[];
  neutralCounterworksOverlayQueue?: CounterworksOverlayPlacementRequest[];""",
    """  neutralAssimilationBattleResolution?: NeutralAssimilationBattleResolution;
  neutralArmisticeAssetQueue?: ArmisticeAssetQueueEntry[];
  neutralCounterworksOverlayQueue?: CounterworksOverlayPlacementRequest[];""",
)

replace_once(
    "src/types/game.ts",
    "  neutralArmisticeConditions?: NeutralArmisticeCondition[];\n",
    "",
)

replace_once(
    "src/state/neutral-requisition.ts",
    "import { drawFromDeck } from './draw';\n",
    "import { drawFromDeck } from './draw';\nimport { armisticeCanBeVoluntarilyDiscarded } from './neutral-armistice';\n",
)

replace_once(
    "src/state/neutral-requisition.ts",
    """  if (!player.zones.assetBank.includes(targets[0].cardId)) {
    throw new GameActionError('The chosen Requisition sacrifice must be in your Asset Bank.');
  }
""",
    """  if (!player.zones.assetBank.includes(targets[0].cardId)) {
    throw new GameActionError('The chosen Requisition sacrifice must be in your Asset Bank.');
  }
  if (!armisticeCanBeVoluntarilyDiscarded(targets[0].cardId)) {
    throw new GameActionError('You cannot voluntarily discard Armistice to pay Requisition.');
  }
""",
)

replace_once(
    "src/state/neutral-requisition.ts",
    """    if (count < 1 || game.players[participant.playerId].zones.assetBank.length < 1) continue;""",
    """    const eligibleAssets = game.players[participant.playerId].zones.assetBank
      .filter(armisticeCanBeVoluntarilyDiscarded).length;
    if (count < 1 || eligibleAssets < 1) continue;""",
)

replace_once(
    "src/state/neutral-requisition.ts",
    """    const available = game.players[entry.playerId]?.zones.assetBank.length ?? 0;""",
    """    const available = game.players[entry.playerId]?.zones.assetBank
      .filter(armisticeCanBeVoluntarilyDiscarded).length ?? 0;""",
)

replace_once(
    "src/state/neutral-requisition.ts",
    """  const cardOptions = unique(game.players[entry.playerId].zones.assetBank);""",
    """  const cardOptions = unique(
    game.players[entry.playerId].zones.assetBank.filter(armisticeCanBeVoluntarilyDiscarded),
  );""",
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
