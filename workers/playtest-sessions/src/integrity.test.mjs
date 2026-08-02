import { describe, expect, it } from "vitest";
import integrityWorker, { applyIntegrityAction, buildIntegrityView } from "./integrity.js";
import { summarizeGames } from "./analysis.js";

const adminToken = "facilitator-key-for-integrity-tests";

function gameFixture() {
  return {
    sessionId: "game-1",
    sheetSerial: "G061-INTEGRITY1",
    rulesVersion: "v0.6.1",
    status: "closed",
    createdAt: "2026-08-02T10:00:00.000Z",
    closedAt: "2026-08-02T11:15:00.000Z",
    metadata: { mode: "tracked" },
    result: {
      submittedByParticipantId: "player-1",
      completionStatus: "completed",
      firstPlayerParticipantId: "player-2",
      winnerParticipantId: "player-1",
      victoryRoute: "faction_victory",
      durationMinutes: 72,
      rounds: 8,
      battles: 6,
      stopReason: "",
      packageUnmodified: true,
      variantUsed: false,
      productionIssue: "",
      strongestMoment: "A late agreement changed the board.",
      confusingPoint: "Capture timing.",
      importantObservation: "The center stayed contested.",
      submittedAt: "2026-08-02T11:10:00.000Z",
      updatedAt: "2026-08-02T11:10:00.000Z"
    },
    players: [
      {
        participantId: "player-1", displayName: "Alice", seatIndex: 1,
        faction: "diplomats", leader: "Ambassador", joinedAt: "2026-08-02T10:00:00.000Z",
        response: responseFixture(4, "Negotiation", "Strong identity.")
      },
      {
        participantId: "player-2", displayName: "Ben", seatIndex: 2,
        faction: "military", leader: "General", joinedAt: "2026-08-02T10:02:00.000Z",
        response: responseFixture(5, "Direct pressure", "Would replay.")
      }
    ],
    arbiterQuestions: [{ interactionId: "interaction-1", question: "When is a Territory captured?" }],
    events: [{ eventType: "game_started", data: {}, createdAt: "2026-08-02T10:05:00.000Z" }]
  };
}

function responseFixture(fun, factionInterest, comments) {
  return {
    factionInterest,
    expectationMatch: 4,
    leaderDistinction: 4,
    fun,
    pacing: 4,
    meaningfulDecisions: 5,
    battleTension: 4,
    rulesClarity: 4,
    factionClarity: 4,
    tableOrganization: 4,
    playAgain: true,
    comments,
    submittedAt: "2026-08-02T11:12:00.000Z",
    updatedAt: "2026-08-02T11:12:00.000Z"
  };
}

function exclusion(overrides = {}) {
  return {
    id: "exclusion-1",
    targetType: "response",
    targetId: "player-2",
    sessionId: "game-1",
    reasonCode: "test",
    reasonNote: "Production smoke test",
    excludedBy: "TS",
    excludedAt: "2026-08-02T12:00:00.000Z",
    restoredBy: null,
    restoredAt: null,
    ...overrides
  };
}

function fixtureDb() {
  const rows = {
    sessions: [{
      id: "game-1", sheet_serial: "G061-INTEGRITY1", rules_version: "v0.6.1",
      status: "closed", created_at: "2026-08-02T10:00:00.000Z",
      closed_at: "2026-08-02T11:15:00.000Z", metadata_json: JSON.stringify({ mode: "tracked" })
    }],
    players: [
      playerRow("player-1", "Alice", 1, "diplomats", "Ambassador", 4, "Strong identity."),
      playerRow("player-2", "Ben", 2, "military", "General", 5, "Would replay.")
    ],
    results: [{
      session_id: "game-1", submitted_by_participant_id: "player-1", completion_status: "completed",
      first_player_participant_id: "player-2", winner_participant_id: "player-1",
      victory_route: "faction_victory", duration_minutes: 72, rounds: 8, battles: 6,
      stop_reason: null, package_unmodified: 1, variant_used: 0, production_issue: null,
      strongest_moment: "A late agreement changed the board.", confusing_point: "Capture timing.",
      important_observation: "The center stayed contested.", submitted_at: "2026-08-02T11:10:00.000Z",
      updated_at: "2026-08-02T11:10:00.000Z"
    }],
    arbiter: [],
    events: [],
    exclusions: []
  };

  return {
    rows,
    prepare(sql) {
      const normalized = String(sql);
      let bindings = [];
      const statement = {
        bind(...values) { bindings = values; return statement; },
        async all() {
          if (normalized.includes("FROM playtest_sessions") && !normalized.includes("JOIN")) return { results: rows.sessions };
          if (normalized.includes("FROM playtest_participants")) return { results: rows.players };
          if (normalized.includes("FROM playtest_session_results")) return { results: rows.results };
          if (normalized.includes("FROM playtest_arbiter_links")) return { results: rows.arbiter };
          if (normalized.includes("FROM playtest_session_events")) return { results: rows.events };
          if (normalized.includes("FROM playtest_analysis_exclusions")) return { results: rows.exclusions };
          throw new Error(`Unexpected all SQL: ${normalized}`);
        },
        async first() {
          if (!normalized.includes("playtest_analysis_exclusions")) throw new Error(`Unexpected first SQL: ${normalized}`);
          if (normalized.includes("target_type = ?")) {
            return rows.exclusions.find((item) => item.target_type === bindings[0] && item.target_id === bindings[1] && !item.restored_at) || null;
          }
          if (normalized.includes("id = ?")) {
            return rows.exclusions.find((item) => item.id === bindings[0] && !item.restored_at) || null;
          }
          return null;
        },
        async run() {
          if (normalized.includes("INSERT INTO playtest_analysis_exclusions")) {
            rows.exclusions.push({
              id: bindings[0], target_type: bindings[1], target_id: bindings[2], session_id: bindings[3],
              reason_code: bindings[4], reason_note: bindings[5], excluded_by: bindings[6],
              excluded_at: bindings[7], restored_by: null, restored_at: null
            });
            return { success: true };
          }
          if (normalized.includes("UPDATE playtest_analysis_exclusions")) {
            const row = rows.exclusions.find((item) => item.id === bindings[2] && !item.restored_at);
            if (row) { row.restored_by = bindings[0]; row.restored_at = bindings[1]; }
            return { success: true };
          }
          throw new Error(`Unexpected run SQL: ${normalized}`);
        }
      };
      return statement;
    }
  };
}

function playerRow(id, name, seat, faction, leader, fun, comments) {
  return {
    session_id: "game-1", participant_id: id, display_name: name, seat_index: seat,
    faction, leader, joined_at: "2026-08-02T10:00:00.000Z",
    faction_interest: "Interest", expectation_match: 4, leader_distinction: 4,
    fun, pacing: 4, meaningful_decisions: 5, battle_tension: 4, rules_clarity: 4,
    faction_clarity: 4, table_organization: 4, play_again: 1, comments,
    response_submitted_at: "2026-08-02T11:12:00.000Z", response_updated_at: "2026-08-02T11:12:00.000Z"
  };
}

describe("tracked playtest data integrity", () => {
  it("removes an excluded response from aggregates while retaining the game", () => {
    const view = buildIntegrityView([gameFixture()], [exclusion()]);
    expect(view.activeGames).toHaveLength(1);
    expect(view.activeGames[0].players[1].response).toBeNull();
    expect(view.excludedResponses).toHaveLength(1);
    expect(view.excludedResponses[0].player.response.comments).toBe("Would replay.");
    expect(summarizeGames(view.activeGames).responseCount).toBe(1);
  });

  it("removes a whole excluded game from summaries and exports", () => {
    const view = buildIntegrityView([gameFixture()], [exclusion({ targetType: "game", targetId: "game-1" })]);
    expect(view.activeGames).toHaveLength(0);
    expect(view.excludedGames).toHaveLength(1);
    expect(summarizeGames(view.activeGames).gameCount).toBe(0);
  });

  it("retains restored exclusions in history without filtering the record", () => {
    const view = buildIntegrityView([gameFixture()], [exclusion({ restoredBy: "TS", restoredAt: "2026-08-02T13:00:00.000Z" })]);
    expect(view.activeGames[0].players[1].response).not.toBeNull();
    expect(view.excludedResponses).toHaveLength(0);
    expect(view.history).toHaveLength(1);
  });

  it("requires a reason and reviewer, then records and restores an audited exclusion", async () => {
    const db = fixtureDb();
    await expect(applyIntegrityAction(db, {
      action: "exclude", targetType: "response", targetId: "player-2",
      reasonCode: "test", reasonNote: "Smoke test", reviewer: "TS"
    })).resolves.toBeUndefined();
    expect(db.rows.exclusions).toHaveLength(1);
    expect(db.rows.exclusions[0].excluded_by).toBe("TS");

    await expect(applyIntegrityAction(db, {
      action: "restore", exclusionId: db.rows.exclusions[0].id, reviewer: "TS"
    })).resolves.toBeUndefined();
    expect(db.rows.exclusions[0].restored_by).toBe("TS");
    expect(db.rows.exclusions[0].restored_at).toBeTruthy();
  });

  it("filters the protected compiled endpoint and advertises integrity support", async () => {
    const db = fixtureDb();
    db.rows.exclusions.push({
      id: "exclusion-1", target_type: "response", target_id: "player-2", session_id: "game-1",
      reason_code: "test", reason_note: "Smoke test", excluded_by: "TS",
      excluded_at: "2026-08-02T12:00:00.000Z", restored_by: null, restored_at: null
    });
    const response = await integrityWorker.fetch(new Request("https://worker.example/api/tracked-analysis", {
      headers: { Authorization: `Bearer ${adminToken}` }
    }), { DB: db, SESSION_ADMIN_TOKEN: adminToken });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.summary.responseCount).toBe(1);
    expect(payload.games[0].players[1].response).toBeNull();
    expect(payload.exclusionSummary.excludedResponseCount).toBe(1);

    const health = await integrityWorker.fetch(new Request("https://worker.example/health"), {
      DB: db, SESSION_ADMIN_TOKEN: adminToken
    });
    const healthPayload = await health.json();
    expect(healthPayload.analysisExclusionsSupported).toBe(true);
    expect(healthPayload.analysisExclusionSchema).toBe("gauntlet-playtest-integrity-v1");
  });
});
