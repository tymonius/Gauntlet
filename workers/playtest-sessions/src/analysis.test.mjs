import { describe, expect, it } from "vitest";
import analysisWorker, { readTrackedAnalysis, summarizeGames } from "./analysis.js";

const adminToken = "facilitator-key-for-tests";

function fixtureDb() {
  const rows = {
    sessions: [{
      id: "game-1",
      sheet_serial: "G061-ANALYSIS1",
      rules_version: "v0.6.1",
      status: "closed",
      created_at: "2026-08-02T10:00:00.000Z",
      closed_at: "2026-08-02T11:15:00.000Z",
      metadata_json: JSON.stringify({ mode: "tracked", playMode: "tts", creationSource: "tracked-page" })
    }],
    players: [
      {
        session_id: "game-1", participant_id: "player-1", display_name: "Alice", seat_index: 1,
        faction: "diplomats", leader: "Ambassador", selection_reason: "Negotiation before play", joined_at: "2026-08-02T10:00:00.000Z",
        faction_interest: "Negotiation", expectation_match: 5, leader_distinction: 5, fun: 4,
        pacing: 4, meaningful_decisions: 5, battle_tension: 4, rules_clarity: 3,
        faction_clarity: 5, table_organization: 4, play_again: 1,
        felt_decided_when: "late", agency_after_decided: "some",
        decisive_cause: "A late agreement changed the board.", comments: "Strong identity.",
        response_submitted_at: "2026-08-02T11:12:00.000Z", response_updated_at: "2026-08-02T11:12:00.000Z"
      },
      {
        session_id: "game-1", participant_id: "player-2", display_name: "Ben", seat_index: 2,
        faction: "military", leader: "General", selection_reason: "Direct pressure before play", joined_at: "2026-08-02T10:02:00.000Z",
        faction_interest: "Direct pressure", expectation_match: 4, leader_distinction: 4, fun: 5,
        pacing: 3, meaningful_decisions: 4, battle_tension: 5, rules_clarity: 4,
        faction_clarity: 4, table_organization: 3, play_again: 1,
        felt_decided_when: "at_end", agency_after_decided: "yes",
        decisive_cause: "The final battle remained live.", comments: "Would replay.",
        response_submitted_at: "2026-08-02T11:14:00.000Z", response_updated_at: "2026-08-02T11:14:00.000Z"
      }
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
    arbiter: [{
      session_id: "game-1", interaction_id: "interaction-1", classification: "explicit",
      question_excerpt: "When is a Territory captured?", answer_excerpt: "After the battle resolves.",
      source_json: JSON.stringify([{ title: "Battle resolution" }]), linked_at: "2026-08-02T10:40:00.000Z",
      participant_id: "player-2", display_name: "Ben", seat_index: 2
    }],
    events: [
      { session_id: "game-1", event_type: "game_started", event_json: "{}", created_at: "2026-08-02T10:05:00.000Z" },
      { session_id: "game-1", event_type: "diagnostic_flag", event_json: JSON.stringify({ flag: "feels_decided", participantId: "player-1" }), created_at: "2026-08-02T10:55:00.000Z" }
    ]
  };

  return {
    prepare(sql) {
      const normalized = String(sql);
      let result;
      if (normalized.includes("FROM playtest_sessions") && !normalized.includes("JOIN")) result = rows.sessions;
      else if (normalized.includes("FROM playtest_participants")) result = rows.players;
      else if (normalized.includes("FROM playtest_session_results")) result = rows.results;
      else if (normalized.includes("FROM playtest_arbiter_links")) result = rows.arbiter;
      else if (normalized.includes("FROM playtest_session_events")) result = rows.events;
      else throw new Error(`Unexpected analysis SQL: ${normalized}`);
      return { all: async () => ({ results: result }) };
    }
  };
}

describe("tracked playtest analysis", () => {
  it("normalizes games, responses, results, questions, and events", async () => {
    const games = await readTrackedAnalysis(fixtureDb());
    expect(games).toHaveLength(1);
    expect(games[0].players).toHaveLength(2);
    expect(games[0].metadata.playMode).toBe("tts");
    expect(games[0].players[0].selectionReason).toBe("Negotiation before play");
    expect(games[0].players[0].response.fun).toBe(4);
    expect(games[0].players[0].response.feltDecidedWhen).toBe("late");
    expect(games[0].result.winnerParticipantId).toBe("player-1");
    expect(games[0].arbiterQuestions[0].question).toContain("Territory");
    expect(games[0].events[0].eventType).toBe("game_started");
    expect(games[0].events[1].data.flag).toBe("feels_decided");
  });

  it("computes aggregate ratings, replay interest, and faction results", async () => {
    const summary = summarizeGames(await readTrackedAnalysis(fixtureDb()));
    expect(summary.gameCount).toBe(1);
    expect(summary.responseCount).toBe(2);
    expect(summary.playAgainRate).toBe(1);
    expect(summary.ratingAverages.fun).toBe(4.5);
    expect(summary.averageDurationMinutes).toBe(72);
    expect(summary.factions.diplomats.wins).toBe(1);
    expect(summary.factions.military.wins).toBe(0);
    expect(summary.arbiterQuestionCount).toBe(1);
    expect(summary.playModes).toEqual({ tts: 1 });
    expect(summary.diagnosticFlags).toEqual({ feels_decided: 1 });
    expect(summary.decisionPoints).toEqual({ late: 1, at_end: 1 });
    expect(summary.agencyAfterDecided).toEqual({ some: 1, yes: 1 });
  });

  it("rejects aggregate access without the facilitator key", async () => {
    const response = await analysisWorker.fetch(
      new Request("https://worker.example/api/tracked-analysis"),
      { DB: fixtureDb(), SESSION_ADMIN_TOKEN: adminToken }
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Playtest analysis authorization failed" });
  });

  it("returns the protected compiled analysis with the facilitator key", async () => {
    const response = await analysisWorker.fetch(
      new Request("https://worker.example/api/tracked-analysis", {
        headers: { Authorization: `Bearer ${adminToken}` }
      }),
      { DB: fixtureDb(), SESSION_ADMIN_TOKEN: adminToken }
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.schemaVersion).toBe("gauntlet-tracked-analysis-v1");
    expect(payload.summary.responseCount).toBe(2);
    expect(payload.games[0].players[1].response.comments).toBe("Would replay.");
  });

  it("advertises compiled analysis through the existing health endpoint", async () => {
    const response = await analysisWorker.fetch(
      new Request("https://worker.example/health"),
      { DB: fixtureDb(), SESSION_ADMIN_TOKEN: adminToken }
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.compiledAnalysisSupported).toBe(true);
    expect(payload.analysisExportSchema).toBe("gauntlet-tracked-analysis-v1");
    expect(payload.trackedPlaytestsSupported).toBe(true);
  });
});
