import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  normalizeR13RulingStatus,
  shouldPromoteDirectDeedOwnershipChange
} from "./r13-classification.js";
import {
  augmentRetrievalForContext,
  BEHAVIOR_REVISION,
  buildAmbiguousReferentClarification,
  contextualQuery
} from "./worker-v071.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url),
  "utf8"
);
const corpus = buildRulesCorpus({
  canonicalData,
  rulebookMarkdown,
  siteOrigin: "https://gauntlet.run",
  rulebookBrowserUrl: "https://gauntlet.run/rulebook/",
  canonicalDataUrl: "https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json"
});

function augmented(question, history = []) {
  const query = contextualQuery(question, history);
  const retrieval = retrieveRules(corpus, query, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, history, retrieval);
}

describe("Gate 3 tranche F r17 remediation", () => {
  test("bumps the production behavior revision", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260918-21");
  });

  test("Military first-victory-on-opponent-turn retrieval and classification are direct", () => {
    const question = "I win my first battle of the turn while defending during the opponent's turn. Does Military gain its normal Command?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:complete-rules-17");
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("late Military Tactics use the specific closed-window rule and suppress generic Intelligence reopening authority", () => {
    const question = "A Military effect adds a Tactic face up after the normal Tactic reveal. Does that let either player reopen normal Tactic choice or a Surveillance window?";
    const sources = augmented(question);
    expect(sources[0]?.title).toMatch(/Military.*Additional Tactics/i);
    expect(sources.map((source) => source.canonicalId)).not.toContain("rulebook:direct-interference");
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("refused Terms with no winner is direct authority", () => {
    const question = "My Proposal was refused, but the later battle ends without a winner. What happens to the Stake and ratification?";
    const sources = augmented(question);
    expect(sources.some((source) => /Refused Terms/i.test(source.title))).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("capture plus Deed ownership retrieves Deeds and promotes a provisional fallback", () => {
    const question = "I capture a Territory whose Deed belongs to the opposing Financier. Does control of the Territory transfer its Deed to me?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:deeds");
    expect(shouldPromoteDirectDeedOwnershipChange(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("provisional", question, sources)).toBe("explicit");
  });

  test("Relentless Pursuit's attacking-opponent condition is direct", () => {
    const question = "Witch Hunter initiated the battle and won as attacker. Does Relentless Pursuit trigger from that victory?";
    const sources = augmented(question);
    expect(sources.some((source) => /Relentless Pursuit/i.test(source.title))).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("Treason's named card is retrieved and does not trigger referent clarification", () => {
    const question = "Treason chooses an opposing Gambit effect that has not taken effect. Does Treason merely cancel it, or does the Intelligence player also apply that effect?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("card:intelligence-treason");
    expect(buildAmbiguousReferentClarification(question, [], sources)).toBeNull();
    expect(sources[0]?.body).toContain("Negate it, then apply that effect.");
  });

  test("Rally authority survives a terse role-changing follow-up", () => {
    const history = [
      { role: "user", content: "I am the General, initiate a battle, and have 1 Command. Can I use Rally before dice?" },
      { role: "assistant", content: "Yes. Rally costs 1 Command before dice while attacking in a battle you initiated." }
    ];
    const question = "What if I am the defender in the next battle instead?";
    const sources = augmented(question, history);
    expect(sources.some((source) => /\bRally\b/i.test(String(source.body || source.excerpt || "")))).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("ordinary Ritual shorthand carries completion and interruption authority", () => {
    const history = [
      { role: "user", content: "My Ritual is underway with all three cards bound. If I initiate the next battle and win, is that the Ritual win?" },
      { role: "assistant", content: "Yes. Initiating and winning that battle while all three cards remain bound completes the Ritual and wins immediately." }
    ];
    const question = "What if I initiated it, but the battle ends with a withdrawal instead of a win?";
    const sources = augmented(question, history);
    const ids = sources.map((source) => source.canonicalId);
    expect(ids).toContain("rulebook:completion");
    expect(ids).toContain("rulebook:interruption");
  });

  test("does not turn the tranche F combined-authority Spirit Walker case into explicit", () => {
    const question = "Rite of Crossing is active, but I cease to occupy its required Territory before completion. Can Spirit Walker use Guardians of the Circle to keep the Rite active?";
    const sources = augmented(question);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("inferred");
  });
});
