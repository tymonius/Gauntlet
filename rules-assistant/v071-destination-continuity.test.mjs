import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  augmentRetrievalForContext,
  contextualQuery,
  ensureProvisionalAnswer
} from "./worker-v071.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url),
  "utf8"
);

const corpus = buildRulesCorpus({
  canonicalData,
  rulebookMarkdown,
  siteOrigin: "https://gauntlet.run",
  rulebookBrowserUrl: "https://gauntlet.run/rulebook/",
  canonicalDataUrl: "https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json"
});

const destinationAuthorityIds = [
  "rulebook:gambit-area",
  "rulebook:tactic-area",
  "rulebook:clearing-battle-cards"
];

function retrieveWithContext(question, history) {
  const raw = retrieveRules(corpus, contextualQuery(question, history), {
    limit: 10,
    excerptLength: 1300
  });
  return augmentRetrievalForContext(corpus, question, history, raw);
}

function expectDestinationAuthority(question, history) {
  const sources = retrieveWithContext(question, history);
  expect(sources.slice(0, 3).map((source) => source.canonicalId)).toEqual(destinationAuthorityIds);
  const authority = sources.slice(0, 3).map((source) => source.excerpt).join("\n");
  expect(authority).toContain("Graveyard");
  expect(authority).toContain("Discard Pile");
}

describe("v0.7.1 Gambit/Tactic destination continuity", () => {
  test("preserves the destination referent through the exact reviewed multi-turn exchange", () => {
    const history = [
      {
        role: "user",
        content: "What's the difference between a gambit and a tactic?"
      },
      {
        role: "assistant",
        content: "A Gambit and a Tactic are separate battle-card roles. A card’s printed heading determines which role its effect can be used in: Gambit only, Tactic only, or either role. The role does not alter the effect’s printed timing."
      },
      {
        role: "user",
        content: "What's different about them?"
      },
      {
        role: "assistant",
        content: "A Gambit is set from Hand during a battle; a Tactic is chosen from Reserve during a battle. A Gambit/Tactic card can be used as either, using that role’s source, timing, and normal destination. Their printed heading determines eligibility, not the effect’s timing."
      },
      {
        role: "user",
        content: "Is that the only difference?"
      },
      {
        role: "assistant",
        content: "No. They also use the normal destination of the role in which they were used. Their printed heading determines eligibility, but does not change the effect’s timing."
      }
    ];

    expectDestinationAuthority("Which is what", history);

    history.push(
      { role: "user", content: "Which is what" },
      {
        role: "assistant",
        content: "Both roles: a Gambit/Tactic used as a Gambit uses the Gambit destination; used as a Tactic uses the Tactic destination."
      }
    );
    expectDestinationAuthority("Which are??", history);

    history.push(
      { role: "user", content: "Which are??" },
      {
        role: "assistant",
        content: "Gambit and Tactic are the two roles. A card with the printed heading “Gambit/Tactic” may be used as either role."
      }
    );
    expectDestinationAuthority("No their destinations", history);
  });

  test("does not append duplicate provisional boilerplate when the model already supplied it", () => {
    const answer = ensureProvisionalAnswer(
      "Provisional Arbiter Ruling: Use the closest analogy. It applies for the rest of the current game and is logged for designer review."
    );
    expect(answer.match(/rest of the current game/gi)).toHaveLength(1);
    expect(answer.match(/logged for designer review/gi)).toHaveLength(1);
  });
});
