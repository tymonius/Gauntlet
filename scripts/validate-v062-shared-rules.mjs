import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const paths = {
  rules: path.join(repoRoot, "docs", "Gauntlet_v0.6.2_Shared_Rules_Candidate.md"),
  reference: path.join(repoRoot, "docs", "Gauntlet_v0.6.2_Shared_Reference_Candidate.md"),
  matrix: path.join(repoRoot, "docs", "Gauntlet_v0.6.2_Shared_Rules_Test_Matrix.md"),
  ledger: path.join(repoRoot, "docs", "Gauntlet_v0.6.2_Implementation_Ledger.md"),
  readme: path.join(repoRoot, "docs", "README.md"),
};

const entries = await Promise.all(
  Object.entries(paths).map(async ([key, filePath]) => [key, await readFile(filePath, "utf8")]),
);
const source = Object.fromEntries(entries);

const failures = [];

function requireText(name, text, required) {
  for (const phrase of required) {
    if (!text.includes(phrase)) {
      failures.push(`${name} is missing required text: ${JSON.stringify(phrase)}`);
    }
  }
}

function forbidPatterns(name, text, patterns) {
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      failures.push(`${name} contains forbidden legacy terminology matching ${pattern}`);
    }
  }
}

const defensiveEdgeDefinition =
  "**Defensive Edge:** When the defender has Defensive Edge, the defender wins tied battle totals.";

const requiredRules = [
  "Capture → Draw → Opening → Movement → Denouement → Cleanup",
  "Pending battle → Terms → Onset → Gambits",
  defensiveEdgeDefinition,
  "the defender is making a Last Stand",
  "An effect may remove Defensive Edge",
  "Each player rolls one die. Do not apply advantage, disadvantage, card effects, numerical modifiers, or the previous battle totals.",
  "A losing player retreats; a player who leaves without losing withdraws.",
  "if only the defender withdrew, the attacker remains in the contested position and becomes its occupier if it is an opposing Territory they do not control",
  "If an active battle ends by withdrawal at any time after Onset",
  "complete the remaining non-result steps of the Aftermath",
  "Clear any committed battle cards using their normal destinations",
  "Normal Capture advances the Front Line by no more than one Territory per turn",
  "The Territory captured during the Capture step is not necessarily the Territory containing the active player's token.",
];

const requiredReference = [
  "Capture → Draw → Opening → Movement → Denouement → Cleanup",
  "Pending battle → Terms → Onset → Gambits",
  defensiveEdgeDefinition,
  "the defender is making a Last Stand",
  "An effect may remove Defensive Edge",
  "A losing player retreats; a player who leaves without losing withdraws.",
  "only the defender withdraws: the attacker remains in the contested position and becomes the occupier when applicable",
  "after Onset: complete the remaining non-result steps of the Aftermath and clear any committed battle cards using their normal destinations",
  "The captured Territory may be behind your token.",
];

requireText("shared rules candidate", source.rules, requiredRules);
requireText("shared reference candidate", source.reference, requiredReference);
requireText("implementation ledger", source.ledger, [
  defensiveEdgeDefinition,
  "the defender is making a Last Stand",
  "An effect may remove Defensive Edge",
  "Preserve the existing Occupation consequence when only the defender withdraws",
  "withdrawal at any time after Onset completes the remaining non-result steps of the Aftermath and clears any committed battle cards normally",
]);

const obsoleteHeading = "# 10. Obsolete Shared Language";
const obsoleteIndex = source.rules.indexOf(obsoleteHeading);
if (obsoleteIndex < 0) {
  failures.push(`shared rules candidate is missing ${JSON.stringify(obsoleteHeading)}`);
}

let normativeRules = obsoleteIndex >= 0 ? source.rules.slice(0, obsoleteIndex) : source.rules;

// These implementation instructions name retired vocabulary solely to prohibit
// or replace it. Remove those exact lines before testing player-facing text.
for (const allowedEditorialLine of [
  "- does not create another Action phase or Action window.",
  "Do not create immediate or additional Action Opportunities or Action Windows.",
  "- Replace `opening effects`, `battle opening`, and `Battle Onset` with **Onset** where they refer to this stage.",
]) {
  normativeRules = normativeRules.replace(allowedEditorialLine, "");
}

const forbiddenLegacyPatterns = [
  /\bAction Opportunit(?:y|ies)\b/i,
  /\bAction Windows?\b/i,
  /\bDefender's Advantage\b/i,
  /\bBattle Onset\b/i,
  /\bopening effects\b/i,
  /\bbattle opening\b/i,
];

forbidPatterns("normative shared rules", normativeRules, forbiddenLegacyPatterns);
forbidPatterns("shared reference candidate", source.reference, forbiddenLegacyPatterns);

if (!source.rules.includes("| withdraw as an ordinary Movement choice | Use Fall Back. |")) {
  failures.push("shared rules candidate does not contain the ordinary-withdraw migration rule");
}
if (!source.rules.includes("| Defender's Advantage | Use Defensive Edge. |")) {
  failures.push("shared rules candidate does not contain the Defensive Edge migration rule");
}
if (!source.rules.includes("| Battle Onset | Use Onset as the formal stage name. |")) {
  failures.push("shared rules candidate does not contain the Onset migration rule");
}

const scenarioMatches = [...source.matrix.matchAll(/^## ([A-G]\d{2}) — /gm)];
const scenarioIds = scenarioMatches.map((match) => match[1]);
const uniqueScenarioIds = new Set(scenarioIds);

if (scenarioIds.length !== 63) {
  failures.push(`shared rules matrix contains ${scenarioIds.length} numbered scenarios; expected 63`);
}
if (uniqueScenarioIds.size !== scenarioIds.length) {
  failures.push("shared rules matrix contains duplicate scenario IDs");
}

const expectedRanges = {
  A: 13,
  B: 6,
  C: 8,
  D: 10,
  E: 8,
  F: 10,
  G: 8,
};

for (const [prefix, count] of Object.entries(expectedRanges)) {
  for (let index = 1; index <= count; index += 1) {
    const expectedId = `${prefix}${String(index).padStart(2, "0")}`;
    if (!uniqueScenarioIds.has(expectedId)) {
      failures.push(`shared rules matrix is missing scenario ${expectedId}`);
    }
  }
}

requireText("shared rules matrix", source.matrix, [
  "# H. Cross-Surface Acceptance Gate",
  "A passing Markdown review alone does not complete the release gate.",
  "G08 — `revealed Territory` audit",
  "D02 — Last Stand Defensive Edge",
  "D03 — Defensive Edge removed",
  "before or after battle cards are committed",
  "complete the remaining non-result steps of the Aftermath",
  "If only the defender withdraws, the attacker remains in the contested position and becomes the occupier when applicable.",
]);

requireText("documentation README", source.readme, [
  "Gauntlet_v0.6.2_Shared_Rules_Candidate.md",
  "Gauntlet_v0.6.2_Shared_Reference_Candidate.md",
  "Gauntlet_v0.6.2_Shared_Rules_Test_Matrix.md",
]);

if (failures.length > 0) {
  console.error("v0.6.2 shared-rules validation failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("v0.6.2 shared-rules validation passed (63 scenarios, terminology and parity gates).")
