import { expect, test } from "vitest";
import {
  analyzeQuestionLocally,
  chooseReasoningEffort,
  extractNamedEntities,
  mergeSemanticPlan,
  retrieveIntelligentRules,
  sanitizeGameState,
  shouldVerifyAnswer
} from "./rules-intelligence.js";
import { enrichPlanFromEntityDocuments } from "./rules-plan-enrichment.js";

const corpus = {
  version: "v0.6.1",
  documents: [
    {
      id: "card:transmutation",
      kind: "card",
      title: "Mystics ability: Transmutation",
      heading: "Transmutation",
      sourcePath: "cards/mystics.md",
      sourceUrl: "https://example.test/transmutation",
      body: "Once per turn before dice are rolled, put one card from your Hand in your Graveyard and add its value to your battle total."
    },
    {
      id: "rulebook:battle-timing",
      kind: "rulebook",
      title: "Battle › Timing",
      heading: "Timing",
      sourcePath: "rulebook.md",
      sourceUrl: "https://example.test/rules#timing",
      body: "Reveal and resolution are different timings. Resolve one instruction fully before the next instruction."
    },
    {
      id: "rulebook:battle-zones",
      kind: "rulebook",
      title: "Battle › Card destinations",
      heading: "Card destinations",
      sourcePath: "rulebook.md",
      sourceUrl: "https://example.test/rules#destinations",
      body: "Cards placed in the Graveyard remain owned by the same player."
    },
    {
      id: "leader:spirit-walker",
      kind: "leader",
      title: "Leader: Spirit Walker",
      heading: "Spirit Walker",
      sourcePath: "leaders/mystics.md",
      sourceUrl: "https://example.test/spirit-walker",
      body: "The Spirit Walker uses the shared Mystics abilities."
    }
  ]
};

test("extracts exact component entities from the corpus", () => {
  const entities = extractNamedEntities(corpus, "As Spirit Walker, how does Transmutation work?");
  expect(entities.map((entity) => entity.name)).toEqual(expect.arrayContaining(["Spirit Walker", "Transmutation"]));
});

test("classifies multi-component timing interactions as high complexity", () => {
  const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(
    corpus,
    "Can Spirit Walker use Transmutation after another effect is revealed but before it resolves?"
  ));
  expect(plan.complexity).toBe("high");
  expect(plan.questionType).toBe("interaction");
  expect(plan.mechanics).toEqual(expect.arrayContaining(["battle", "timing"]));
  expect(chooseReasoningEffort(plan, "adaptive")).toBe("high");
});

test("merges semantic retrieval reformulations without discarding exact entities", () => {
  const local = analyzeQuestionLocally(corpus, "How does Transmutation work?");
  const merged = mergeSemanticPlan(local, {
    entities: ["Mystics"],
    mechanics: ["card destination"],
    roles: [],
    zones: ["Hand", "Graveyard"],
    timing: ["before dice"],
    assumptions: [],
    question_type: "procedure",
    complexity: "medium",
    retrieval_queries: ["Mystics shared Transmutation ability before dice Hand Graveyard"]
  });
  expect(merged.entities.map((entity) => entity.name)).toEqual(expect.arrayContaining(["Transmutation", "Mystics"]));
  expect(merged.retrievalQueries).toContain("Mystics shared Transmutation ability before dice Hand Graveyard");
});

test("relationship-aware retrieval guarantees named components and adjacent procedure context", () => {
  const question = "Can Spirit Walker use Transmutation after reveal but before resolution?";
  const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, question));
  const result = retrieveIntelligentRules(corpus, question, [], plan, {
    baseQueries: [question],
    limit: 8
  });
  const text = result.sources.map((source) => `${source.title}\n${source.body}`).join("\n");
  expect(text).toMatch(/Transmutation/i);
  expect(text).toMatch(/Spirit Walker/i);
  expect(text).toMatch(/Reveal and resolution are different timings/i);
  expect(text).toMatch(/Cards placed in the Graveyard/i);
});

test("verification is reserved for uncertain or consequential rulings", () => {
  expect(shouldVerifyAnswer({ complexity: "low" }, "explicit", 2, {})).toBe(false);
  expect(shouldVerifyAnswer({ complexity: "high" }, "explicit", 2, {})).toBe(true);
  expect(shouldVerifyAnswer({ complexity: "medium" }, "provisional", 1, {})).toBe(true);
});

test("structured game state accepts bounded useful context", () => {
  const state = sanitizeGameState({
    phase: "Battle",
    attacker: "Player 1",
    players: [{ faction: "Mystics", leader: "Spirit Walker" }],
    activeCards: ["Transmutation"],
    ignored: "not retained"
  });
  expect(state).toEqual({
    phase: "Battle",
    attacker: "Player 1",
    players: [{ faction: "Mystics", leader: "Spirit Walker" }],
    activeCards: ["Transmutation"]
  });
});
