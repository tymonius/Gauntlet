from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


rulebook = Path("releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md")
text = rulebook.read_text(encoding="utf-8")
text = replace_once(
    text,
    "Next, each player sets their Hand aside and draws three temporary cards to form a **Reserve**. Reveal Gambits, then each player may choose one Reserve card as a **Tactic**. Reveal Tactics, resolve the card effects, and roll dice. The higher battle total wins.",
    "Next, each player sets their Hand aside and draws three temporary cards to form a **Reserve**. Reveal Gambits, then each player may choose one Reserve card as a **Tactic**. Reveal Tactics, resolve the card effects, and roll dice. The higher battle total wins. If the totals are tied while the defender controls the contested Territory, Defender's Advantage means the defender wins the tie. Defender's Advantage is a tie rule, not the ordinary advantage mechanic that changes how dice are rolled.",
    "battle overview",
)
text = replace_once(
    text,
    "**Defender's Advantage:** If battle totals are tied and the defender controls the contested Territory, the defender wins. The defender also has Defender's Advantage during a Last Stand battle.",
    "**Defender's Advantage:** This is a tie rule, not an instance of the ordinary advantage mechanic. If battle totals are tied and the defender controls the contested Territory, the defender wins. Defender's Advantage does not grant an additional die. It also applies during a Last Stand battle, so the defender wins tied Last Stand battle totals even though no Territory is contested there.",
    "complete battle rule",
)
text = replace_once(
    text,
    "The defender is harder to defeat in a Last Stand: they receive Defender's Advantage and +1 to their battle total.",
    "The defender is harder to defeat in a Last Stand: Defender's Advantage means they win tied battle totals, and they separately add +1 to their battle total.",
    "Last Stand overview",
)
text = replace_once(
    text,
    "- the defender has Defender's Advantage; and\n- the defender adds +1 to their battle total.",
    "- Defender's Advantage applies, so the defender wins tied battle totals; and\n- the defender separately adds +1 to their battle total.",
    "Last Stand complete rules",
)
rulebook.write_text(text, encoding="utf-8")

reference = Path("releases/v0.6.1/Gauntlet_v0.6.1_Reference_Guide.md")
ref_text = reference.read_text(encoding="utf-8")
ref_text = replace_once(
    ref_text,
    "5. During the Last Stand, the defender has Defender's Advantage and adds +1 to their battle total.",
    "5. During the Last Stand, Defender's Advantage means the defender wins ties; separately, the defender adds +1 to their battle total.",
    "Reference Guide Last Stand rule",
)
reference.write_text(ref_text, encoding="utf-8")

Path("rules-assistant/v061-defenders-advantage.test.mjs").write_text(
    '''import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const rulebook = readFileSync(new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md", import.meta.url), "utf8");
const reference = readFileSync(new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Reference_Guide.md", import.meta.url), "utf8");

test("defines Defender's Advantage as a tie rule rather than ordinary advantage", () => {
  expect(rulebook).toContain("This is a tie rule, not an instance of the ordinary advantage mechanic.");
  expect(rulebook).toContain("Defender's Advantage does not grant an additional die.");
  expect(rulebook).toContain("If battle totals are tied and the defender controls the contested Territory, the defender wins.");
});

test("keeps the Last Stand tie rule and +1 separate", () => {
  expect(rulebook).toContain("Defender's Advantage means they win tied battle totals, and they separately add +1 to their battle total.");
  expect(rulebook).toContain("Defender's Advantage applies, so the defender wins tied battle totals;");
  expect(rulebook).toContain("the defender separately adds +1 to their battle total.");
  expect(reference).toContain("Defender's Advantage means the defender wins ties; separately, the defender adds +1 to their battle total.");
});
''',
    encoding="utf-8",
)
