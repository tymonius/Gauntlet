import fs from "node:fs";

const triagePath = "rules-assistant/refinement-triage.js";
let triage = fs.readFileSync(triagePath, "utf8");
const startMarker = "  function isEllipticalQuestion(question) {";
const endMarker = "  function candidateSourceCount(diagnostic) {";
const start = triage.indexOf(startMarker);
const end = triage.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error("elliptical-question function boundaries not found");

const newBlock = String.raw`  function isEllipticalQuestion(question) {
    const value = text(question).toLowerCase();
    const words = value.match(/[a-z0-9']+/g) || [];
    if (!words.length || words.length > 10) return false;

    const referentCue = /\b(?:it|its|they|them|their|that|those|this|these|which|same|both|former|latter|there|then|one|ones|again|another|next|else)\b/.test(value);
    const continuationCue = /^(?:and|but|so|then|also|okay|ok|no|yes|wait|what about|how about)\b/.test(value);
    const bareQuestionCue = words.length <= 2 && /^(?:where|which|why|when|how|what|who)\b/.test(value);
    return referentCue || continuationCue || bareQuestionCue;
  }

`;
triage = triage.slice(0, start) + newBlock + triage.slice(end);

const continuity = '    if (score.elliptical && context.previous && (score.fragileFollowup || ["incorrect", "unclear"].includes(feedback))) return "conversation_continuity";';
const retrieval = '    if (recommendedAction === "retrieval_fix") return "retrieval";';
if (!triage.includes(retrieval)) {
  if (!triage.includes(continuity)) throw new Error("continuity root-cause line not found");
  triage = triage.replace(continuity, `${retrieval}\n${continuity}`);
}
fs.writeFileSync(triagePath, triage);

const testPath = "rules-assistant/refinement-triage.test.mjs";
let tests = fs.readFileSync(testPath, "utf8").trimEnd();
const marker = "self-contained wh-questions do not masquerade as conversation-continuity debt";
if (!tests.includes(marker)) {
  tests += String.raw`

test("self-contained wh-questions do not masquerade as conversation-continuity debt", () => {
  const first = row({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", sequence_index: 1, feedback_rating: "incorrect" });
  const second = row({
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    sequence_index: 2,
    created_at: "2026-09-04T20:01:00.000Z",
    question: "When is an occupied Territory captured?",
    review_status: "needs_correction",
    issueTypes: ["incorrect_answer", "retrieval_failure"]
  });
  const report = engine.triageInteractions([first, second], {
    audits: [{
      interaction_id: second.id,
      historical_accuracy: "incorrect",
      retrieval_assessment: "failure",
      classification_assessment: "should_be_explicit",
      recommended_action: "retrieval_fix"
    }]
  }, { scope: "reviewed_backlog" });
  const item = report.interactions.find((candidate) => candidate.interactionId === second.id);
  expect(item.rootCause).toBe("retrieval");
  expect(item.signalCodes).not.toContain("elliptical_followup");
  expect(item.signalCodes).not.toContain("fragile_followup");
});

test("audit retrieval fixes outrank downstream classification symptoms", () => {
  const interaction = row({
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    review_status: "needs_correction",
    issueTypes: ["incorrect_answer", "retrieval_failure"]
  });
  const report = engine.triageInteractions([interaction], {
    audits: [{
      interaction_id: interaction.id,
      retrieval_assessment: "failure",
      classification_assessment: "should_be_explicit",
      recommended_action: "retrieval_fix"
    }]
  }, { scope: "reviewed_backlog" });
  expect(report.interactions[0].rootCause).toBe("retrieval");
});

test("self-contained who questions can surface classification debt without continuity noise", () => {
  const first = row({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", sequence_index: 1 });
  const second = row({
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    sequence_index: 2,
    created_at: "2026-09-04T20:01:00.000Z",
    question: "Who is the General designed after?",
    review_status: "needs_correction",
    ruling_status: "provisional",
    confidence: "medium",
    source_count: 1
  });
  const report = engine.triageInteractions([first, second], {
    audits: [{
      interaction_id: second.id,
      retrieval_assessment: "sufficient",
      classification_assessment: "should_be_out_of_scope",
      recommended_action: "prompt_fix"
    }]
  }, { scope: "reviewed_backlog" });
  const item = report.interactions.find((candidate) => candidate.interactionId === second.id);
  expect(item.rootCause).toBe("classification");
  expect(item.signalCodes).not.toContain("elliptical_followup");
});
`;
}
fs.writeFileSync(testPath, `${tests}\n`);
