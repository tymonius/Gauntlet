import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const candidate = readFileSync(new URL("./worker-v072-candidate.js", import.meta.url), "utf8");
const staged = readFileSync(new URL("./worker-v072.js", import.meta.url), "utf8");

function portCandidateToFinal(source) {
  let result = source;
  const replacements = [
    [
`import {
  V072_CANDIDATE_RULES_VERSION,
  V072_CANDIDATE_VERSION_LABEL,
  defaultV072CandidateSourceUrls,
  loadV072CandidateRulesCorpus
} from "./v072-candidate-corpus.js";`,
`import {
  V072_RULES_VERSION,
  V072_VERSION_LABEL,
  defaultV072SourceUrls,
  loadV072RulesCorpus
} from "./v072-release-corpus.js";`
    ],
    ["export const RULES_VERSION = V072_CANDIDATE_RULES_VERSION;", "export const RULES_VERSION = V072_RULES_VERSION;"],
    ["V072_CANDIDATE_VERSION_LABEL", "V072_VERSION_LABEL"],
    ["defaultV072CandidateSourceUrls", "defaultV072SourceUrls"],
    ["loadV072CandidateRulesCorpus", "loadV072RulesCorpus"],
    ["v0.7.2 candidate Rules Arbiter corpus health failure", "v0.7.2 Rules Arbiter corpus health failure"],
    ["The v0.7.2 candidate Rules Arbiter corpus could not be refreshed.", "The staged v0.7.2 Rules Arbiter corpus could not be refreshed."],
    ["gauntlet_v072_candidate_rules_answer", "gauntlet_v072_rules_answer"],
    ["gauntlet-v072-candidate-rules-arbiter", "gauntlet-v072-rules-arbiter"],
    ["canonical v0.7.2 candidate playtest edition", "staged canonical v0.7.2 release edition"],
    ["v0.7.2 candidate current-game and reviewed Complete Rules passages", "frozen v0.7.2 release canonical data and reviewed Complete Rules passages"],
  ];
  for (const [from, to] of replacements) {
    expect(result, from).toContain(from);
    result = result.replaceAll(from, to);
  }
  return result
    .replaceAll('"/v072-candidate/corpus-health"', '"/v072/corpus-health"')
    .replaceAll('"/api/v072-candidate/corpus-health"', '"/api/v072/corpus-health"')
    .replaceAll('"/v072-candidate/health"', '"/v072/health"')
    .replaceAll('"/api/v072-candidate/health"', '"/api/v072/health"')
    .replaceAll('"/v072-candidate/rules"', '"/v072/rules"')
    .replaceAll('"/api/v072-candidate/rules"', '"/api/v072/rules"')
    .replaceAll("published: false", "published: true");
}

describe("final v0.7.2 Rules Arbiter Worker staging", () => {
  test("is a mechanical r02 port from the validated candidate Worker", () => {
    expect(staged).toBe(portCandidateToFinal(candidate));
  });

  test("keeps r34/r02 behavior while switching only to the frozen release corpus", () => {
    expect(staged).toContain('export const BEHAVIOR_REVISION = "v072-qa-20260922-02";');
    expect(staged).toContain('from "./v072-release-corpus.js";');
    expect(staged).toContain('"/api/v072/rules"');
    expect(staged).toContain('"/api/v072/health"');
    expect(staged).toContain('"/api/v072/corpus-health"');
    expect(staged).toContain("applyHighRiskVerification");
  });

  test("identifies the frozen final Worker as the published v0.7.2 Rules Arbiter", () => {
    expect(staged.match(/published: true/g)?.length).toBe(2);
    expect(staged).not.toContain("published: false");
    expect(staged).toContain('currentPublicRelease: "v0.7.2"');
    expect(staged).not.toContain('"/api/v072-candidate/rules"');
  });
});
