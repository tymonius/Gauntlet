#!/usr/bin/env python3
"""Update the Sleeper Network/Subversion test fixture for Action Opportunity activation."""

from pathlib import Path

path = Path(__file__).resolve().parents[1] / "src/state/intelligence-subversion-asset.test.ts"
text = path.read_text(encoding="utf-8")
old = """    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.phase = 'turn_start';
    state.players.player_2.zones.assetBank = ['intelligence-sleeper-network'];
    state.players.player_2.intelligence!.sleeperNetwork = {
      cards: ['intelligence-spies'],
      bankedTurn: state.turn - 1,
      startOfferTurn: state.turn,
    };
"""
new = """    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.phase = 'action_before_movement';
    state.players.player_2.actionsRemaining = 1;
    state.players.player_2.zones.assetBank = ['intelligence-sleeper-network'];
    state.players.player_2.intelligence!.sleeperNetwork = {
      cards: ['intelligence-spies'],
      bankedTurn: state.turn - 1,
    };
"""
count = text.count(old)
if count != 1:
    raise RuntimeError(f"Expected one stale Sleeper/Subversion fixture, found {count}")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("Updated Sleeper Network/Subversion fixture.")
