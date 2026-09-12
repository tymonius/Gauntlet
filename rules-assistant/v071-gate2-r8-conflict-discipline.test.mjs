import { describe, expect, test } from "vitest";
import { BEHAVIOR_REVISION, buildQuestionSpecificAdjudicationReminder } from "./worker-v071.js";

function sources(cardTitle, rulebookTitle, rulebookExcerpt) {
  return [
    {
      id: "S1",
      canonicalId: `card:test-${cardTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: `Card: ${cardTitle}`,
      excerpt: `${cardTitle} printed component text.`
    },
    {
      id: "S2",
      canonicalId: `rulebook:test-${rulebookTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: rulebookTitle,
      excerpt: `${cardTitle}: ${rulebookExcerpt}`
    },
    {
      id: "S3",
      canonicalId: "rulebook:golden-rules",
      title: "Golden Rules",
      excerpt: "When a specific rule conflicts with a general rule, the more specific rule wins."
    }
  ];
}

describe("v0.7.1 Gate 2 r8 named-card conflict discipline", () => {
  test("pins the r8 behavior revision", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260912-8");
  });

  test("does not equate compatible card and Rulebook coverage with a conflict", () => {
    const reminder = buildQuestionSpecificAdjudicationReminder(
      "What does Counterintelligence do?",
      sources(
        "Counterintelligence",
        "Counterintelligence",
        "prevents opposing revealing effects while rules-mandated reveals remain unaffected."
      )
    );
    expect(reminder).toContain("Do not infer a conflict merely because");
    expect(reminder).toContain("If the authorities are compatible, do not invoke specificity");
    expect(reminder).toContain("it may remain explicit");
  });

  test("preserves inferred treatment for genuine named-card conflicts", () => {
    const reminder = buildQuestionSpecificAdjudicationReminder(
      "How does Leveraged Buyout work?",
      sources(
        "Leveraged Buyout",
        "Collateral",
        "battle collateral goes to the Graveyard after the purchase."
      )
    );
    expect(reminder).toContain("mutually incompatible on a material instruction");
    expect(reminder).toContain("classify the conflict-resolved result inferred");
    expect(reminder).toContain("Golden Rules");
  });
});
