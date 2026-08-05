import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const page = read("playtest/analysis/index.html");
const enhancement = read("playtest/analysis/complete-responses.js");

describe("complete playtest response analysis", () => {
  it("loads a syntactically valid completeness layer before the existing analysis application", () => {
    const completenessIndex = page.indexOf("complete-responses.js");
    const appIndex = page.indexOf('src="app.js');
    expect(completenessIndex).toBeGreaterThan(-1);
    expect(appIndex).toBeGreaterThan(completenessIndex);
    expect(page).toContain("tracked, retrospective, and standalone");
    expect(() => new Function(enhancement)).not.toThrow();
  });

  it("renders every questionnaire rating rather than a selected subset", () => {
    for (const key of [
      "expectationMatch",
      "leaderDistinction",
      "fun",
      "pacing",
      "meaningfulDecisions",
      "battleTension",
      "rulesClarity",
      "factionClarity",
      "tableOrganization"
    ]) {
      expect(enhancement).toContain(key);
    }
    expect(enhancement).toContain("All ratings");
    expect(enhancement).toContain("Would play again?");
    expect(enhancement).toContain("Additional comments");
  });

  it("shows complete tracked results and complete standalone remembered context", () => {
    expect(enhancement).toContain("Standalone game context");
    expect(enhancement).toContain("Shared game result");
    expect(enhancement).toContain("firstPlayerPerspective");
    expect(enhancement).toContain("victoryRoute");
    expect(enhancement).toContain("durationMinutes");
    expect(enhancement).toContain("rounds");
    expect(enhancement).toContain("battles");
    expect(enhancement).toContain("stopReason");
    expect(enhancement).toContain("packageUnmodified");
    expect(enhancement).toContain("variantUsed");
    expect(enhancement).toContain("productionIssue");
    expect(enhancement).toContain("strongestMoment");
    expect(enhancement).toContain("confusingPoint");
    expect(enhancement).toContain("importantObservation");
  });

  it("keeps standalone recollections labeled while preserving the additive v1 export contract", () => {
    expect(enhancement).toContain('collection_mode: collectionMode(game)');
    expect(enhancement).toContain("standalone-feedback records contain one respondent's remembered context");
    expect(enhancement).toContain("gauntlet-tracked-analysis-export-v1");
    expect(enhancement).toContain("complete questionnaire response");
    expect(enhancement).toContain("complete game record");
  });
});
