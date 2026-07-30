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
    """  INVASION,
  prepareInvasionBattleReveal,
  prepareInvasionMove,
  reconcileInvasionMove,
  requireInvasionActionTiming,
  resolveInvasionChoice,""",
    """  INVASION,
  prepareInvasionMove,
  reconcileInvasionMove,
  requireInvasionActionTiming,""",
)

replace_once(
    "src/state/apply-neutral.ts",
    """              : pendingKind === 'invasion_battle'
                ? resolveInvasionChoice(next, action)
              : pendingKind === 'requisition_battle'""",
    """              : pendingKind === 'requisition_battle'""",
)

replace_once(
    "src/state/apply-neutral.ts",
    "    if (prepareInvasionBattleReveal(prepared, action)) return { state: prepared };\n",
    "",
)

replace_once(
    "src/state/reducer.ts",
    """  if (!participant.hasDrawnBattleCards && participant.handCommit?.cardId === 'neutral-conscription') {
    participant.battleDrawCount += 1;
    participant.battleDrawPlayLimit += 1;
  }
""",
    """  if (!participant.hasDrawnBattleCards && participant.handCommit?.cardId === 'neutral-conscription') {
    participant.battleDrawCount += 1;
    participant.battleDrawPlayLimit += 1;
  }
  if (!participant.hasDrawnBattleCards
    && participant.handCommit?.cardId === 'neutral-invasion'
    && game.battle?.attacker.playerId === participant.playerId) {
    participant.battleDrawCount += 1;
    participant.battleDrawPlayLimit += 1;
  }
""",
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
