from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f"Expected one match in {path}, found {text.count(old)} for:\n{old}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "src/state/apply-neutral.ts",
    """import {
  ASSIMILATION,
  continueAssimilationBattleResolution,
  expireAssimilationConditions,
  queueAssimilationAfterBattle,
  registerAssimilationActionCondition,
} from './neutral-assimilation';""",
    """import {
  continueAssimilationBattleResolution,
  queueAssimilationAfterBattle,
  resolveAssimilationChoice,
} from './neutral-assimilation';""",
)

replace_once(
    "src/state/apply-neutral.ts",
    """  const assimilationResolved = continueAssimilationBattleResolution(game);
  if (assimilationResolved && game.pendingAssetBankDiscards && Object.keys(game.pendingAssetBankDiscards).length > 0) return;""",
    """  continueAssimilationBattleResolution(game);
  if (game.pendingNeutralChoice) return;
  if (game.pendingAssetBankDiscards && Object.keys(game.pendingAssetBankDiscards).length > 0) return;""",
)

replace_once(
    "src/state/apply-neutral.ts",
    "const pendingKind = game.pendingNeutralChoice.kind;",
    "const pendingKind = game.pendingNeutralChoice.kind as string;",
)

replace_once(
    "src/state/apply-neutral.ts",
    """    const resolved = pendingKind === 'arcane_knowledge_battle'
      ? resolveArcaneKnowledgeChoice(next, action)""",
    """    const resolved = pendingKind === 'assimilation_asset'
      ? (resolveAssimilationChoice(next, action), {})
      : pendingKind === 'arcane_knowledge_battle'
        ? resolveArcaneKnowledgeChoice(next, action)""",
)

replace_once(
    "src/state/apply-neutral.ts",
    """  if (action.type === 'play_action_card' && action.cardId === ASSIMILATION) {
    registerAssimilationActionCondition(result.state, action.playerId);
  }
""",
    "",
)

replace_once(
    "src/state/apply-neutral.ts",
    "    expireAssimilationConditions(result.state, action.playerId);\n",
    "",
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
