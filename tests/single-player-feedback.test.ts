import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const companion = read("playtest/tracked/journal.js");
const trackedWorker = read("workers/playtest-sessions/src/tracked.js");

describe("single-player playtest feedback", () => {
  it("unlocks an individual questionnaire without a second joined player", () => {
    expect(companion).toContain("You do not need to wait for the other player");
    expect(companion).toContain('const canRespond = session.status === "open" && !me.responseSubmitted');
    expect(companion).not.toContain("session.resultSubmitted && !me.responseSubmitted");
    expect(companion).not.toContain("session.playerCount === 2 && !me.responseSubmitted");
  });

  it("keeps shared results separate from individual feedback", () => {
    expect(trackedWorker).toContain('if (players.length !== 2) throw new HttpError(409, "Both players must join before results are submitted")');
    expect(trackedWorker).toContain("async function submitPlayerResponse");
    const responseStart = trackedWorker.indexOf("async function submitPlayerResponse");
    const reviewStart = trackedWorker.indexOf("async function readTrackedReview");
    const responseHandler = trackedWorker.slice(responseStart, reviewStart);
    expect(responseHandler).not.toContain("players.length !== 2");
    expect(responseHandler).not.toContain("playtest_session_results");
  });

  it("preserves the absent player's opportunity to join later", () => {
    expect(companion).toContain("The second player can still scan the code and add their own response later");
    expect(companion).toContain("The other player may still join and submit separately later");
  });
});
