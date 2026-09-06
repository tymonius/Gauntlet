import { describe, expect, test } from "vitest";
import { contextualQuery } from "./worker-v071.js";

describe("v0.7.1 contextual retrieval query", () => {
  const intelligenceHistory = [
    { role: "user", content: "Can I use Interference on that Gambit?" },
    { role: "assistant", content: "Yes, at the applicable Intelligence response timing." }
  ];

  test("does not contaminate a standalone topic pivot with prior conversation", () => {
    const question = "How much does my Deed cost?";
    expect(contextualQuery(question, intelligenceHistory)).toBe(question);
  });

  test("keeps a self-contained named rules question independent of unrelated history", () => {
    const question = "Can Intelligence interfere with a Gambit that was already face up?";
    const history = [
      { role: "user", content: "How does Financial Capacity work?" },
      { role: "assistant", content: "It changes the number of Actions available during the applicable phase." }
    ];
    expect(contextualQuery(question, history)).toBe(question);
  });

  test("uses the immediately preceding exchange for an elliptical referent", () => {
    const history = [
      { role: "user", content: "Tell me about Military Orders." },
      { role: "assistant", content: "Orders are a Military resource." },
      { role: "user", content: "What is different about Gambits and Tactics?" },
      { role: "assistant", content: "They use different battle roles and normal destinations." }
    ];
    const query = contextualQuery("Where do they go?", history);
    expect(query).toContain("What is different about Gambits and Tactics?");
    expect(query).toContain("They use different battle roles and normal destinations.");
    expect(query).toContain("Where do they go?");
    expect(query).not.toContain("Military Orders");
  });

  test("preserves correction fragments that depend on the prior answer", () => {
    const history = [
      { role: "user", content: "What is the difference between a Gambit and a Tactic?" },
      { role: "assistant", content: "They have different battle roles and destinations." }
    ];
    expect(contextualQuery("No, their destinations", history)).toContain("They have different battle roles and destinations.");
  });

  test("treats a bare short question as context-dependent", () => {
    expect(contextualQuery("How much?", intelligenceHistory)).not.toBe("How much?");
  });
});
