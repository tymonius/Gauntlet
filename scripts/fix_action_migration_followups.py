#!/usr/bin/env python3
"""Apply narrow follow-up corrections after the one-shot Action terminology migration."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str, label: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 occurrence, found {count}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
    "A **Faction Ability** is any special rule granted by a faction. A **Faction Action** is a Faction Ability that explicitly uses an Action Opportunity.",
    "A **Faction Ability** is any special rule granted by a faction. A **Faction Action** is a Faction Ability used by spending 1 Action during an Action Opportunity unless stated otherwise.",
    "general Faction Action definition",
)

replace_once(
    "src/state/intelligence-sleeper-network.test.ts",
    """  it('offers activation during an Action Opportunity on a later turn', () => {
    const state = bankNetwork(game());
    state.turn = 3;
    state.phase = 'turn_start';
    state.activePlayer = 'player_1';
    state.priorityPlayer = 'player_1';

    runPostActionAutomationPipeline(state);
    expect(state.pendingIntelligenceChoice).toBeUndefined();

    state.phase = 'action_before_movement';
    runPostActionAutomationPipeline(state);
""",
    """  it('offers activation during an Action Opportunity on a later turn', () => {
    const state = bankNetwork(game());
    state.turn = 3;
    state.phase = 'turn_start';
    state.activePlayer = 'player_1';
    state.priorityPlayer = 'player_1';

    runPostActionAutomationPipeline(state);
    expect(state.pendingIntelligenceChoice).toBeUndefined();

    state.phase = 'action_before_movement';
    state.players.player_1.actionsRemaining = 1;
    runPostActionAutomationPipeline(state);
""",
    "Sleeper activation opportunity test",
)

replace_once(
    "src/state/intelligence-sleeper-network.test.ts",
    """  it('requires every legally resolvable Action to be played before activation ends', () => {
    let state = bankNetwork(game());
    state.players.player_1.intelligence!.sleeperNetwork!.cards.push('intelligence-spies');
    state.turn = 3;
    state.phase = 'turn_start';
    runPostActionAutomationPipeline(state);
""",
    """  it('requires every legally resolvable Action to be played before activation ends', () => {
    let state = bankNetwork(game());
    state.players.player_1.intelligence!.sleeperNetwork!.cards.push('intelligence-spies');
    state.turn = 3;
    state.phase = 'action_before_movement';
    state.players.player_1.actionsRemaining = 1;
    runPostActionAutomationPipeline(state);
""",
    "Sleeper mandatory queue test",
)

replace_once(
    "src/state/neutral-reinforcements.test.ts",
    ".toThrow(/cannot create/);",
    ".toThrow(/cannot grant/);",
    "Reinforcements error expectation",
)

print("Applied Action terminology follow-up corrections.")
