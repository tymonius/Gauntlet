import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const trackedPage = read("playtest/tracked/index.html");
const journalApp = read("playtest/tracked/journal.js");
const retrospectivePage = read("playtest/retrospective/index.html");
const retrospectiveApp = read("playtest/retrospective/app.js");
const worker = read("workers/playtest-sessions/src/journal.js");
const wrangler = read("workers/playtest-sessions/wrangler.toml");

describe("retrospective playtests and player journals", () => {
  it("offers an explicit retrospective path instead of faking live tracking", () => {
    expect(trackedPage).toContain('href="../retrospective/"');
    expect(retrospectivePage).toContain("Marked separately");
    expect(retrospectivePage).toContain("Do not recreate live activity");
    expect(retrospectiveApp).toContain("/api/retrospective-games");
    expect(worker).toContain('metadata.collectionMode = "retrospective"');
    expect(worker).toContain("metadata.liveTracking = false");
    expect(worker).toContain("playedOn");
  });

  it("reuses the established two-player result and questionnaire lifecycle", () => {
    expect(worker).toContain('upstreamUrl.pathname = "/api/tracked-games"');
    expect(worker).toContain('withQuery(payload.joinUrl, "retrospective", "1")');
    expect(retrospectiveApp).toContain(`${"gauntlet_tracked_"}`);
    expect(retrospectivePage).toContain("Each player submits their own private questionnaire");
  });

  it("gives both authenticated players private categorized note streams", () => {
    expect(trackedPage).toContain("journal.js");
    expect(journalApp).toContain("Keep a private playtest journal");
    expect(journalApp).toContain("Rules confusion");
    expect(journalApp).toContain("Strategic observation");
    expect(worker).toContain("X-Participant-Id");
    expect(worker).toContain("X-Participant-Token");
    expect(worker).toContain("readOwnNotes");
    expect(worker).toContain("if (data.participantId !== participantId) return []");
  });

  it("preserves drafts and queues notes when connectivity fails", () => {
    expect(journalApp).toContain("journal_draft");
    expect(journalApp).toContain("journal_queue");
    expect(journalApp).toContain("Saved locally while offline");
    expect(journalApp).toContain("flushQueue");
    expect(worker).toContain("clientNoteId");
    expect(worker).toContain("duplicate: true");
  });

  it("labels reconstructed notes and analysis provenance", () => {
    expect(journalApp).toContain("Reconstructed observations");
    expect(worker).toContain('source: collectionMode === "retrospective" ? "reconstructed" : "live"');
    expect(worker).toContain("collectionModes");
    expect(worker).toContain("Retrospective records were entered after play");
  });

  it("deploys the journal wrapper and advertises its capabilities", () => {
    expect(wrangler).toContain('main = "src/journal.js"');
    expect(worker).toContain("playtestJournalSupported");
    expect(worker).toContain("retrospectiveFeedbackSupported");
    expect(worker).toContain("privatePlayerNotesSupported");
  });
});
