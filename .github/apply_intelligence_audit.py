from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Missing expected text in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new))


# Action effects must be capable of completing legally before the card is offered.
replace(
    "src/state/intelligence-action-cards.ts",
    """  if (cardId === INTELLIGENCE_ACTION_CARDS.fogOfWar) return canPlaceFogOfWarOverlay(game);
  if (cardId === INTELLIGENCE_ACTION_CARDS.operationalReassessment) return Boolean(player.intelligence.activeMission);
  if (cardId === INTELLIGENCE_ACTION_CARDS.sleeperNetwork) return canResolveSleeperNetworkAction(game, playerId);
  return true;
""",
    """  if (cardId === INTELLIGENCE_ACTION_CARDS.fogOfWar) return canPlaceFogOfWarOverlay(game);
  if (cardId === INTELLIGENCE_ACTION_CARDS.operationalReassessment) {
    return Boolean(player.intelligence.activeMission)
      && player.zones.hand.some((candidate) => intelligenceMissionCardIds.has(candidate));
  }
  if (cardId === INTELLIGENCE_ACTION_CARDS.assassins) {
    return Boolean(game.players[opponentId(game, playerId)]?.zones.hand.length);
  }
  if (cardId === INTELLIGENCE_ACTION_CARDS.sleeperNetwork) return canResolveSleeperNetworkAction(game, playerId);
  return true;
""",
)
replace(
    "src/state/intelligence-action-cards.ts",
    """  const mission = player.intelligence!.activeMission;
  if (!mission) throw new IntelligenceActionCardError('Operational Reassessment requires an Active Mission.');

  player.intelligence!.activeMission = undefined;
""",
    """  const mission = player.intelligence!.activeMission;
  if (!mission) throw new IntelligenceActionCardError('Operational Reassessment requires an Active Mission.');
  const replacementMissionCards = player.zones.hand.filter((cardId) => intelligenceMissionCardIds.has(cardId));
  if (replacementMissionCards.length === 0) {
    throw new IntelligenceActionCardError('Operational Reassessment requires another eligible Mission card in hand.');
  }

  player.intelligence!.activeMission = undefined;
""",
)
replace(
    "src/state/intelligence-action-cards.ts",
    "const eligibleCardIds = [...new Set(player.zones.hand.filter((cardId) => cardId !== mission.cardId && intelligenceMissionCardIds.has(cardId)))];",
    "const eligibleCardIds = [...new Set(replacementMissionCards)];",
)

# Sleeper Network activation is mandatory for every Action that can legally resolve.
replace("src/types/intelligence.ts", "options: ['finish', 'select'];", "options: ['select'];")
replace("src/state/intelligence-sleeper-network.ts", "options: ['finish', 'select'],", "options: ['select'],")
replace(
    "src/state/intelligence-sleeper-network.ts",
    """  if (pending.kind === 'sleeper_network_play_card') {
    if (action.choice === 'finish') {
      finishNetwork(game, action.playerId, 'activation_finished');
      return { kind: 'none' };
    }
    if (action.choice !== 'select' || !action.cardId || !pending.eligibleCardIds.includes(action.cardId)) throw new SleeperNetworkError('Choose a legally resolvable Action card beneath Sleeper Network or finish.');
""",
    """  if (pending.kind === 'sleeper_network_play_card') {
    if (action.choice !== 'select' || !action.cardId || !pending.eligibleCardIds.includes(action.cardId)) throw new SleeperNetworkError('Choose a legally resolvable Action card beneath Sleeper Network.');
""",
)
replace(
    "src/dev/intelligence-battle-options.ts",
    """  if (pending.kind === 'sleeper_network_play_card') {
    return [
      action('Finish Sleeper Network activation', 'finish'),
      ...pending.eligibleCardIds.map((cardId) => action(`Play ${cardId} from Sleeper Network`, 'select', cardId)),
    ];
  }
""",
    """  if (pending.kind === 'sleeper_network_play_card') {
    return pending.eligibleCardIds.map((cardId) => action(`Play ${cardId} from Sleeper Network`, 'select', cardId));
  }
""",
)
replace(
    "src/state/intelligence-sleeper-network.test.ts",
    """  it('allows the player to stop an activation early and discard all remaining cards', () => {
    let state = bankNetwork(game());
    state.players.player_1.intelligence!.sleeperNetwork!.cards.push('intelligence-spies');
    state.turn = 3;
    state.phase = 'turn_start';
    runPostActionAutomationPipeline(state);
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'activate' }).state;

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'finish',
    }).state;

    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([
      'card-attrition',
      'intelligence-spies',
    ]));
    expect(state.players.player_1.intelligence?.sleeperNetwork).toBeUndefined();
  });
""",
    """  it('requires every legally resolvable Action to be played before activation ends', () => {
    let state = bankNetwork(game());
    state.players.player_1.intelligence!.sleeperNetwork!.cards.push('intelligence-spies');
    state.turn = 3;
    state.phase = 'turn_start';
    runPostActionAutomationPipeline(state);
    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'activate' }).state;

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'sleeper_network_play_card',
      options: ['select'],
      eligibleCardIds: expect.arrayContaining(['card-attrition', 'intelligence-spies']),
    });
    expect(() => applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'finish',
    })).toThrow(/legally resolvable Action card/i);
    expect(state.players.player_1.intelligence?.sleeperNetwork).toBeDefined();
  });
""",
)

# Fog remains a Territory Overlay throughout the battle and leaves only after a fought battle ends.
replace(
    "src/state/intelligence-fog-overlay.ts",
    "  BattleParticipantState,\n  GameEvent,",
    "  BattleParticipantState,\n  BattleState,\n  GameEvent,",
)
replace(
    "src/state/intelligence-fog-overlay.ts",
    """  space.overlays = (space.overlays ?? []).filter((overlay) => overlay.cardId !== FOG_OF_WAR_OVERLAY);
  for (const overlay of overlays) game.players[overlay.owner].zones.discard.push(overlay.cardId);

  const owners = [...new Set(overlays.map((overlay) => overlay.owner))];
""",
    """  const owners = [...new Set(overlays.map((overlay) => overlay.owner))];
""",
)
fog = Path("src/state/intelligence-fog-overlay.ts")
text = fog.read_text()
marker = "export function requireFogOfWarOverlayOrder(game: GameState, action: AppStateAction): void {"
addition = """function fogBattleWasFought(battle: BattleState): boolean {
  if (battle.stage !== 'hand_commit') return true;
  return Boolean(
    battle.attacker.handCommit
    || battle.attacker.passedHandCommit
    || battle.defender.handCommit
    || battle.defender.passedHandCommit,
  );
}

export function consumeFogOfWarOverlayAfterBattle(game: GameState, battle: BattleState): boolean {
  const owner = battle.fogOfWarOverlayOwner;
  if (!owner || !fogBattleWasFought(battle)) return false;
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  const index = space?.overlays?.findIndex((overlay) => (
    overlay.cardId === FOG_OF_WAR_OVERLAY && overlay.owner === owner
  )) ?? -1;
  if (!space?.overlays || index < 0) return false;
  space.overlays.splice(index, 1);
  game.players[owner].zones.discard.push(FOG_OF_WAR_OVERLAY);
  publicLog(game, owner, 'intelligence_fog_of_war_overlay_removed', 'Fog of War was removed after the battle fought on its Territory.', {
    spaceId: space.id,
    battleId: battle.id,
  });
  return true;
}

"""
if marker not in text:
    raise SystemExit("Missing Fog order marker")
fog.write_text(text.replace(marker, addition + marker))

replace(
    "src/state/apply-fog-overlay.ts",
    """  activateFogOfWarOverlayForBattle,
  prioritizeFogOfWarOverlayChoice,
""",
    """  activateFogOfWarOverlayForBattle,
  consumeFogOfWarOverlayAfterBattle,
  prioritizeFogOfWarOverlayChoice,
""",
)
replace(
    "src/state/apply-fog-overlay.ts",
    """  requireFogOfWarOverlayOrder(game, action);
  const previousBattleId = game.battle?.id;
  const result = applySleeperNetworkGameAction(game, action);

  if (result.state.battle && result.state.battle.id !== previousBattleId) {
    activateFogOfWarOverlayForBattle(result.state);
  }
""",
    """  requireFogOfWarOverlayOrder(game, action);
  const previousBattle = game.battle ? structuredClone(game.battle) : undefined;
  const previousBattleId = previousBattle?.id;
  const result = applySleeperNetworkGameAction(game, action);

  if (previousBattle?.fogOfWarOverlayOwner
    && (!result.state.battle || result.state.battle.id !== previousBattle.id)) {
    consumeFogOfWarOverlayAfterBattle(result.state, previousBattle);
  }
  if (result.state.battle && result.state.battle.id !== previousBattleId) {
    activateFogOfWarOverlayForBattle(result.state);
  }
""",
)
replace(
    "src/state/intelligence-fog-overlay.test.ts",
    "import { FOG_OF_WAR_OVERLAY } from './intelligence-fog-overlay';",
    "import { consumeFogOfWarOverlayAfterBattle, FOG_OF_WAR_OVERLAY } from './intelligence-fog-overlay';",
)
replace(
    "src/state/intelligence-fog-overlay.test.ts",
    """    expect(territoryAt(state, 3).overlays ?? []).not.toContainEqual(expect.objectContaining({ cardId: FOG_OF_WAR_OVERLAY }));
    expect(state.players.player_1.zones.discard).toContain(FOG_OF_WAR_OVERLAY);
""",
    """    expect(territoryAt(state, 3).overlays).toContainEqual(expect.objectContaining({ cardId: FOG_OF_WAR_OVERLAY }));
    expect(state.players.player_1.zones.discard).not.toContain(FOG_OF_WAR_OVERLAY);
""",
)
fog_test = Path("src/state/intelligence-fog-overlay.test.ts")
text = fog_test.read_text()
ending = "\n});\n"
extra = """

  it('moves the Overlay to Discard only after the fought battle ends', () => {
    let state = startBattle(placeFog(game()));
    state.battle!.stage = 'resolution';
    state.battle!.attacker.diceRoll = 6;
    state.battle!.defender.diceRoll = 1;
    state.battle!.effectsResolved.push('before_battle_resolution');

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(territoryAt(state, 3).overlays ?? []).not.toContainEqual(expect.objectContaining({ cardId: FOG_OF_WAR_OVERLAY }));
    expect(state.players.player_1.zones.discard).toContain(FOG_OF_WAR_OVERLAY);
  });

  it('does not consume the Overlay when a battle ends before either player commits', () => {
    const state = startBattle(placeFog(game()));
    const battle = structuredClone(state.battle!);
    state.battle = undefined;

    expect(consumeFogOfWarOverlayAfterBattle(state, battle)).toBe(false);
    expect(territoryAt(state, 3).overlays).toContainEqual(expect.objectContaining({ cardId: FOG_OF_WAR_OVERLAY }));
    expect(state.players.player_1.zones.discard).not.toContain(FOG_OF_WAR_OVERLAY);
  });
"""
if not text.endswith(ending):
    raise SystemExit("Unexpected Fog test ending")
fog_test.write_text(text[:-len(ending)] + extra + ending)

Path("src/state/intelligence-action-legality.test.ts").write_text("""import { describe, expect, it } from 'vitest';
import { canResolveIntelligenceAction } from './intelligence-action-cards';
import { initializeGame } from './initialize';

function game() {
  return initializeGame({
    id: 'intelligence-action-legality',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Intelligence', factionId: 'intelligence', leaderName: 'Ranger', deck: ['a1'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', factionId: 'military', leaderName: 'General', deck: ['d1'], territories: ['t4', 't5', 't6'] },
    ],
  });
}

describe('Intelligence Action legality', () => {
  it('requires an opposing hand card for Assassins', () => {
    const state = game();
    expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-assassins')).toBe(false);
    state.players.player_2.zones.hand.push('target-card');
    expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-assassins')).toBe(true);
  });

  it('requires another eligible Mission card for Operational Reassessment', () => {
    const state = game();
    state.players.player_1.intelligence!.activeMission = {
      cardId: 'intelligence-spies',
      kind: 'normal',
      startedTurn: 1,
      requirementSatisfied: false,
      evidence: [],
    };
    expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-operational-reassessment')).toBe(false);
    state.players.player_1.zones.hand.push('intelligence-fog-of-war');
    expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-operational-reassessment')).toBe(true);
  });
});
""")

# Restore ordinary CI and remove this temporary script from the resulting commit.
Path(".github/workflows/test.yml").write_text("""name: Test

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
""")
Path(".github/apply_intelligence_audit.py").unlink()
