// Exact-port guard: candidate adjudication behavior must remain mechanically derived from r33.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const v071 = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");
const candidate = readFileSync(new URL("./worker-v072-candidate.js", import.meta.url), "utf8");

function portR33Worker(source) {
  let result = source;
  const exactReplacements = [
    [
`import {
  V071_RULES_VERSION,
  V071_VERSION_LABEL,
  defaultV071SourceUrls,
  loadV071RulesCorpus
} from "./v071-public-corpus.js";`,
`import {
  V072_CANDIDATE_RULES_VERSION,
  V072_CANDIDATE_VERSION_LABEL,
  defaultV072CandidateSourceUrls,
  loadV072CandidateRulesCorpus
} from "./v072-candidate-corpus.js";`
    ],
    ["export const RULES_VERSION = V071_RULES_VERSION;", "export const RULES_VERSION = V072_CANDIDATE_RULES_VERSION;"],
    ['export const BEHAVIOR_REVISION = "v071-qa-20260921-33";', 'export const BEHAVIOR_REVISION = "v072-qa-20260921-01";'],
    ["// The governing v0.7.1 text is the nested Complete rules document.", "// The governing v0.7.2 candidate text is the reviewed Complete Rules document."],
    ["const SYSTEM_PROMPT = `You are the Gauntlet Rules Arbiter for the current canonical v0.7.1 playtest edition.", "const SYSTEM_PROMPT = `You are the Gauntlet Rules Arbiter for the canonical v0.7.2 candidate playtest edition."],
    ["Use only the supplied published v0.7.1 release passages, recent conversation, prior session rulings, and adjudication principles supplied with the question. Do not use outside knowledge, later development material, withdrawn Gauntlet releases, historical candidate text, or unstated design facts.", "Use only the supplied v0.7.2 candidate current-game and reviewed Complete Rules passages, recent conversation, prior session rulings, and adjudication principles supplied with the question. Do not use outside knowledge, historical Gauntlet releases, superseded candidate text, or unstated design facts."],
    ['console.error("v0.7.1 Rules Arbiter corpus health failure", error);', 'console.error("v0.7.2 candidate Rules Arbiter corpus health failure", error);'],
    ['console.error(`v0.7.1 Rules Arbiter failure during ${failureStage}`, error);', 'console.error(`v0.7.2 candidate Rules Arbiter failure during ${failureStage}`, error);'],
    ['const urls = defaultV071SourceUrls(env.SITE_ORIGIN || "https://gauntlet.run");', 'const urls = defaultV072CandidateSourceUrls(env.SITE_ORIGIN || "https://gauntlet.run");'],
    ["corpusPromise = loadV071RulesCorpus({", "corpusPromise = loadV072CandidateRulesCorpus({"],
    ['name: "gauntlet_v071_rules_answer",', 'name: "gauntlet_v072_candidate_rules_answer",'],
    ['const salt = env.SAFETY_ID_SALT || "gauntlet-v071-rules-arbiter";', 'const salt = env.SAFETY_ID_SALT || "gauntlet-v072-candidate-rules-arbiter";'],
  ];

  for (const [from, to] of exactReplacements) {
    expect(result, from).toContain(from);
    result = result.replace(from, to);
  }

  return result
    .replaceAll("V071_VERSION_LABEL", "V072_CANDIDATE_VERSION_LABEL")
    .replaceAll('"/v071/corpus-health"', '"/v072-candidate/corpus-health"')
    .replaceAll('"/api/v071/corpus-health"', '"/api/v072-candidate/corpus-health"')
    .replaceAll('"/v071/health"', '"/v072-candidate/health"')
    .replaceAll('"/api/v071/health"', '"/api/v072-candidate/health"')
    .replaceAll('"/v071/rules"', '"/v072-candidate/rules"')
    .replaceAll('"/api/v071/rules"', '"/api/v072-candidate/rules"');
}

describe("v0.7.2 candidate r33 Worker port", () => {
  test("is an exact mechanical port of the proven v0.7.1 r33 Worker", () => {
    expect(candidate).toBe(portR33Worker(v071));
  });

  test("preserves the r33 natural 'that the one' deterministic clarification guard", () => {
    expect(candidate).toContain('const genericOneMatch = current.match(/\\b(?:this|that)\\s+(?:the\\s+)?(one)\\b/i);');
    expect(candidate).toContain("hasRecentExplicitComparisonR32(history)");
    expect(candidate).toContain('executionPath: "deterministic-clarification"');
  });

  test("binds only version identity, corpus, candidate routes, prompt scope, telemetry name, and safety salt", () => {
    expect(candidate).toContain('export const BEHAVIOR_REVISION = "v072-qa-20260921-01";');
    expect(candidate).toContain('from "./v072-candidate-corpus.js";');
    expect(candidate).toContain('"/api/v072-candidate/rules"');
    expect(candidate).toContain('"/api/v072-candidate/health"');
    expect(candidate).toContain('"/api/v072-candidate/corpus-health"');
    expect(candidate).toContain("v0.7.2 candidate current-game and reviewed Complete Rules passages");
    expect(candidate).not.toContain('from "./v071-public-corpus.js";');
  });
});
