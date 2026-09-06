import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const page = read("playtest/tracked/index.html");
const app = read("playtest/tracked/app.js");
const styles = read("playtest/tracked/styles.css");
const start = read("start/app.js");
const worker = read("workers/playtest-sessions/src/tracked.js");
const analysisWorker = read("workers/playtest-sessions/src/analysis.js");
const integrityWorker = read("workers/playtest-sessions/src/integrity.js");
const journalWorker = read("workers/playtest-sessions/src/journal.js");
const closureWorker = read("workers/playtest-sessions/src/closure.js");
const completenessWorker = read("workers/playtest-sessions/src/completeness.js");
const migration = read("rules-assistant/migrations/0005_tracked_playtests.sql");
const decisionMigration = read("rules-assistant/migrations/0010_playtest_decision_experience.sql");
const wrangler = read("workers/playtest-sessions/wrangler.toml");

describe("streamlined tracked playtests", () => {
  it("is a public one-game workflow rather than an event or roster workflow", () => {
    expect(page).toContain("One game · two players · digital feedback");
    expect(page).toContain("Start a tracked playtest");
    expect(page).toContain("Both players use this game");
    expect(app).toContain('api("/api/tracked-games"');
    expect(app).not.toContain("event-participants");
    expect(app).not.toContain("onboardingUrl");
    expect(app).not.toContain("table manifest");
  });

  it("renders only the current lifecycle panels", () => {
    expect(page).toContain('id="loadingPanel"');
    expect(page).toContain('id="errorPanel"');
    expect(page).toContain('id="completionPanel"');
    expect(styles).toContain("[hidden]{display:none!important}");
  });

  it("uses the saved standalone faction and Leader choice when available", () => {
    expect(app).toContain('gauntlet_standalone_onboarding_v1');
    expect(app).toContain("restoreStartChoice");
    expect(app).toContain("standalone-onboarding");
    expect(start).toContain("Create tracked playtest");
    expect(start).toContain('new URL("../playtest/tracked/"');
  });

  it("chooses play transport by location instead of preferring TTS", () => {
    expect(page).toContain('id="createPlayMode"');
    expect(page).toContain("Together in person — physical tabletop");
    expect(page).toContain("Remotely — Tabletop Simulator");
    expect(page).not.toContain("Tabletop Simulator — recommended");
    expect(page).toContain("3790840635");
    expect(page).toContain('id="transportPanel"');
    expect(app).toContain("requestedPlayMode");
    expect(app).toContain("renderTransport");
    expect(app).toContain("playMode:");
    expect(app).toContain('el.createPlayMode?.value || ""');
    expect(worker).toContain('const playMode = ["physical", "tts"].includes(requestedMode) ? requestedMode : "unspecified"');
    expect(worker).toContain("playMode,");
    expect(worker).toContain('metadata.playMode || "physical"');
    expect(start).toContain('if (mode === "physical" || mode === "tts")');
  });

  it("creates two authenticated player seats and player-attributed Arbiter links", () => {
    expect(worker).toContain("Both player seats are already filled");
    expect(worker).toContain("identity_token_hash");
    expect(worker).toContain("participantToken");
    expect(worker).toContain("playtest_arbiter_links");
    expect(worker).toContain("playtest_participant_id");
    expect(app).toContain("participantBody");
    expect(app).toContain("/arbiter");
  });

  it("records timestamped player diagnostic flags during live play", () => {
    expect(page).toContain('data-diagnostic-flag="feels_decided"');
    expect(page).toContain('data-diagnostic-flag="no_meaningful_option"');
    expect(app).toContain("recordDiagnostic");
    expect(app).toContain('eventType: "diagnostic_flag"');
    expect(worker).toContain('"diagnostic_flag"');
    expect(worker).toContain('"feels_decided"');
    expect(worker).toContain('"no_meaningful_option"');
    expect(worker).toContain("data.participantId = participant.id");
  });

  it("stores shared results and individual per-player responses in normalized tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS playtest_session_results");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS playtest_participant_responses");
    expect(worker).toContain("submitSharedResult");
    expect(worker).toContain("submitPlayerResponse");
    expect(page).toContain("Your individual response");
    expect(page).toContain("The public game view shows only that you submitted");
    expect(page).toContain('id="createSelectionReason"');
    expect(page).toContain('id="joinSelectionReason"');
    expect(page).toContain('id="feltDecidedWhen"');
    expect(page).toContain('id="agencyAfterDecided"');
    expect(page).toContain('id="decisiveCause"');
    expect(decisionMigration).toContain("selection_reason");
    expect(decisionMigration).toContain("felt_decided_when");
    expect(decisionMigration).toContain("agency_after_decided");
    expect(decisionMigration).toContain("decisive_cause");
    expect(worker).toContain("selectionReason");
    expect(worker).toContain("feltDecidedWhen");
    expect(worker).toContain("agencyAfterDecided");
    expect(worker).toContain("decisiveCause");
    expect(analysisWorker).toContain("selection_reason");
    expect(analysisWorker).toContain("felt_decided_when");
    expect(analysisWorker).toContain("agency_after_decided");
  });

  it("automatically closes only after one result and both responses", () => {
    expect(worker).toContain("Number(counts?.players || 0) !== 2");
    expect(worker).toContain("Number(counts?.results || 0) !== 1");
    expect(worker).toContain("Number(counts?.responses || 0) !== 2");
    expect(worker).toContain("tracked_session_submitted");
    expect(page).toContain("The shared result and both individual responses are complete");
  });

  it("keeps detailed answers behind the creator review key and supports exports", () => {
    expect(worker).toContain("Invalid review key");
    expect(worker).toContain("readTrackedReview");
    expect(app).toContain("X-Host-Key");
    expect(app).toContain("downloadReviewJson");
    expect(app).toContain("downloadReviewCsv");
  });

  it("deploys the tracked, analysis, integrity, journal, closure, and completeness wrappers while preserving public creation abuse control", () => {
    expect(wrangler).toContain('main = "src/completeness.js"');
    expect(completenessWorker).toContain('import closureWorker from "./closure.js"');
    expect(closureWorker).toContain('import journalWorker from "./journal.js"');
    expect(journalWorker).toContain('import integrityWorker from "./integrity.js"');
    expect(integrityWorker).toContain('import analysisWorker, { readTrackedAnalysis, summarizeGames } from "./analysis.js"');
    expect(analysisWorker).toContain('import trackedWorker from "./tracked.js"');
    expect(analysisWorker).toContain("compiledAnalysisSupported");
    expect(migration).toContain("playtest_public_creation_limits");
    expect(worker).toContain("CREATION_LIMIT_PER_DAY");
    expect(worker).toContain("cf-connecting-ip");
    expect(worker).toContain('CURRENT_RULES_VERSION, GAME_SERIAL_PREFIX');
    expect(worker).toContain('const serial = `${GAME_SERIAL_PREFIX}-${randomCode(8)}`');
    expect(worker).toContain("MYSTICS_STARTER_RITES");
    expect(worker).toContain("selectedRites");
    expect(worker).not.toContain("SESSION_ADMIN_TOKEN");
  });
});
