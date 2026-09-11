import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const workerV071 = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");

describe("v0.7.1 printed effect-label fidelity", () => {
  test("does not relabel a banked Asset ability as an Action", () => {
    expect(workerV071).toContain("Preserve printed effect labels and named game terminology exactly.");
    expect(workerV071).toContain("Do not relabel an Asset, Use, Battle, Gambit/Tactic, Overlay, or other printed effect as an Action unless the supplied authority labels it Action");
    expect(workerV071).toContain("distinguish an Action that banks a card from a later ability of the banked Asset");
  });

  test("advances the behavior revision for the terminology fix", () => {
    expect(workerV071).toContain('BEHAVIOR_REVISION = "v071-qa-20260911-4"');
  });
});
