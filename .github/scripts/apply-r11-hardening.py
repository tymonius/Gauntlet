from pathlib import Path
import textwrap

OLD = "v071-qa-20260913-10"
NEW = "v071-qa-20260914-11"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


worker_path = Path("rules-assistant/worker-v071.js")
worker = worker_path.read_text(encoding="utf-8")
worker = replace_once(
    worker,
    f'export const BEHAVIOR_REVISION = "{OLD}";',
    f'export const BEHAVIOR_REVISION = "{NEW}";',
    "behavior revision",
)

guide_anchor = '- Resolve references such as "that card", "it", "them", and "those cards" according to the instruction sequence. Bind each reference to the most recent compatible game object already introduced, unless grammar or explicit text establishes another referent; account for card movements and other state changes already resolved.\n'
guide_insert = guide_anchor + (
    '- Treat concrete game-state facts stated by the player as premises unless the player is asking whether that premise is legally possible. Apply retrieved authority to the consequences of those facts; do not silently replace a stated win with a withdrawal, loss, or other alternative event merely because that event appears in retrieved authority.\n'
    '- Resolve possessives such as "their Territory" or "their land" from their grammatical antecedent and the immediate conversation. Do not silently switch the referent to the current player merely because a retrieved rule is written from that player’s perspective.\n'
    '- When the player explicitly names a card, Leader ability, Faction feature, or other supplied authority, treat that named authority as the governing subject for generic phrases such as "that effect" or "that card effect" unless the question clearly introduces a different subject.\n'
)
worker = replace_once(worker, guide_anchor, guide_insert, "adjudication guide")

classification_anchor = '- Substituting values supplied by the question into a directly stated numerical formula, threshold, or progression remains explicit when no independent rule premise is required. Arithmetic evaluation of a direct rule is not by itself a deductive bridge.\n'
classification_insert = classification_anchor + (
    '- Do not downgrade a directly stated result to inferred merely because other retrieved sources are present. If one clean authority directly answers every material part of the question, classify the ruling explicit unless the answer actually depends on combining that authority with another independent premise.\n'
    '- Directly enumerated consequences of one rule or effect remain explicit, including its stated timing, conditional branches, exceptions, destinations, and numerical results. Surrounding baseline or context sources do not by themselves turn that direct answer into an inference.\n'
)
worker = replace_once(worker, classification_anchor, classification_insert, "classification boundary")

normalize_anchor = '''function normalizeReferentSubject(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']s\\b/g, "")
    .replace(/^(?:card|leader|faction|rulebook):\\s*/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

'''
helper_block = normalize_anchor + '''function canonicalAuthoritySubject(source) {
  const canonicalId = String(source?.canonicalId || "");
  const match = canonicalId.match(/^(?:card|leader|faction):(.+)$/i);
  if (!match) return "";
  return normalizeReferentSubject(
    match[1]
      .replace(/^(?:military|diplomats|financiers|mystics|inquisition|intelligence|neutral)-/i, "")
      .replace(/-/g, " ")
  );
}

function authorityNameAliases(source) {
  const aliases = [];
  for (const value of [source?.heading, source?.title]) {
    const raw = String(value || "").replace(/^(?:Card|Leader|Faction):\\s*/i, "").trim();
    if (!raw) continue;
    aliases.push(raw);
    const dashSubject = raw.split(/\\s+[—–]\\s+/).at(-1);
    if (dashSubject && dashSubject !== raw) aliases.push(dashSubject);
    const colonSubject = raw.split(/:\\s+/).at(-1);
    if (colonSubject && colonSubject !== raw) aliases.push(colonSubject);
  }
  return [...new Set(aliases.map(normalizeReferentSubject).filter(Boolean))];
}

function currentNamedAuthoritySubjects(question, retrieval = []) {
  const current = ` ${normalizeReferentSubject(question)} `;
  if (!current.trim()) return [];

  const generic = new Set([
    "battle", "battle sequence", "complete rules", "rules", "timing", "action",
    "movement", "territory", "advantage", "after phase", "aftermath"
  ]);
  const subjects = new Set();

  for (const source of retrieval.slice(0, 10)) {
    const canonicalId = String(source?.canonicalId || "");
    if (!/^(?:card|leader|faction):/i.test(canonicalId)) continue;

    const canonicalSubject = canonicalAuthoritySubject(source);
    if (
      canonicalSubject.length >= 4
      && !generic.has(canonicalSubject)
      && current.includes(` ${canonicalSubject} `)
    ) {
      subjects.add(canonicalSubject);
      continue;
    }

    const matchingAliases = authorityNameAliases(source)
      .filter((alias) => alias.length >= 4 && !generic.has(alias) && current.includes(` ${alias} `))
      .sort((a, b) => a.length - b.length);
    if (matchingAliases.length) subjects.add(matchingAliases[0]);
  }

  return [...subjects];
}

'''
worker = replace_once(worker, normalize_anchor, helper_block, "named-authority helper")

reminder_anchor = '''  const canonicalIds = new Set(sourceList.map((source) => String(source?.canonicalId || "")));
  const reminders = [];

'''
reminder_insert = reminder_anchor + '''  const namedAuthoritySubjects = currentNamedAuthoritySubjects(question, sourceList);
  if (namedAuthoritySubjects.length === 1) {
    reminders.push(
      "The question explicitly names a supplied governing authority. Resolve the requested property from that named authority before considering generic alternatives. If that authority directly states every material part needed for the answer, classify the ruling explicit even when other context sources are present. Do not invent additional procedure, timing windows, replacements, destinations, or game objects that the named authority does not state."
    );
  }

'''
worker = replace_once(worker, reminder_anchor, reminder_insert, "named-authority reminder")

clarification_anchor = '''  const match = genericRuleMatch || genericCardMatch || describedCardMatch;
  if (!match) return null;

'''
clarification_insert = clarification_anchor + '''  const namedAuthoritySubjects = currentNamedAuthoritySubjects(current, retrieval);
  if (namedAuthoritySubjects.length === 1) return null;

'''
worker = replace_once(worker, clarification_anchor, clarification_insert, "ambiguity guard")
worker_path.write_text(worker, encoding="utf-8")

current_revision_tests = [
    "rules-assistant/v071-gate3-a-regressions.test.mjs",
    "rules-assistant/v071-ambiguous-referent-clarification.test.mjs",
    "rules-assistant/v071-asset-replacement-review.test.mjs",
    "rules-assistant/v071-gate2-r8-conflict-discipline.test.mjs",
    "rules-assistant/v071-gate2-r6-regressions.test.mjs",
    "rules-assistant/v071-fortifications-tactic-choice-review.test.mjs",
    "rules-assistant/v071-gate2-live-regressions.test.mjs",
    "rules-assistant/v071-copied-effect-retrieval-review.test.mjs",
    "rules-assistant/v071-strategic-withdrawal-review.test.mjs",
    "rules-assistant/v071-gate2-r7-combined-authority.test.mjs",
    "rules-assistant/v071-short-counterfactual-continuity.test.mjs",
    "rules-assistant/v071-battle-card-replacement-retrieval.test.mjs",
]
for filename in current_revision_tests:
    path = Path(filename)
    text = path.read_text(encoding="utf-8")
    path.write_text(replace_once(text, OLD, NEW, filename), encoding="utf-8")

regression = Path("rules-assistant/v071-gate3-b-regressions.test.mjs")
if regression.exists():
    raise RuntimeError(f"refusing to overwrite existing {regression}")
regression.write_text(textwrap.dedent(r'''
    import { readFileSync } from "node:fs";
    import { describe, expect, test } from "vitest";
    import {
      BEHAVIOR_REVISION,
      buildAmbiguousReferentClarification,
      buildQuestionSpecificAdjudicationReminder
    } from "./worker-v071.js";

    const workerSource = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");

    function source(canonicalId, title, excerpt = "") {
      return { id: "S1", canonicalId, title, heading: title, excerpt, body: excerpt, sourcePath: "test" };
    }

    describe("v0.7.1 Gate 3 blind B promoted regressions", () => {
      test("pins r11 behavior", () => {
        expect(BEHAVIOR_REVISION).toBe("v071-qa-20260914-11");
      });

      test("duplicate sources for one named ability suppress generic-card clarification", () => {
        const retrieval = [
          source("leader:fieldcraft", "Leader: Ranger — Fieldcraft", "Fieldcraft applies to printed Territory effects."),
          { ...source("faction:fieldcraft", "Faction: Fieldcraft", "Fieldcraft applies to printed Territory effects."), id: "S2" }
        ];
        expect(buildAmbiguousReferentClarification(
          "Fieldcraft is the governing ability here. Does that card effect fall within Fieldcraft?",
          [],
          retrieval
        )).toBeNull();
      });

      test("duplicate sources for one named ability produce one governing-authority reminder", () => {
        const retrieval = [
          source("leader:fieldcraft", "Leader: Ranger — Fieldcraft", "Fieldcraft applies to printed Territory effects."),
          { ...source("faction:fieldcraft", "Faction: Fieldcraft", "Fieldcraft applies to printed Territory effects."), id: "S2" }
        ];
        const reminder = buildQuestionSpecificAdjudicationReminder(
          "Fieldcraft is the governing ability here. Does that card effect fall within Fieldcraft?",
          retrieval
        );
        expect(reminder).toContain("explicitly names a supplied governing authority");
      });

      test("one explicitly named governing card suppresses generic-effect clarification", () => {
        const retrieval = [source("card:intelligence-subversion", "Card: Subversion", "Subversion negates an opposing Asset effect.")];
        expect(buildAmbiguousReferentClarification(
          "Subversion is the card I am using. What happens to that effect?",
          [],
          retrieval
        )).toBeNull();
      });

      test("two explicitly named candidate cards remain ambiguous", () => {
        const retrieval = [
          source("card:neutral-forced-march", "Card: Forced March"),
          { ...source("card:military-give-chase", "Card: Give Chase"), id: "S2" }
        ];
        const history = [
          { role: "user", content: "Forced March and Give Chase are both involved." },
          { role: "assistant", content: "They have different movement instructions." }
        ];
        const result = buildAmbiguousReferentClarification(
          "Forced March and Give Chase are both in play. Can that card start another battle?",
          history,
          retrieval
        );
        expect(result?.responseType).toBe("clarification");
        expect(result?.executionPath).toBe("deterministic-clarification");
      });

      test("a single named component gets the direct-authority anti-invention reminder", () => {
        const reminder = buildQuestionSpecificAdjudicationReminder(
          "Spies revealed the opposing Tactics. What may I do now?",
          [source("card:intelligence-spies", "Card: Spies", "Reveal opposing face-down Tactics. You may then revise your own Tactics or withdraw.")]
        );
        expect(reminder).toContain("explicitly names a supplied governing authority");
        expect(reminder).toContain("classify the ruling explicit");
        expect(reminder).toContain("Do not invent additional procedure");
      });

      test("r11 preserves direct classification and player-stated game state", () => {
        expect(workerSource).toContain("Do not downgrade a directly stated result to inferred merely because other retrieved sources are present");
        expect(workerSource).toContain("Directly enumerated consequences of one rule or effect remain explicit");
        expect(workerSource).toContain("Treat concrete game-state facts stated by the player as premises");
        expect(workerSource).toContain("do not silently replace a stated win with a withdrawal, loss, or other alternative event");
        expect(workerSource).toContain('Resolve possessives such as "their Territory" or "their land" from their grammatical antecedent');
      });
    });
''').lstrip(), encoding="utf-8")

frozen = Path("rules-assistant/v071-gate3-blind-b.test.mjs").read_text(encoding="utf-8")
if 'const EXPECTED_BEHAVIOR = "v071-qa-20260913-10";' not in frozen:
    raise RuntimeError("frozen tranche B behavior pin changed unexpectedly")

remaining_tests = sorted(
    path.as_posix()
    for path in Path("rules-assistant").glob("*.test.mjs")
    if OLD in path.read_text(encoding="utf-8")
)
if remaining_tests != ["rules-assistant/v071-gate3-blind-b.test.mjs"]:
    raise RuntimeError(f"unexpected remaining r10 test pins: {remaining_tests}")
