import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const trackedPage = read("playtest/tracked/index.html");
const controls = read("playtest/tracked/session-controls.js");
const feedbackPage = read("playtest/feedback/index.html");
const feedbackApp = read("playtest/feedback/app.js");
const worker = read("workers/playtest-sessions/src/closure.js");
const wrangler = read("workers/playtest-sessions/wrangler.toml");
const deployment = read(".github/workflows/deploy-v061-workers.yml");

describe("manual session closure and standalone feedback", () => {
  it("lets only the creator close or cancel an open tracked session", () => {
    expect(trackedPage).toContain("session-controls.js");
    expect(controls).toContain("Close session");
    expect(controls).toContain("Cancel session");
    expect(controls).toContain("X-Host-Key");
    expect(controls).toContain("/close");
    expect(worker).toContain("Only the session creator can close or cancel this session");
    expect(worker).toContain('closureType === "cancelled"');
    expect(worker).toContain("tracked_session_closed_manually");
    expect(worker).toContain("tracked_session_cancelled");
  });

  it("preserves manually closed partial data but excludes cancelled records from analysis", () => {
    expect(controls).toContain("preserves partial feedback");
    expect(worker).toContain('metadata.analysisEligible = closureType !== "cancelled"');
    expect(worker).toContain('filter((game) => game.metadata?.closureType !== "cancelled")');
    expect(worker).toContain("cancelledSessionCount");
    expect(controls).toContain("excluded from compiled analysis");
  });

  it("offers a direct feedback page with no session code or second-player dependency", () => {
    expect(trackedPage).toContain('href="../feedback/"');
    expect(feedbackPage).toContain("No session code required");
    expect(feedbackPage).toContain("the other player does not need to be present");
    expect(feedbackPage).toContain("does not invent an opponent, shared result, live timeline, or Rules Arbiter history");
    expect(feedbackApp).toContain("/api/standalone-feedback");
    expect(feedbackApp).not.toContain("joinToken");
  });

  it("stores standalone feedback as a closed one-respondent record with remembered context", () => {
    expect(worker).toContain('metadata.collectionMode = "standalone-feedback"');
    expect(worker).toContain("metadata.standaloneContext = context");
    expect(worker).toContain('responseUrl.pathname = `/api/tracked-games/${encodeURIComponent(created.joinToken)}/response`');
    expect(worker).toContain("standalone_feedback_submitted");
    expect(worker).toContain("status = 'closed'");
    expect(worker).toContain("They do not include a tracked timeline, a verified opponent, or a shared result");
  });

  it("deploys the closure wrapper and advertises all three capabilities", () => {
    expect(wrangler).toContain('main = "src/closure.js"');
    expect(worker).toContain('import journalWorker from "./journal.js"');
    expect(worker).toContain("manualSessionClosureSupported");
    expect(worker).toContain("sessionCancellationSupported");
    expect(worker).toContain("standaloneFeedbackSupported");
    expect(deployment).toContain("manualSessionClosureSupported");
    expect(deployment).toContain("standaloneFeedbackSupported");
  });
});
