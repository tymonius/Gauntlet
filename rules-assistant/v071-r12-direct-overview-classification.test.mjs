import { describe, expect, test } from "vitest";
import {
  BEHAVIOR_REVISION,
  normalizeModelRulingStatus,
  shouldPromoteDirectOverviewToExplicit
} from "./worker-v071.js";

function source(title) {
  return { id: "S1", title, excerpt: "direct authority" };
}

describe("v0.7.1 r12 direct-overview classification", () => {
  test("pins r12 behavior", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260918-24");
  });

  test("Withdrawal overview is explicit when a selected source directly covers Withdrawal", () => {
    const sources = [source("7. Battles › Withdrawal and Retreat › Complete rules › Withdrawal")];
    expect(shouldPromoteDirectOverviewToExplicit("What happens when I withdraw from a battle?", sources)).toBe(true);
    expect(normalizeModelRulingStatus("inferred", "What happens when I withdraw from a battle?", sources)).toBe("explicit");
  });

  test("Command and Orders overview is explicit when a selected source directly covers the topic", () => {
    const sources = [source("13. Military › Command and Orders › Complete rules")];
    expect(normalizeModelRulingStatus("inferred", "How do Command and Orders work?", sources)).toBe("explicit");
  });

  test("Deed contiguity remains inferred", () => {
    const sources = [source("12. Financiers › Deeds"), source("5. Movement › Front Line")];
    expect(normalizeModelRulingStatus("inferred", "Do purchased deeds have to be contiguous like your Front Line?", sources)).toBe("inferred");
  });

  test("multi-authority trigger questions remain inferred", () => {
    const sources = [source("Withdrawal"), source("Witch Hunter — Relentless Pursuit")];
    expect(normalizeModelRulingStatus("inferred", "What happens when I withdraw with Relentless Pursuit?", sources)).toBe("inferred");
  });

  test("no-source written classifications fail closed to provisional", () => {
    expect(normalizeModelRulingStatus("explicit", "How do Command and Orders work?", [])).toBe("provisional");
    expect(normalizeModelRulingStatus("inferred", "How do Command and Orders work?", [])).toBe("provisional");
  });
});
