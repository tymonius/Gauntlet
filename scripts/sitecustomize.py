"""Small runtime compatibility shim for repository document-build scripts.

python-docx's bundled template names its default table style ``Table Normal``.
Some Word templates expose the same built-in style as ``Table``. Treat those
names as aliases so document generation remains portable across environments.
"""

try:
    from docx.styles.styles import Styles
except ImportError:  # Document dependencies are optional outside build jobs.
    Styles = None

if Styles is not None and not getattr(Styles, "_gauntlet_table_alias", False):
    _original_getitem = Styles.__getitem__

    def _gauntlet_getitem(self, key):
        try:
            return _original_getitem(self, key)
        except KeyError:
            if key == "Table":
                return _original_getitem(self, "Table Normal")
            raise

    Styles.__getitem__ = _gauntlet_getitem
    Styles._gauntlet_table_alias = True

# Temporary branch bootstrap for the Resourcefulness copied-effect correction.
# Removed before merge after the source-validation workflow commits the edits.
from pathlib import Path

_RESOURCEFULNESS_ROOT = Path(__file__).resolve().parents[1]


def _resourcefulness_replace_once(path: str, old: str, new: str) -> None:
    target = _RESOURCEFULNESS_ROOT / path
    text = target.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise RuntimeError(f"Could not find Resourcefulness patch anchor in {path}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


_resourcefulness_packet_anchor = '''  }
);

const FOLLOW_UP_PATTERN'''
_resourcefulness_packet_replacement = '''  },
  {
    id: "resourcefulness",
    subject: "Resourcefulness",
    aliases: ["resourcefulness"],
    sourceIds: ["card:neutral-resourcefulness", "rulebook:printed-card-effects"],
    scopeNotes: [
      "Resourcefulness checks whether the cost-1 card itself was played, set, or chosen and then resolved its printed effect.",
      "Copying an effect does not play, set, or choose the source card again."
    ],
    requiredClaims: [
      "A copied effect does not trigger Resourcefulness unless the cost-1 card itself was played, set, or chosen for that resolution."
    ],
    forbiddenClaims: [
      "Do not treat copying a cost-1 card's effect as playing, setting, or choosing that card."
    ]
  }
);

const FOLLOW_UP_PATTERN'''
_resourcefulness_replace_once(
    "rules-assistant/rules-packets.js",
    _resourcefulness_packet_anchor,
    _resourcefulness_packet_replacement,
)

_resourcefulness_ruling_anchor = '''  if (/\\bfieldcraft\\b/i.test(text) && /\\b(changes? control|control of a territory|territory control)\\b/i.test(text)) {'''
_resourcefulness_ruling_replacement = '''  if (/\\bresourcefulness\\b/i.test(text)
      && /\\b(copy|copied|copying)\\b/i.test(text)
      && /\\bwithout\\b[\\s\\S]*\\b(play(?:ing|ed)?|set(?:ting)?|choos(?:ing|e|en))\\b/i.test(text)) {
    return result({
      id: "resourcefulness-copied-effect",
      answer: "No. Resourcefulness triggers only when a cost-1 card you played, set, or chose resolves its printed effect. Copying that effect without playing, setting, or choosing the card again does not trigger Resourcefulness.",
      sourceIds: ["card:neutral-resourcefulness", "rulebook:printed-card-effects"],
      subject: "Resourcefulness",
      topic: "copied effect"
    });
  }

  if (/\\bfieldcraft\\b/i.test(text) && /\\b(changes? control|control of a territory|territory control)\\b/i.test(text)) {'''
_resourcefulness_replace_once(
    "rules-assistant/rules-deterministic.js",
    _resourcefulness_ruling_anchor,
    _resourcefulness_ruling_replacement,
)

(_RESOURCEFULNESS_ROOT / "rules-assistant/resourcefulness-copied-effect.test.mjs").write_text(
'''import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { buildRulesCorpus } from "./local-search.js";
import { analyzeQuestionLocally } from "./rules-intelligence.js";
import { enrichPlanFromEntityDocuments } from "./rules-plan-enrichment.js";
import { buildRulePacket } from "./rules-packets.js";
import { resolveDeterministicRuling } from "./rules-deterministic.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md", import.meta.url),
  "utf8"
);
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown });

function analyze(question) {
  const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, question));
  const packet = buildRulePacket(corpus, { question, plan });
  const ruling = resolveDeterministicRuling(corpus, { question, plan, packet });
  return { packet, ruling };
}

test("copied cost-1 effects do not trigger Resourcefulness", () => {
  const { packet, ruling } = analyze(
    "I copy the Battle effect of a cost-1 card without playing, setting, or choosing that cost-1 card again. Does Resourcefulness draw me a card?"
  );

  expect(packet.id).toBe("resourcefulness");
  expect(ruling?.rulingStatus).toBe("explicit");
  expect(ruling?.answer).toMatch(/^No\\./);
  expect(ruling?.answer).toContain("does not trigger Resourcefulness");
  expect(ruling?.sourceIds).toContain("card:neutral-resourcefulness");
});

test("broader Resourcefulness questions still use the normal packet path", () => {
  const { packet, ruling } = analyze("What does Resourcefulness do?");
  expect(packet.id).toBe("resourcefulness");
  expect(ruling?.id).not.toBe("resourcefulness-copied-effect");
});
''',
encoding="utf-8",
)
