import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const OLD_REVISION = "v071-qa-20260914-11";
const NEW_REVISION = "v071-qa-20260914-12";

function read(path) {
  return readFileSync(path, "utf8");
}

function write(path, content) {
  writeFileSync(path, content, "utf8");
}

function replaceOnce(text, oldText, newText, label) {
  const first = text.indexOf(oldText);
  if (first < 0) throw new Error(`Missing expected snippet for ${label}.`);
  if (text.indexOf(oldText, first + oldText.length) >= 0) {
    throw new Error(`Expected exactly one snippet for ${label}.`);
  }
  return text.slice(0, first) + newText + text.slice(first + oldText.length);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const workerPath = "rules-assistant/worker-v071.js";
let worker = read(workerPath);
worker = replaceOnce(
  worker,
  `export const BEHAVIOR_REVISION = "${OLD_REVISION}";`,
  `export const BEHAVIOR_REVISION = "${NEW_REVISION}";`,
  "behavior revision"
);
worker = replaceOnce(
  worker,
  "const rulingStatus = normalizeRulingStatus(modelResult.ruling_status, sources.length);",
  "const rulingStatus = normalizeModelRulingStatus(modelResult.ruling_status, question, sources);",
  "model ruling normalization call"
);
worker = replaceOnce(
  worker,
  `function normalizeRulingStatus(value, sourceCount) {\n  const normalized = ["explicit", "inferred", "provisional", "out_of_scope"].includes(value)\n    ? value\n    : "provisional";\n  if (["explicit", "inferred"].includes(normalized) && sourceCount < 1) return "provisional";\n  return normalized;\n}`,
  `function normalizeOverviewToken(value) {\n  const token = String(value || "").toLowerCase();\n  const withdrawalForms = new Set(["withdrawal", "withdrawing", "withdraws", "withdrew", "withdrawn"]);\n  if (withdrawalForms.has(token)) return "withdraw";\n  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);\n  if (token.length > 5 && token.endsWith("ed")) return token.slice(0, -2);\n  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);\n  return token;\n}\n\nfunction overviewSubjectTokens(question) {\n  const current = String(question || "").trim().replace(/[?!.]+$/, "");\n  const match = current.match(/^how\\s+(?:do|does)\\s+(.+?)\\s+work$/i)\n    || current.match(/^what\\s+happens\\s+when\\s+(.+)$/i);\n  if (!match) return [];\n\n  const subject = match[1];\n  if (/\\b(?:can|could|would|if|unless|except|versus|vs\\.?|interact|interaction|conflict|override|same as|different from|like)\\b/i.test(subject)) {\n    return [];\n  }\n\n  const stopWords = new Set([\n    "a", "an", "and", "the", "i", "you", "we", "they", "player", "players",\n    "my", "your", "our", "their", "from", "in", "on", "at", "during", "of",\n    "for", "to", "into", "with", "game", "battle"\n  ]);\n\n  return [...new Set((subject.toLowerCase().match(/[a-z0-9]+/g) || [])\n    .map(normalizeOverviewToken)\n    .filter((token) => token.length >= 3 && !stopWords.has(token)))];\n}\n\nfunction sourceTopicTokens(source) {\n  const title = String(source?.title || "").toLowerCase();\n  return new Set((title.match(/[a-z0-9]+/g) || []).map(normalizeOverviewToken));\n}\n\nexport function shouldPromoteDirectOverviewToExplicit(question, sources = []) {\n  const subjectTokens = overviewSubjectTokens(question);\n  if (!subjectTokens.length) return false;\n  return (Array.isArray(sources) ? sources : []).some((source) => {\n    const tokens = sourceTopicTokens(source);\n    return subjectTokens.every((token) => tokens.has(token));\n  });\n}\n\nexport function normalizeModelRulingStatus(value, question, sources = []) {\n  const normalized = ["explicit", "inferred", "provisional", "out_of_scope"].includes(value)\n    ? value\n    : "provisional";\n  const sourceCount = Array.isArray(sources) ? sources.length : 0;\n  if (["explicit", "inferred"].includes(normalized) && sourceCount < 1) return "provisional";\n  if (normalized === "inferred" && shouldPromoteDirectOverviewToExplicit(question, sources)) {\n    return "explicit";\n  }\n  return normalized;\n}`,
  "direct-overview classification normalizer"
);
write(workerPath, worker);

let pinUpdates = 0;
for (const path of walk("rules-assistant")) {
  if (!path.endsWith(".test.mjs")) continue;
  let text = read(path);
  if (!text.includes(OLD_REVISION)) continue;
  const matches = text.split(OLD_REVISION).length - 1;
  text = text.split(OLD_REVISION).join(NEW_REVISION);
  write(path, text);
  pinUpdates += matches;
}
if (pinUpdates < 10) throw new Error(`Expected at least 10 r11 test pins, updated ${pinUpdates}.`);

const correctionPath = "rules-assistant/evals/rules-arbiter-evals.v071-corrections.json";
const corrections = JSON.parse(read(correctionPath));
const correctionById = new Map(corrections.cases.map((item) => [item.id, item]));
correctionById.set("diplomats-terms", {
  id: "diplomats-terms",
  expectedClassification: "explicit",
  classificationBasis: "direct-authority",
  expectedSourcePatterns: ["offer one eligible Proposal as Terms"]
});
correctionById.set("diplomats-peace-treaty", {
  id: "diplomats-peace-treaty",
  expectedClassification: "explicit",
  classificationBasis: "direct-authority",
  expectedSourcePatterns: ["if 6 different Proposals are ratified, you win"]
});
corrections.cases = [...correctionById.values()];
write(correctionPath, JSON.stringify(corrections, null, 2) + "\n");

const regressionPath = "rules-assistant/v071-r12-direct-overview-classification.test.mjs";
write(regressionPath, `import { describe, expect, test } from "vitest";\nimport {\n  BEHAVIOR_REVISION,\n  normalizeModelRulingStatus,\n  shouldPromoteDirectOverviewToExplicit\n} from "./worker-v071.js";\n\nfunction source(title) {\n  return { id: "S1", title, excerpt: "direct authority" };\n}\n\ndescribe("v0.7.1 r12 direct-overview classification", () => {\n  test("pins r12 behavior", () => {\n    expect(BEHAVIOR_REVISION).toBe("${NEW_REVISION}");\n  });\n\n  test("Withdrawal overview is explicit when a selected source directly covers Withdrawal", () => {\n    const sources = [source("7. Battles › Withdrawal and Retreat › Complete rules › Withdrawal")];\n    expect(shouldPromoteDirectOverviewToExplicit("What happens when I withdraw from a battle?", sources)).toBe(true);\n    expect(normalizeModelRulingStatus("inferred", "What happens when I withdraw from a battle?", sources)).toBe("explicit");\n  });\n\n  test("Command and Orders overview is explicit when a selected source directly covers the topic", () => {\n    const sources = [source("13. Military › Command and Orders › Complete rules")];\n    expect(normalizeModelRulingStatus("inferred", "How do Command and Orders work?", sources)).toBe("explicit");\n  });\n\n  test("Deed contiguity remains inferred", () => {\n    const sources = [source("12. Financiers › Deeds"), source("5. Movement › Front Line")];\n    expect(normalizeModelRulingStatus("inferred", "Do purchased deeds have to be contiguous like your Front Line?", sources)).toBe("inferred");\n  });\n\n  test("multi-authority trigger questions remain inferred", () => {\n    const sources = [source("Withdrawal"), source("Witch Hunter — Relentless Pursuit")];\n    expect(normalizeModelRulingStatus("inferred", "What happens when I withdraw with Relentless Pursuit?", sources)).toBe("inferred");\n  });\n\n  test("no-source written classifications fail closed to provisional", () => {\n    expect(normalizeModelRulingStatus("explicit", "How do Command and Orders work?", [])).toBe("provisional");\n    expect(normalizeModelRulingStatus("inferred", "How do Command and Orders work?", [])).toBe("provisional");\n  });\n});\n`);

const auditPath = "rules-assistant/evals/gate3-blind-b-audit-2026-09-14.md";
let audit = read(auditPath);
audit = replaceOnce(
  audit,
  "The three intended B clarification cases were not executed in this run and therefore remain unseen by the production Arbiter. They may still be run once against unchanged r10 after the workflow is corrected to select the B clarification benchmark without rerunning the exposed standard/player-language cases.",
  "The three intended B clarification cases were not executed in this initial run. They were subsequently executed once against unchanged r10 by the corrected clarification-only workflow; that recovery evidence is recorded below. The exposed standard/player-language cases were not rerun.",
  "B clarification status paragraph"
);
const recoverySection = `\n## Clarification recovery evidence\n\nThe corrected clarification-only workflow was executed once against unchanged r10 after the benchmark-selection defect was repaired.\n\n- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/34808362781\n- Behavior revision: \`v071-qa-20260913-10\`\n- Authority set: \`5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339\`\n- Scope: \`clarifications-only\`\n- Standard/player-language cases: skipped\n- Clarification benchmark explicitly selected: \`rules-arbiter-gate3-blind-b-clarifications.v071.json\`\n- Result: **3/3 passed**\n  - \`blind-b-clarify-two-neutral-cards\`\n  - \`blind-b-clarify-two-general-orders\`\n  - \`blind-b-clarify-two-banked-assets\`\n- Artifact: \`10333528595\`\n- Artifact ZIP SHA-256: \`66a276065e6fdc5954dd1d17f5359eee6c76d61711b6abbb0687e7fedf05d6b6\`\n\nThis completes tranche B clarification evidence. Tranche B remains immutable and must not be rerun as blind certification evidence for r11 or later behavior.\n`;
const followupHeading = "\n## r11 follow-up scope after clarification evidence is captured\n";
if (!audit.includes(followupHeading)) throw new Error("Could not locate r11 follow-up heading in B audit.");
audit = audit.replace(followupHeading, recoverySection + followupHeading);
write(auditPath, audit);

const replayAuditPath = "rules-assistant/evals/r11-live-replay-audit-2026-09-14.md";
write(replayAuditPath, `# Rules Arbiter r11 maintained live replay audit — 2026-09-14\n\n## Run identity\n\n- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/34813632336\n- Behavior revision: \`v071-qa-20260914-11\`\n- Published rules version: \`v0.7.1\`\n- Authority set: \`5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339\`\n- Head SHA: \`24e1de521b9b81692ec76c59e80ccb55a50f5a4f\`\n- Raw score: **98/102**\n- Artifact: \`10335972218\`\n- Artifact ZIP SHA-256: \`02871f48bb9d80c12d8bef24cf31cf68e976a1ead145f3009e4db5b0b3a8920d\`\n\nAll publication, live-revision, and corpus preflight checks passed. One case retried after a transient HTTP 503 and then passed.\n\n## Audit conclusion\n\nThe four raw failures split into **2 genuine classification-only behavior defects** and **2 evaluator false negatives**. No case in this 102-case replay produced a materially wrong rules ruling.\n\n### Genuine classification-only defects\n\n1. \`core-withdrawal\` — the answer accurately restated the directly selected Withdrawal authority but returned \`inferred\` instead of \`explicit\`.\n2. \`military-command-orders\` — the answer accurately summarized directly stated Command/Orders authorities but returned \`inferred\` instead of \`explicit\`.\n\nThese remain real behavior defects because classification is player-visible. They indicate that prompt guidance alone does not make broad direct-rule summaries classification-stable. r12 therefore adds a conservative direct-overview postclassification rule: an \`inferred\` model classification is promoted only when the question is a simple overview form and one selected source title directly covers every significant topic token. Interaction/conflict/comparison questions remain ineligible.\n\n### Evaluator false negatives\n\n3. \`diplomats-terms\` — explicit answer and direct Terms source were correct; the benchmark required the section-title phrase \`Offering Terms\` even though another direct Terms source carried the governing text.\n4. \`diplomats-peace-treaty\` — explicit answer and canonical Peace Treaty source were correct; the benchmark required the Rulebook title \`Treaty Articles and Peace Treaty\` rather than the direct canonical faction source.\n\nThe maintained benchmark corrections now verify governing rule text rather than those brittle title strings. Frozen blind datasets are unchanged.\n\n## Next gate\n\nAfter r12 deploys, replay the affected maintained cases first, then require the full maintained live replay to pass before freezing/running fresh blind tranche C.\n`);

console.log(`Applied r12 classification patch; updated ${pinUpdates} behavior-revision test pin(s).`);
