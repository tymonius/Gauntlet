import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  V064_CANDIDATE_RULES_VERSION,
  V064_PROPOSAL_SOURCE_PATH,
  applyV064ProposalOverride,
  buildV064ProposalDocuments,
  validateV064ProposalSource,
} from "../rules-assistant/v064-candidate-corpus.js";

const source = JSON.parse(readFileSync("docs/v0.6.4-diplomat-proposals.json", "utf8"));

describe("v0.6.4 candidate Rules Arbiter Proposal corpus", () => {
  it("accepts the approved issue #617 source", () => {
    expect(validateV064ProposalSource(source)).toBe(true);
  });

  it("creates exact Proposal documents from the approved source", () => {
    const documents = buildV064ProposalDocuments(
      source,
      "https://example.invalid/docs/v0.6.4-diplomat-proposals.json",
    );

    expect(documents).toHaveLength(9);
    for (const proposal of source.proposals) {
      const document = documents.find((candidate) => candidate.id === `proposal:${proposal.id}`);
      expect(document).toBeDefined();
      expect(document?.heading).toBe(proposal.name);
      expect(document?.sourcePath).toBe(V064_PROPOSAL_SOURCE_PATH);
      expect(document?.body).toBe([
        `Stake: ${proposal.stake}`,
        `Requirement: ${proposal.requirement}`,
        `Accepted: ${proposal.accepted}`,
        `Refused: ${proposal.refused}`,
      ].join("\n"));
    }
  });

  it("replaces stale v0.6.3 Proposal rulebook documents without altering unrelated authority", () => {
    const baseCorpus = {
      version: "v0.6.3",
      versionLabel: "Gauntlet v0.6.3",
      published: true,
      currentPublicRelease: "v0.6.3",
      documents: [
        {
          id: "rulebook:open-channels",
          kind: "rulebook",
          title: "Diplomats › Open Channels",
          heading: "Open Channels",
          body: "Old v0.6.3 Proposal wording.",
        },
        {
          id: "rulebook:battle",
          kind: "rulebook",
          title: "Battle",
          heading: "Battle",
          body: "Unrelated v0.6.3 authority remains unchanged.",
        },
      ],
    };

    const result = applyV064ProposalOverride(
      baseCorpus,
      source,
      "https://example.invalid/docs/v0.6.4-diplomat-proposals.json",
    );

    expect(result.version).toBe(V064_CANDIDATE_RULES_VERSION);
    expect(result.published).toBe(false);
    expect(result.currentPublicRelease).toBe("v0.6.3");
    expect(result.documents.some((document) => document.id === "rulebook:open-channels")).toBe(false);
    expect(result.documents.find((document) => document.id === "rulebook:battle")?.body)
      .toBe("Unrelated v0.6.3 authority remains unchanged.");
    expect(result.byId.get("proposal:open-channels")?.body).toContain(
      "Refusing player reveals their Hand. Diplomat: +1 Reserve.",
    );
  });
});
