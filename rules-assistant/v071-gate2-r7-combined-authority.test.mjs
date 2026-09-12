import { describe, expect, test } from "vitest";
import {
  BEHAVIOR_REVISION,
  augmentRetrievalForContext,
  buildQuestionSpecificAdjudicationReminder
} from "./worker-v071.js";

function document(id, title, body) {
  return {
    id,
    kind: "rulebook",
    title,
    heading: title,
    body,
    sourcePath: "releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md",
    sourceUrl: `https://gauntlet.run/rulebook/#${id.replace(/^rulebook:/, "")}`,
    searchText: body.toLowerCase()
  };
}

function retrieved(doc, id = "S1") {
  return {
    id,
    canonicalId: doc.id,
    score: 10,
    title: doc.title,
    heading: doc.heading,
    kind: doc.kind,
    sourcePath: doc.sourcePath,
    sourceUrl: doc.sourceUrl,
    excerpt: doc.body,
    body: doc.body
  };
}

describe("v0.7.1 Gate 2 r7 combined-authority regressions", () => {
  test("pins the r7 behavior revision", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260912-7");
  });

  test("injects Deeds and Front Line together for contiguity comparisons", () => {
    const deeds = document(
      "rulebook:deeds",
      "Deeds",
      "Deed ownership is independent of token position and Territory control."
    );
    const frontLine = document(
      "rulebook:front-line",
      "Front Line",
      "Your controlled Territories must form one unbroken contiguous line."
    );
    const corpus = { documents: [deeds, frontLine] };
    const result = augmentRetrievalForContext(
      corpus,
      "Do purchased deeds have to be contiguous like your Front Line?",
      [],
      [retrieved(deeds)]
    );

    expect(result.slice(0, 2).map((source) => source.canonicalId)).toEqual([
      "rulebook:deeds",
      "rulebook:front-line"
    ]);
    const reminder = buildQuestionSpecificAdjudicationReminder(
      "Do purchased deeds have to be contiguous like your Front Line?",
      result
    );
    expect(reminder).toContain("combined-authority inference");
    expect(reminder).toContain("classify it inferred");
    expect(reminder).toContain("cite both authorities");
  });

  test("surfaces the Golden Rules classification check for named-card conflicts", () => {
    const sources = [
      {
        id: "S1",
        canonicalId: "card:financiers-leveraged-buyout",
        title: "Card: Leveraged Buyout",
        excerpt: "Battle collateral goes to your Graveyard when battle cards are cleared."
      },
      {
        id: "S2",
        canonicalId: "rulebook:collateral",
        title: "Collateral",
        excerpt: "Leveraged Buyout collateral used from battle goes to the Graveyard after the purchase."
      },
      {
        id: "S3",
        canonicalId: "rulebook:golden-rules",
        title: "Golden Rules",
        excerpt: "When a specific rule conflicts with a general rule, the more specific rule wins."
      }
    ];
    const reminder = buildQuestionSpecificAdjudicationReminder("How does Leveraged Buyout work?", sources);
    expect(reminder).toContain("printed named-card authority");
    expect(reminder).toContain("more-specific-rule precedence");
    expect(reminder).toContain("classify the resolution inferred");
    expect(reminder).toContain("Golden Rules");
  });

  test("does not invent a combined-authority check for ordinary direct authority", () => {
    const reminder = buildQuestionSpecificAdjudicationReminder("How many cards do I draw?", [
      { id: "S1", canonicalId: "rulebook:drawing-cards", title: "Drawing cards", excerpt: "Draw two cards." }
    ]);
    expect(reminder).toBe("");
  });
});
