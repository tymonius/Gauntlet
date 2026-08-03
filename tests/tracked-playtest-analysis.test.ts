import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const page = read("playtest/analysis/index.html");
const app = read("playtest/analysis/app.js");
const styles = read("playtest/analysis/styles.css");
const worker = read("workers/playtest-sessions/src/analysis.js");
const integrityWorker = read("workers/playtest-sessions/src/integrity.js");
const journalWorker = read("workers/playtest-sessions/src/journal.js");
const closureWorker = read("workers/playtest-sessions/src/closure.js");
const integrityPage = read("playtest/analysis/integrity/index.html");
const integrityApp = read("playtest/analysis/integrity/app.js");
const integrityStyles = read("playtest/analysis/integrity/styles.css");
const integrityMigration = read("rules-assistant/migrations/0006_playtest_analysis_exclusions.sql");
const host = read("playtest/host/index.html");
const wrangler = read("workers/playtest-sessions/wrangler.toml");

describe("compiled tracked playtest analysis", () => {
  it("is an owner-only, non-indexed research surface linked from Host Home", () => {
    expect(page).toContain('name="robots" content="noindex, nofollow"');
    expect(page).toContain("Owner research workspace");
    expect(page).toContain("Facilitator creation key");
    expect(host).toContain('href="../analysis/"');
  });

  it("renders only the access or compiled state, never both", () => {
    expect(page).toContain('id="analysisApp" hidden');
    expect(page).toContain("[hidden]{display:none!important}");
    expect(app).toContain("el.accessPanel.hidden = true");
    expect(app).toContain("el.analysisApp.hidden = false");
  });

  it("protects aggregate questionnaire data with the existing facilitator key", () => {
    expect(worker).toContain("requireOwnerAuthorization");
    expect(worker).toContain("SESSION_ADMIN_TOKEN");
    expect(worker).toContain("Playtest analysis authorization failed");
    expect(app).toContain('"Authorization": `Bearer ${token}`');
    expect(app).not.toContain("localStorage");
    expect(app).not.toContain("sessionStorage");
  });

  it("compiles games, players, shared results, responses, Arbiter questions, and events", () => {
    expect(worker).toContain("playtest_session_results");
    expect(worker).toContain("playtest_participant_responses");
    expect(worker).toContain("playtest_arbiter_links");
    expect(worker).toContain("playtest_session_events");
    expect(worker).toContain("json_extract(metadata_json, '$.mode') = 'tracked'");
    expect(worker).toContain("summarizeGames");
  });

  it("supports research filters and recomputes the visible slice", () => {
    for (const id of ["filterStatus", "filterVersion", "filterFaction", "filterLeader", "filterFrom", "filterTo", "filterSearch"]) {
      expect(page).toContain(`id="${id}"`);
    }
    expect(app).toContain("state.filteredGames");
    expect(app).toContain("gameSearchText");
    expect(app).toContain("summarizeGames(state.filteredGames)");
  });

  it("exports a canonical analysis bundle plus spreadsheet-friendly CSVs", () => {
    expect(page).toContain("Download analysis bundle (JSON)");
    expect(page).toContain("Responses CSV");
    expect(page).toContain("Games CSV");
    expect(page).toContain("Arbiter questions CSV");
    expect(app).toContain("gauntlet-tracked-analysis-export-v1");
    expect(app).toContain("analysisBrief");
    expect(app).toContain("recommendedTasks");
    expect(app).toContain("downloadResponsesCsv");
    expect(app).toContain("downloadGamesCsv");
    expect(app).toContain("downloadArbiterCsv");
  });

  it("anonymizes names and participant references before AI export by default", () => {
    expect(page).toContain('id="anonymizeExports" type="checkbox" checked');
    expect(app).toContain("Player ${gameIndex + 1}-${player.seatIndex}");
    expect(app).toContain("replaceParticipantReferences");
    expect(app).toContain("playerNamesAnonymized");
  });

  it("supports audited game and response exclusions without destructive deletion", () => {
    expect(integrityMigration).toContain("CREATE TABLE IF NOT EXISTS playtest_analysis_exclusions");
    expect(integrityMigration).toContain("target_type IN ('game', 'response')");
    expect(integrityMigration).toContain("restored_at");
    expect(integrityMigration).not.toContain("DELETE FROM playtest_participant_responses");
    expect(integrityWorker).toContain("buildIntegrityView");
    expect(integrityWorker).toContain("summarizeGames(integrity.activeGames)");
    expect(integrityWorker).toContain("This record is already excluded");
  });

  it("provides protected exclusion and restoration controls with reviewer attribution", () => {
    expect(page).toContain('href="integrity/"');
    expect(page).toContain("Manage data integrity");
    expect(integrityPage).toContain('name="robots" content="noindex, nofollow"');
    expect(integrityPage).toContain("Reviewer name or initials");
    expect(integrityApp).toContain("Exclude entire game");
    expect(integrityPage).toContain("Excluded records");
    expect(integrityPage).toContain("Exclusion audit history");
    expect(integrityApp).toContain('action: "exclude"');
    expect(integrityApp).toContain('action: "restore"');
    expect(integrityApp).not.toContain("localStorage");
    expect(integrityApp).not.toContain("sessionStorage");
    expect(integrityStyles).toContain("[hidden]{display:none!important}");
  });

  it("uses the host visual language and deploys through the complete wrapper chain", () => {
    expect(styles).toContain("--analysis-gold");
    expect(styles).toContain("--analysis-ink");
    expect(wrangler).toContain('main = "src/closure.js"');
    expect(closureWorker).toContain('import journalWorker from "./journal.js"');
    expect(journalWorker).toContain('import integrityWorker from "./integrity.js"');
    expect(integrityWorker).toContain('import analysisWorker, { readTrackedAnalysis, summarizeGames } from "./analysis.js"');
    expect(worker).toContain('import trackedWorker from "./tracked.js"');
  });
});
