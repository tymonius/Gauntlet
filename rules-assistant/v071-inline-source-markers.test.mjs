import { describe, expect, test } from "vitest";
import { stripInlineSourceMarkers } from "./worker-v071.js";
import { readFileSync } from "node:fs";

const workerV071 = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");

describe("v0.7.1 player-facing source marker hygiene", () => {
  test("removes internal source IDs from the exact reviewed answer shape", () => {
    const answer = "Yes—if an opposing effect sets or chooses the commitment face up, Intelligence may Interfere with it directly at that same response timing for 2 Intel. A card revealed through Surveillance may likewise be removed immediately for 2 additional Intel per card. Once that choice stage closes, it cannot be Interfered with later. [S14, S1, S3]";
    expect(stripInlineSourceMarkers(answer)).toBe("Yes—if an opposing effect sets or chooses the commitment face up, Intelligence may Interfere with it directly at that same response timing for 2 Intel. A card revealed through Surveillance may likewise be removed immediately for 2 additional Intel per card. Once that choice stage closes, it cannot be Interfered with later.");
  });

  test("leaves ordinary bracketed player-facing text intact", () => {
    expect(stripInlineSourceMarkers("Resolve [this choice] now." )).toBe("Resolve [this choice] now.");
  });

  test("prompt keeps source IDs in structured metadata rather than answer prose", () => {
    expect(workerV071).toContain("Put supporting source IDs only in the source_ids array");
    expect(workerV071).toContain("Never include internal source IDs such as [S1] or [S1, S2] in the player-facing answer");
    expect(workerV071).toContain("const cleanModelAnswer = stripInlineSourceMarkers(modelResult.answer)");
  });
});
