from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {path}, found {count} for:\n{old}")
    file.write_text(text.replace(old, new, 1))


# Approved current identity. Historical releases and archives remain unchanged.
replace_once(
    "docs/Gauntlet_v0.6_Neutral_Card_Pool.md",
    "## Siege Weaponry",
    "## Bombardment",
)
replace_once(
    "releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json",
    '"id": "neutral-siege-weaponry",',
    '"id": "neutral-bombardment",',
)
replace_once(
    "releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json",
    '"name": "Siege Weaponry",',
    '"name": "Bombardment",',
)
replace_once(
    "releases/v0.6.0/Gauntlet_v0.6.0_Complete_Card_Reference.md",
    "| [Siege Weaponry](../../docs/Gauntlet_v0.6_Neutral_Card_Pool.md#siege-weaponry) | 4 | Advanced | — |",
    "| [Bombardment](../../docs/Gauntlet_v0.6_Neutral_Card_Pool.md#bombardment) | 4 | Advanced | — |",
)
replace_once(
    "src/state/neutral-scorched-earth.test.ts",
    "placeRuinsOverlay(state, space, 'neutral-siege-weaponry', 'player_1');",
    "placeRuinsOverlay(state, space, 'neutral-bombardment', 'player_1');",
)
replace_once(
    "src/state/neutral-scorched-earth.test.ts",
    "expect(state.players.player_1.zones.graveyard).toContain('neutral-siege-weaponry');",
    "expect(state.players.player_1.zones.graveyard).toContain('neutral-bombardment');",
)

# Card registration and exports.
replace_once(
    "src/cards/playability.ts",
    "  'neutral-arcane-knowledge': battleAndAction('neutral-arcane-knowledge', 'discard', true),\n",
    "  'neutral-arcane-knowledge': battleAndAction('neutral-arcane-knowledge', 'discard', true),\n  'neutral-bombardment': battleAndAction('neutral-bombardment', 'removed'),\n",
)
replace_once(
    "src/state/index.ts",
    "export * from './neutral-armistice';\n",
    "export * from './neutral-armistice';\nexport * from './neutral-bombardment';\n",
)

# Public Overlay metadata and Counterworks placement request state.
replace_once(
    "src/types/military.ts",
    """  /** Occupier whose pending capture this Overlay tracks, when applicable. */
  captureDelayOccupier?: PlayerID;
}""",
    """  /** Occupier whose pending capture this Overlay tracks, when applicable. */
  captureDelayOccupier?: PlayerID;
  bombardmentSource?: 'action' | 'battle';
  bombardmentBattleId?: string;
  bombardmentOrigin?: 'hand' | 'battle_draw' | 'replayed';
}""",
)
replace_once(
    "src/types/neutral.ts",
    """  | 'military_encampment_action'
  | 'military_encampment_battle';""",
    """  | 'military_encampment_action'
  | 'military_encampment_battle'
  | 'bombardment_action'
  | 'bombardment_battle';""",
)
replace_once(
    "src/types/neutral.ts",
    """  battleId?: string;
  captureOccupierId?: PlayerID;
}""",
    """  battleId?: string;
  captureOccupierId?: PlayerID;
  resumeBattleReveal?: {
    playerId: PlayerID;
    battleCardTargets?: BattleCardTarget[];
  };
}""",
)

# Explicit standard Bombardment Overlays must not be mistaken for legacy Ruins.
replace_once(
    "src/state/territory-overlays.ts",
    """    overlay.kind === 'ruins'
    || LEGACY_RUINS_OVERLAY_CARDS.has(overlay.cardId)""",
    """    overlay.kind === 'ruins'
    || (!overlay.kind && LEGACY_RUINS_OVERLAY_CARDS.has(overlay.cardId))""",
)

# Counterworks-aware printed-effect suppression.
replace_once(
    "src/state/territory-printed-effects.ts",
    "import { topTerritoryOverlay } from './territory-overlays';\n",
    "import { counterworksOverlayInactive } from './neutral-counterworks';\nimport { topTerritoryOverlay } from './territory-overlays';\n",
)
replace_once(
    "src/state/territory-printed-effects.ts",
    """function overlaySuppressesPrintedEffect(space: BoardSpaceState): boolean {
  return Boolean(topTerritoryOverlay(space));
}""",
    """function overlaySuppressesPrintedEffect(game: GameState, space: BoardSpaceState): boolean {
  const overlay = topTerritoryOverlay(space);
  if (!overlay) return false;
  const index = (space.overlays?.length ?? 1) - 1;
  return !counterworksOverlayInactive(game, space.id, overlay, index, game.battle?.id);
}""",
)
replace_once(
    "src/state/territory-printed-effects.ts",
    "  if (overlaySuppressesPrintedEffect(space!)) return false;",
    "  if (overlaySuppressesPrintedEffect(game, space!)) return false;",
)

# Counterworks placement metadata, logs, and reveal resumption.
replace_once(
    "src/state/neutral-counterworks.ts",
    "import type { ResolveNeutralChoiceAction } from './actions';",
    "import type { ResolveBattleRevealAction, ResolveNeutralChoiceAction } from './actions';",
)
replace_once(
    "src/state/neutral-counterworks.ts",
    """  const placedOverlay = ruinsPlacement?.overlay
    ?? placeTerritoryOverlay(space, request.cardId, request.playerId);
  const replaced = ruinsPlacement?.replaced ?? [];""",
    """  const placedOverlay = ruinsPlacement?.overlay
    ?? placeTerritoryOverlay(space, request.cardId, request.playerId);
  if (request.kind === 'bombardment_action') {
    placedOverlay.kind = 'standard';
    placedOverlay.bombardmentSource = 'action';
  } else if (request.kind === 'bombardment_battle') {
    placedOverlay.kind = 'standard';
    placedOverlay.bombardmentSource = 'battle';
    placedOverlay.bombardmentBattleId = request.battleId;
    if (request.source.zone === 'battle_card') {
      placedOverlay.bombardmentOrigin = request.source.origin;
    }
  }
  const replaced = ruinsPlacement?.replaced ?? [];""",
)
replace_once(
    "src/state/neutral-counterworks.ts",
    """  } else if (request.kind.startsWith('military_encampment')) {
    log(game, request.playerId, 'military_encampment_placed', `${game.players[request.playerId].name} placed Encampment on ${space.territoryId ?? space.id}.`, { spaceId: space.id });
  }""",
    """  } else if (request.kind.startsWith('military_encampment')) {
    log(game, request.playerId, 'military_encampment_placed', `${game.players[request.playerId].name} placed Encampment on ${space.territoryId ?? space.id}.`, { spaceId: space.id });
  } else if (request.kind.startsWith('bombardment')) {
    log(game, request.playerId, 'neutral_bombardment_placed', `${game.players[request.playerId].name} placed Bombardment on ${space.id}.`, { spaceId: space.id, battleId: request.battleId, source: request.source.zone });
  }""",
)
replace_once(
    "src/state/neutral-counterworks.ts",
    "): { resumeBattleReveal?: boolean } {",
    "): { resumeBattleReveal?: boolean; deferredBattleAction?: ResolveBattleRevealAction } {",
)
replace_once(
    "src/state/neutral-counterworks.ts",
    """  if (pending.kind === 'counterworks_asset') {
    const request = game.neutralCounterworksOverlayQueue?.find((candidate) => candidate.id === pending.requestId);
    if (!request) throw new GameActionError('The Overlay placement is no longer pending.');
    if (action.choice !== 'pass' && action.choice !== 'use') throw new GameActionError('Choose whether to use Counterworks.');""",
    """  if (pending.kind === 'counterworks_asset') {
    const request = game.neutralCounterworksOverlayQueue?.find((candidate) => candidate.id === pending.requestId);
    if (!request) throw new GameActionError('The Overlay placement is no longer pending.');
    const deferredBattleAction: ResolveBattleRevealAction | undefined = request.resumeBattleReveal
      ? { type: 'resolve_battle_reveal', ...request.resumeBattleReveal }
      : undefined;
    if (action.choice !== 'pass' && action.choice !== 'use') throw new GameActionError('Choose whether to use Counterworks.');""",
)
replace_once(
    "src/state/neutral-counterworks.ts",
    """    if (!game.neutralCounterworksOverlayQueue?.length) game.neutralCounterworksOverlayQueue = undefined;
    processCounterworksOverlayQueue(game);
    return {};
  }""",
    """    if (!game.neutralCounterworksOverlayQueue?.length) game.neutralCounterworksOverlayQueue = undefined;
    processCounterworksOverlayQueue(game);
    if (deferredBattleAction && !game.pendingNeutralChoice && !game.neutralCounterworksOverlayQueue?.length) {
      return { deferredBattleAction };
    }
    return {};
  }""",
)

# Action legality.
replace_once(
    "src/state/views.ts",
    "import { ARCANE_KNOWLEDGE, canResolveArcaneKnowledgeAction } from './neutral-arcane-knowledge';\n",
    "import { ARCANE_KNOWLEDGE, canResolveArcaneKnowledgeAction } from './neutral-arcane-knowledge';\nimport { BOMBARDMENT, canResolveBombardmentAction } from './neutral-bombardment';\n",
)
replace_once(
    "src/state/views.ts",
    """    .filter((cardId) => cardId !== ARCANE_KNOWLEDGE || canResolveArcaneKnowledgeAction(game, viewer))
    .filter((cardId) => cardId !== CAPITAL_PUNISHMENT || canResolveCapitalPunishmentAction(game, viewer))""",
    """    .filter((cardId) => cardId !== ARCANE_KNOWLEDGE || canResolveArcaneKnowledgeAction(game, viewer))
    .filter((cardId) => cardId !== BOMBARDMENT || canResolveBombardmentAction(game, viewer))
    .filter((cardId) => cardId !== CAPITAL_PUNISHMENT || canResolveCapitalPunishmentAction(game, viewer))""",
)

# Dispatcher integration, including captures that occur inside Neutral choices.
replace_once(
    "src/state/apply-neutral.ts",
    """import {
  applyArcaneKnowledgeAction,
  ARCANE_KNOWLEDGE,
  openNextArcaneKnowledgeChoice,
  prepareArcaneKnowledgeAction,
  prepareArcaneKnowledgeBattleReveal,
  resolveArcaneKnowledgeChoice,
} from './neutral-arcane-knowledge';""",
    """import {
  applyArcaneKnowledgeAction,
  ARCANE_KNOWLEDGE,
  openNextArcaneKnowledgeChoice,
  prepareArcaneKnowledgeAction,
  prepareArcaneKnowledgeBattleReveal,
  resolveArcaneKnowledgeChoice,
} from './neutral-arcane-knowledge';
import {
  applyBombardmentAction,
  BOMBARDMENT,
  convertCapturedBombardmentToRuins,
  prepareBombardmentBattleReveal,
  resolveBombardmentAfterBattle,
} from './neutral-bombardment';""",
)
replace_once(
    "src/state/apply-neutral.ts",
    """import {
  clearExpiredPathfindersSuppressions,
  territoryPrintedEffectIsActive,
} from './territory-printed-effects';""",
    """import {
  clearExpiredPathfindersSuppressions,
  territoryPrintedEffectIsActive,
} from './territory-printed-effects';
import { captureTerritoryControllerSnapshot } from './territory-overlays';""",
)
replace_once(
    "src/state/apply-neutral.ts",
    """    const sequestrationDiscardBefore = sequestrationSourcePlayerId
      ? captureDiscardSnapshot(game)
      : undefined;
    const next = structuredClone(game);""",
    """    const sequestrationDiscardBefore = sequestrationSourcePlayerId
      ? captureDiscardSnapshot(game)
      : undefined;
    const territoryControllersBefore = captureTerritoryControllerSnapshot(game);
    const next = structuredClone(game);""",
)
replace_once(
    "src/state/apply-neutral.ts",
    """    reconcileSabotageAssetState(next);
    removeAbandonedProtractedSiegeOverlays(next);
    continueNeutralChoices(next);
    return { state: next };""",
    """    reconcileSabotageAssetState(next);
    removeAbandonedProtractedSiegeOverlays(next);
    convertCapturedBombardmentToRuins(next, territoryControllersBefore);
    continueNeutralChoices(next);
    return { state: next };""",
)
replace_once(
    "src/state/apply-neutral.ts",
    """    if (prepareReinforcementsBattleReveal(prepared, action)) return { state: prepared };
    if (prepareSeditionBattleReveal(prepared, action)) return { state: prepared };
    if (prepareArcaneKnowledgeBattleReveal(prepared, action)) return { state: prepared };""",
    """    if (prepareReinforcementsBattleReveal(prepared, action)) return { state: prepared };
    if (prepareSeditionBattleReveal(prepared, action)) return { state: prepared };
    if (prepareBombardmentBattleReveal(prepared, action)) return { state: prepared };
    if (prepareArcaneKnowledgeBattleReveal(prepared, action)) return { state: prepared };""",
)
replace_once(
    "src/state/apply-neutral.ts",
    "  const rousingSpeechAssetsBefore = captureRousingSpeechAssetSnapshot(game);",
    "  const territoryControllersBefore = captureTerritoryControllerSnapshot(game);\n  const rousingSpeechAssetsBefore = captureRousingSpeechAssetSnapshot(game);",
)
replace_once(
    "src/state/apply-neutral.ts",
    """  if (action.type === 'play_action_card' && action.cardId === SEQUESTRATION) {
    applySequestrationAction(result.state, action.playerId);
  }
  if (action.type === 'play_action_card' && preparedScoutingReport) {""",
    """  if (action.type === 'play_action_card' && action.cardId === SEQUESTRATION) {
    applySequestrationAction(result.state, action.playerId);
  }
  if (action.type === 'play_action_card' && action.cardId === BOMBARDMENT) {
    applyBombardmentAction(result.state, action.playerId);
  }
  if (action.type === 'play_action_card' && preparedScoutingReport) {""",
)
replace_once(
    "src/state/apply-neutral.ts",
    """    applyValorAssetDraw(result.state, priorBattle, winnerId);
    applyScorchedEarthBattleRuins(""",
    """    applyValorAssetDraw(result.state, priorBattle, winnerId);
    resolveBombardmentAfterBattle(result.state, priorBattle, winnerId);
    applyScorchedEarthBattleRuins(""",
)
replace_once(
    "src/state/apply-neutral.ts",
    """  removeAbandonedProtractedSiegeOverlays(result.state);
  continueNeutralChoices(result.state);""",
    """  removeAbandonedProtractedSiegeOverlays(result.state);
  convertCapturedBombardmentToRuins(result.state, territoryControllersBefore);
  continueNeutralChoices(result.state);""",
)

# Remove temporary inventory artifacts from the final product diff.
for path in [
    ".github/scripts/generate-bombardment-rename-inventory.py",
    ".github/workflows/bombardment-rename-inventory.yml",
    "docs/internal/Bombardment_Rename_Inventory.md",
]:
    file = Path(path)
    if file.exists():
        file.unlink()

# The active v0.6 source and engine must contain no obsolete current identity.
for path in [
    Path("docs/Gauntlet_v0.6_Neutral_Card_Pool.md"),
    Path("releases/v0.6.0"),
    Path("src"),
]:
    files = [path] if path.is_file() else [candidate for candidate in path.rglob("*") if candidate.is_file()]
    for file in files:
        if file.suffix.lower() not in {".md", ".json", ".ts", ".tsx", ".js"}:
            continue
        text = file.read_text(errors="ignore")
        if "Siege Weaponry" in text or "neutral-siege-weaponry" in text:
            # The legacy identifier is retained only inside the explicit old-save migration set.
            if file.as_posix() == "src/state/territory-overlays.ts" and text.count("neutral-siege-weaponry") == 1 and "Siege Weaponry" not in text:
                continue
            raise RuntimeError(f"Obsolete current Bombardment identity remains in {file}")

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
