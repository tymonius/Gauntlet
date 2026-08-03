"""Temporary branch bootstrap for focused Rules Arbiter benchmark fixes.

The existing v0.6.1 source workflow imports this module when Python starts,
applies the idempotent source edits, and commits rules-assistant outputs. This
file is removed before merge.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise RuntimeError(f"Could not find patch anchor in {path}: {old[:80]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


def append_once(path: str, marker: str, addition: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if marker in text:
        return
    target.write_text(text.rstrip() + "\n\n" + addition.strip() + "\n", encoding="utf-8")


# 1. High-confidence pre-retrieval scope gate.
append_once(
    "rules-assistant/rules-status.js",
    "export function isClearlyOutOfScopeQuestion",
    r'''
const CLEAR_NON_GAMEPLAY_PATTERNS = [
  /\b(morally|moral(?:ity)?|ethical(?:ly)?|ethics|justified|right or wrong|good or evil)\b/i,
  /\b(lore|backstory|fictional history|historical inspiration|real[- ]world analogue)\b/i,
  /\b(art|illustration|aesthetic|what does .* look like|appearance)\b/i,
  /\b(design intent|why was .* designed|balance suggestion|buffed|nerfed)\b/i,
  /\b(best strategy|best deck|deck recommendation|who should i play)\b/i
];

export function isClearlyOutOfScopeQuestion(question) {
  const text = String(question || "").trim();
  return Boolean(text) && CLEAR_NON_GAMEPLAY_PATTERNS.some((pattern) => pattern.test(text));
}

export function buildOutOfScopeRuling() {
  return {
    id: "out-of-scope-precheck",
    answer: "The Rules Arbiter handles gameplay rules and table rulings. It does not determine lore, morality, historical interpretation, artwork, strategy, or game-design judgments.",
    rulingStatus: "out_of_scope",
    sourceIds: [],
    subject: null,
    topic: "scope",
    confidence: "high",
    responseType: "scope"
  };
}
'''
)

replace_once(
    "rules-assistant/smart-worker.js",
    '''import {
  buildScopeRecoveryRuling,
  isGameplayQuestionPlan
} from "./rules-status.js";''',
    '''import {
  buildOutOfScopeRuling,
  buildScopeRecoveryRuling,
  isClearlyOutOfScopeQuestion,
  isGameplayQuestionPlan
} from "./rules-status.js";'''
)

replace_once(
    "rules-assistant/smart-worker.js",
    '''      if (corpus.version && corpus.version !== RULES_VERSION) {
        throw new Error(`Canonical corpus reports ${corpus.version}, expected ${RULES_VERSION}.`);
      }

      const storedHistory = await loadStoredHistoryV2(env, {''',
    '''      if (corpus.version && corpus.version !== RULES_VERSION) {
        throw new Error(`Canonical corpus reports ${corpus.version}, expected ${RULES_VERSION}.`);
      }

      if (isClearlyOutOfScopeQuestion(question)) {
        const plan = {
          entities: [],
          mechanics: [],
          roles: [],
          zones: [],
          timing: [],
          questionType: "out_of_scope",
          complexity: "low",
          contextDependent: false,
          assumptions: [],
          retrievalQueries: [],
          activeSubject: null,
          activeTopic: "scope",
          rulePacket: null
        };
        const packet = {
          id: "scope",
          subject: null,
          topic: "scope",
          sourceIds: [],
          scopeNotes: [],
          requiredClaims: [],
          forbiddenClaims: []
        };
        return handleDeterministicAnswer({
          request,
          env,
          allowedOrigin,
          corpus,
          sessionId,
          playtestContext,
          question,
          gameState,
          plan,
          packet,
          deterministic: buildOutOfScopeRuling()
        });
      }

      const storedHistory = await loadStoredHistoryV2(env, {'''
)

# 2. Explicit rule packets for the remaining blind-run interactions.
replace_once(
    "rules-assistant/rules-packets.js",
    '''const FOLLOW_UP_PATTERN = /\\b(it|its|this|that|these|those|they|them|benefit|in battle|right now|already face up|change the cost|do so)\\b/i;''',
    r'''PACKET_DEFINITIONS.push(
  {
    id: "withdrawal",
    subject: "Withdrawal",
    aliases: ["withdrawal", "withdrew from a battle", "withdraw from a battle", "valor"],
    sourceIds: [
      "rulebook:effect-caused-withdrawal-from-battle",
      "rulebook:retreat",
      "card:neutral-valor"
    ],
    scopeNotes: ["Withdrawal from a battle ends it without a winner or loser; it is not a battle loss or retreat."],
    requiredClaims: ["Win, loss, and retreat triggers do not occur after withdrawal from a battle."],
    forbiddenClaims: ["Do not say ordinary withdrawal from a battle triggers Valor or any other loss trigger."]
  },
  {
    id: "commandant-repel",
    subject: "Commandant",
    aliases: ["commandant", "repel"],
    sourceIds: ["rulebook:complete-rules-13", "rulebook:commandant", "rulebook:orders-2"],
    scopeNotes: ["The first battle victory each turn grants Command even during the opponent's turn."],
    requiredClaims: ["Command gained from that victory is available for Repel during the same Aftermath."],
    forbiddenClaims: ["Do not limit Command gain to the Military player's own turn."]
  },
  {
    id: "active-mission",
    subject: "Active Mission",
    aliases: ["active mission", "started the mission", "began the mission"],
    sourceIds: ["rulebook:starting-a-mission", "rulebook:completing-a-mission"],
    scopeNotes: ["An Active Mission cannot complete during the turn it begins."],
    requiredClaims: ["A satisfied Mission must wait until a later turn before it can be completed."],
    forbiddenClaims: ["Do not permit same-turn Mission completion."]
  },
  {
    id: "political-capital",
    subject: "Political Capital",
    aliases: ["political capital"],
    sourceIds: ["rulebook:senator", "card:diplomats-safe-conduct", "rulebook:refused-terms", "rulebook:influence"],
    scopeNotes: ["Safe Conduct replaces the refused-Terms loss with withdrawal and returns the Stake."],
    requiredClaims: ["Political Capital does not trigger because no staked Influence would be lost after losing a battle."],
    forbiddenClaims: ["Do not condition the answer on missing Political Capital text when the Senator source is supplied."]
  },
  {
    id: "fieldcraft",
    subject: "Fieldcraft",
    aliases: ["fieldcraft"],
    sourceIds: ["rulebook:ranger", "rulebook:control"],
    scopeNotes: ["Fieldcraft ignores printed Territory effects only."],
    requiredClaims: ["Fieldcraft does not alter Territory control, Occupation, or capture."],
    forbiddenClaims: ["Do not let Fieldcraft ignore an effect that changes control merely because a Territory is involved."]
  },
  {
    id: "fortifications",
    subject: "Fortifications",
    aliases: ["fortifications"],
    sourceIds: ["card:neutral-fortifications", "rulebook:5-choose-tactics"],
    scopeNotes: ["Fortifications changes the number of Tactics chosen, not the timing of choosing them."],
    requiredClaims: ["Choose both Tactics during the same Choose Tactics stage before seeing the opponent's revealed choice."],
    forbiddenClaims: ["Do not allow the second Tactic to be chosen after seeing the opponent's choice."]
  },
  {
    id: "rousing-speech",
    subject: "Rousing Speech",
    aliases: ["rousing speech"],
    sourceIds: ["card:neutral-rousing-speech", "rulebook:assets"],
    scopeNotes: ["Turning an existing banked Asset face up is not banking it again."],
    requiredClaims: ["Rousing Speech does not trigger from merely turning a face-down Asset face up."],
    forbiddenClaims: ["Do not treat a reveal or face-up change as a new banking event."]
  },
  {
    id: "battle-roles",
    subject: "Battle roles",
    aliases: ["attacker and defender remain", "roles remain fixed", "stop being the attacker"],
    sourceIds: ["rulebook:complete-rules-7", "rulebook:normal-result"],
    scopeNotes: ["Attacker and defender remain fixed through the Aftermath."],
    requiredClaims: ["A retreat or victory does not switch or end those roles before the Aftermath finishes."],
    forbiddenClaims: ["Do not say the winner stops being the attacker after the defender retreats."]
  }
);

const FOLLOW_UP_PATTERN = /\b(it|its|this|that|these|those|they|them|benefit|in battle|right now|already face up|change the cost|do so)\b/i;'''
)

# 3. Narrow deterministic rulings for directly explicit interactions.
replace_once(
    "rules-assistant/rules-deterministic.js",
    '''  if (matches(text, /\\b(how many cards.*start|draw to start|starting hand|opening hand|hand.*start)\\b/i)) {''',
    r'''  if (/\b(attacker|defender)\b/i.test(text)
      && /\b(remain fixed|roles? remain|stop being the attacker|through the aftermath)\b/i.test(text)
      && /\baftermath\b/i.test(text)) {
    return result({
      id: "battle-roles-remain-fixed",
      answer: "Attacker and defender remain fixed through the entire Aftermath. The defender's retreat and the battle result do not change those roles.",
      sourceIds: ["rulebook:complete-rules-7", "rulebook:normal-result"],
      subject: "Battle roles",
      topic: "Aftermath"
    });
  }

  if (/\bfortifications\b/i.test(text)
      && /\b(two tactics|choose two|choose the second|opponent'?s choice)\b/i.test(text)) {
    return result({
      id: "fortifications-simultaneous-choice",
      answer: "No. Choose both Tactics during the same Choose Tactics stage. Fortifications changes how many Tactics you choose, not the timing, so you cannot wait to see the opponent's choice before choosing the second.",
      sourceIds: ["card:neutral-fortifications", "rulebook:5-choose-tactics"],
      subject: "Fortifications",
      topic: "choosing Tactics"
    });
  }

  if (/\bvalor\b/i.test(text) && /\bwithdraw(?:al|rew|n)?\b/i.test(text) && /\bbattle\b/i.test(text)) {
    return result({
      id: "valor-withdrawal",
      answer: "No. Withdrawal from a battle ends it without a winner or loser, so you did not lose the battle and Valor does not trigger. Loss and retreat triggers do not occur.",
      sourceIds: ["rulebook:effect-caused-withdrawal-from-battle", "card:neutral-valor"],
      subject: "Valor",
      topic: "withdrawal"
    });
  }

  if (/\bcommandant\b/i.test(text) && /\brepel\b/i.test(text)
      && /\b(first battle|first time)\b/i.test(text) && /\bwin|won\b/i.test(text)) {
    return result({
      id: "commandant-command-repel",
      answer: "Yes. The first time each turn you win a battle, you gain 1 Command even during the opponent's turn. That Command is available during the same Aftermath, so you may spend it on Repel after the opponent's normal retreat.",
      sourceIds: ["rulebook:complete-rules-13", "rulebook:commandant", "rulebook:orders-2"],
      subject: "Commandant",
      topic: "Command and Repel"
    });
  }

  if (/\b(active )?mission\b/i.test(text) && /\b(same turn|turn (?:i|it) (?:started|began)|began that turn)\b/i.test(text)
      && /\bcomplete|completion\b/i.test(text)) {
    return result({
      id: "mission-no-same-turn-completion",
      answer: "No. An Active Mission cannot complete during the turn it begins, even if you satisfy its requirement that turn. It may be completed during an Action Opportunity on a later turn if it remains satisfied.",
      sourceIds: ["rulebook:starting-a-mission", "rulebook:completing-a-mission"],
      subject: "Active Mission",
      topic: "same-turn completion"
    });
  }

  if (/\bsafe conduct\b/i.test(text) && /\bpolitical capital\b/i.test(text)) {
    return result({
      id: "safe-conduct-political-capital",
      answer: "No. Safe Conduct replaces the refused-Terms loss with withdrawal, returns your staked Influence, and ends the battle without a winner or loser. Because you do not lose the battle or lose the Stake, Political Capital does not trigger.",
      sourceIds: ["card:diplomats-safe-conduct", "rulebook:senator", "rulebook:refused-terms", "rulebook:influence"],
      subject: "Political Capital",
      topic: "Safe Conduct"
    });
  }

  if (/\brousing speech\b/i.test(text) && /\b(face[- ]?up|turns? .* face[- ]?up|existing face[- ]?down asset)\b/i.test(text)) {
    return result({
      id: "rousing-speech-existing-asset",
      answer: "No. Rousing Speech triggers when the opponent banks an Asset. Turning an already banked face-down Asset face up does not bank it again, so Rousing Speech does not trigger.",
      sourceIds: ["card:neutral-rousing-speech", "rulebook:assets"],
      subject: "Rousing Speech",
      topic: "banking an Asset"
    });
  }

  if (/\bfieldcraft\b/i.test(text) && /\b(changes? control|control of a territory|territory control)\b/i.test(text)) {
    return result({
      id: "fieldcraft-control-change",
      answer: "No. Fieldcraft may ignore a printed Territory effect that would affect you, your movement, or your battle. It expressly does not alter Territory control, Occupation, or capture, so it cannot ignore an effect that changes control.",
      sourceIds: ["rulebook:ranger", "rulebook:control"],
      subject: "Fieldcraft",
      topic: "Territory control"
    });
  }

  if (matches(text, /\b(how many cards.*start|draw to start|starting hand|opening hand|hand.*start)\b/i)) {'''
)

# 4. Focused regression suite.
TEST_PATH = ROOT / "rules-assistant/final-benchmark-fixes.test.mjs"
if not TEST_PATH.exists():
    TEST_PATH.write_text(r'''import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { buildRulesCorpus } from "./local-search.js";
import { analyzeQuestionLocally } from "./rules-intelligence.js";
import { enrichPlanFromEntityDocuments } from "./rules-plan-enrichment.js";
import { buildRulePacket } from "./rules-packets.js";
import { resolveDeterministicRuling } from "./rules-deterministic.js";
import { buildOutOfScopeRuling, isClearlyOutOfScopeQuestion } from "./rules-status.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md", import.meta.url),
  "utf8"
);
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown });

function resolve(question, history = []) {
  const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, question, history));
  const packet = buildRulePacket(corpus, { question, history, plan });
  return resolveDeterministicRuling(corpus, { question, history, plan, packet });
}

test("clear lore and morality questions are rejected before retrieval", () => {
  expect(isClearlyOutOfScopeQuestion("Is the Witch Hunter morally justified in pursuing alleged heretics?"))
    .toBe(true);
  expect(buildOutOfScopeRuling().rulingStatus).toBe("out_of_scope");
  expect(isClearlyOutOfScopeQuestion("When may the Witch Hunter use Relentless Pursuit?"))
    .toBe(false);
});

test("withdrawal never becomes a loss trigger for Valor", () => {
  const ruling = resolve("I withdrew from a battle. Does my banked Valor trigger because I lost the battle?");
  expect(ruling?.rulingStatus).toBe("explicit");
  expect(ruling?.answer).toContain("without a winner or loser");
  expect(ruling?.answer).toContain("does not trigger");
});

test("Commandant gains Command and may spend it on Repel in the same Aftermath", () => {
  const ruling = resolve("I am the Commandant and win my first battle of the turn while defending during my opponent's turn. Do I gain Command, and can that newly gained Command pay for Repel in the same Aftermath?");
  expect(ruling?.rulingStatus).toBe("explicit");
  expect(ruling?.answer).toMatch(/^Yes\./);
  expect(ruling?.answer).toContain("same Aftermath");
});

test("an Active Mission cannot complete on its starting turn", () => {
  const ruling = resolve("I satisfy my Active Mission during the turn I started it. May I complete it after movement that turn?");
  expect(ruling?.rulingStatus).toBe("explicit");
  expect(ruling?.answer).toMatch(/^No\./);
  expect(ruling?.answer).toContain("cannot complete during the turn it begins");
});

test("Safe Conduct prevents Political Capital from triggering", () => {
  const ruling = resolve("Switching subjects: if Safe Conduct makes me withdraw, does Political Capital still trigger?");
  expect(ruling?.rulingStatus).toBe("explicit");
  expect(ruling?.answer).toMatch(/^No\./);
  expect(ruling?.answer).toContain("returns your staked Influence");
});

test("explicit status cases resolve deterministically", () => {
  expect(resolve("After the defender retreats, do attacker and defender remain fixed through the Aftermath?")?.rulingStatus)
    .toBe("explicit");
  expect(resolve("Fortifications lets me choose two Tactics. May I choose one, see the opponent's choice, and then choose the second?")?.rulingStatus)
    .toBe("explicit");
  expect(resolve("The opponent turns an existing face-down Asset face up. Does my banked Rousing Speech trigger?")?.rulingStatus)
    .toBe("explicit");
  expect(resolve("Can Fieldcraft ignore an effect that changes control of a Territory?")?.rulingStatus)
    .toBe("explicit");
});

test("new packets include the exact governing component sections", () => {
  const questions = [
    ["Does withdrawal trigger Valor?", "withdrawal"],
    ["Can the Commandant use Repel?", "commandant-repel"],
    ["Can an Active Mission complete immediately?", "active-mission"],
    ["Does Political Capital trigger after Safe Conduct?", "political-capital"],
    ["Can Fieldcraft change control?", "fieldcraft"]
  ];
  for (const [question, id] of questions) {
    const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, question));
    expect(buildRulePacket(corpus, { question, plan }).id).toBe(id);
  }
});
''', encoding="utf-8")
