import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const workflow = readFileSync(
  new URL("../.github/workflows/v072-candidate-rules-arbiter-regression-replay.yml", import.meta.url),
  "utf8"
);

describe("v0.7.2 candidate polarity probe contract", () => {
  test("uses the already-authorized candidate workflow and a dedicated trigger marker", () => {
    expect(workflow).toContain(".github/qa-triggers/v072-candidate-polarity-probe-20260922.txt");
    expect(workflow).toContain("candidate-polarity-probe:");
    expect(workflow).toContain("needs.classify-run.outputs.mode == 'polarity-probe'");
  });

  test("derives authority identity from current repository bytes before paid calls", () => {
    expect(workflow).toContain('readFileSync("packages/game-data/current-game.json")');
    expect(workflow).toContain('readFileSync("packages/rules/comprehensive/comprehensive-rules.md")');
    expect(workflow).toContain('.update(Buffer.from([0]))');
    expect(workflow).toContain("Live candidate matches the current repository authority.");
  });

  test("repeats the exact terse question five times and requires ruling-first No", () => {
    expect(workflow).toContain('const question = "tie while defender has defensive edge. tiebreak roll?";');
    expect(workflow).toContain("index < 5");
    expect(workflow).toContain('firstPolarity !== "no"');
  });

  test("keeps the original full regression job separate from the probe", () => {
    expect(workflow).toContain("needs.classify-run.outputs.mode == 'regression'");
    expect(workflow).toContain("Collect candidate regression answers");
    expect(workflow).toContain("Replay ambiguity confirmations");
  });
});
