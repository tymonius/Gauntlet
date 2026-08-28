#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../workers/playtest-sessions/src/tracked.js";

class LocalD1 {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    for (const migration of [
      "0001_rules_interactions.sql",
      "0002_review_export_checkpoints.sql",
      "0003_playtest_sessions.sql",
      "0004_event_game_sessions.sql",
      "0005_tracked_playtests.sql",
      "0010_playtest_decision_experience.sql"
    ]) {
      this.database.exec(readFileSync(new URL(`../rules-assistant/migrations/${migration}`, import.meta.url), "utf8"));
    }
  }

  prepare(sql) {
    const statement = this.database.prepare(sql);
    let values = [];
    const prepared = {
      bind(...args) {
        values = args;
        return prepared;
      },
      async first() {
        return statement.get(...values) ?? null;
      },
      async all() {
        return { success: true, results: statement.all(...values) };
      },
      async run() {
        const result = statement.run(...values);
        return {
          success: true,
          meta: {
            changes: Number(result.changes || 0),
            last_row_id: result.lastInsertRowid == null ? null : Number(result.lastInsertRowid)
          }
        };
      }
    };
    return prepared;
  }

  close() {
    this.database.close();
  }
}

const db = new LocalD1();
const origin = "https://gauntlet.run";
const env = {
  DB: db,
  SESSION_ADMIN_TOKEN: "formal-session-secret",
  PUBLIC_SITE_ORIGIN: origin,
  ALLOWED_ORIGINS: `${origin},http://localhost:8000,http://127.0.0.1:8000`,
  TRACKED_CREATION_SALT: "tracked-e2e-salt"
};

async function call(path, { method = "GET", body, headers: extraHeaders } = {}) {
  const headers = new Headers({
    Origin: origin,
    "CF-Connecting-IP": "203.0.113.10",
    "User-Agent": "Gauntlet tracked-playtest e2e",
    ...(extraHeaders || {})
  });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return worker.fetch(new Request(`https://sessions.example${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  }), env);
}

async function json(response, expectedStatus) {
  const payload = await response.json();
  assert.equal(
    response.status,
    expectedStatus,
    `Expected ${expectedStatus}; received ${response.status}: ${JSON.stringify(payload)}`
  );
  return payload;
}

function auth(player, value = {}) {
  return {
    ...value,
    participantId: player.participantId,
    participantToken: player.participantToken
  };
}

try {
  const health = await json(await call("/health"), 200);
  assert.equal(health.version, "v0.7.0");
  assert.equal(health.trackedPlaytestsSupported, true);
  assert.equal(health.digitalFeedbackSupported, true);
  assert.equal(health.automaticTrackedClosureSupported, true);

  const created = await json(await call("/api/tracked-games", {
    method: "POST",
    body: {
      displayName: "Alice",
      faction: "diplomats",
      leader: "ambassador",
      creationSource: "e2e",
      selectionSource: "standalone-onboarding",
      selectionReason: "Negotiation and political leverage sounded most interesting.",
      playMode: "tts"
    }
  }), 201);
  assert.equal(created.rulesVersion, "v0.7.0");
  assert.match(created.sheetSerial, /^G070-[A-Z0-9]{8}$/);
  assert.match(created.joinToken, /^[A-Za-z0-9_-]{24,96}$/);
  assert.match(created.participantToken, /^[A-Za-z0-9_-]{24,96}$/);
  assert.equal(created.seatIndex, 1);
  assert.equal(created.leader, "Ambassador");
  assert.equal(created.playMode, "tts");
  assert.equal(created.joinUrl, `${origin}/playtest/tracked/?code=${encodeURIComponent(created.joinToken)}`);
  assert.equal(created.reviewUrl, `${created.joinUrl}&host=${encodeURIComponent(created.hostKey)}`);

  const initial = await json(await call(`/api/tracked-games/${created.joinToken}`), 200);
  assert.equal(initial.rulesVersion, "v0.7.0");
  assert.equal(initial.lifecycleState, "joining");
  assert.equal(initial.playMode, "tts");
  assert.equal(initial.playerCount, 1);
  assert.equal(initial.players[0].displayName, "Alice");
  assert.equal(initial.players[0].responseSubmitted, false);
  assert.equal(initial.resultSubmitted, false);
  assert.equal("participantToken" in initial.players[0], false);

  const playerTwo = await json(await call(`/api/tracked-games/${created.joinToken}/join`, {
    method: "POST",
    body: {
      displayName: "Ben",
      faction: "military",
      leader: "general",
      selectionReason: "I wanted direct battlefield pressure and movement."
    }
  }), 201);
  assert.equal(playerTwo.seatIndex, 2);
  assert.equal(playerTwo.leader, "General");
  assert.equal(playerTwo.session.lifecycleState, "ready");

  const thirdPlayer = await json(await call(`/api/tracked-games/${created.joinToken}/join`, {
    method: "POST",
    body: {
      displayName: "Cara",
      faction: "mystics",
      leader: "alchemist",
      selectionReason: "The ritual progression sounded interesting."
    }
  }), 409);
  assert.match(thirdPlayer.error, /both player seats/i);

  const wrongStart = await json(await call(`/api/tracked-games/${created.joinToken}/event`, {
    method: "POST",
    body: {
      eventType: "game_started",
      data: {},
      participantId: created.participantId,
      participantToken: "wrong-token"
    }
  }), 403);
  assert.match(wrongStart.error, /access/i);

  const started = await json(await call(`/api/tracked-games/${created.joinToken}/event`, {
    method: "POST",
    body: auth(created, { eventType: "game_started", data: {} })
  }), 201);
  assert.equal(started.session.lifecycleState, "playing");

  const decisionFlag = await json(await call(`/api/tracked-games/${created.joinToken}/event`, {
    method: "POST",
    body: auth(created, {
      eventType: "diagnostic_flag",
      data: { flag: "feels_decided" }
    })
  }), 201);
  assert.equal(decisionFlag.eventType, "diagnostic_flag");

  const interactionId = "22222222-2222-4222-8222-222222222222";
  await db.prepare(`INSERT INTO rules_interactions
    (id, session_id, sequence_index, created_at, updated_at, question, answer,
     game_version, ruling_status, confidence, answer_mode, source_count)
    VALUES (?, ?, 1, ?, ?, ?, ?, 'v0.7.0', 'explicit', 'high', 'retrieval_only', 1)`)
    .bind(
      interactionId,
      "tracked-e2e-arbiter",
      "2026-08-16T00:00:00.000Z",
      "2026-08-16T00:00:00.000Z",
      "When is a Territory captured?",
      "At the start of your next turn, if you still occupy it."
    ).run();

  const linked = await json(await call(`/api/tracked-games/${created.joinToken}/arbiter`, {
    method: "POST",
    body: auth(playerTwo, {
      interactionId,
      classification: "explicit",
      question: "When is a Territory captured?",
      answer: "At the start of your next turn, if you still occupy it.",
      sources: [{ title: "v0.7.0 Rulebook", section: "Capture" }]
    })
  }), 201);
  assert.equal(linked.participantId, playerTwo.participantId);

  const result = await json(await call(`/api/tracked-games/${created.joinToken}/result`, {
    method: "POST",
    body: auth(created, {
      result: {
        completionStatus: "completed",
        firstPlayerParticipantId: created.participantId,
        winnerParticipantId: playerTwo.participantId,
        victoryRoute: "run_the_gauntlet",
        durationMinutes: 74,
        rounds: 9,
        battles: 7,
        packageUnmodified: true,
        variantUsed: false,
        productionIssue: "One card sleeve was hard to read under glare.",
        strongestMoment: "A late counterattack reversed the board.",
        confusingPoint: "We checked the timing of capture after occupation.",
        importantObservation: "The middle Territories created repeated pressure."
      }
    })
  }), 201);
  assert.equal(result.session.lifecycleState, "feedback");
  assert.equal(result.session.resultSubmitted, true);
  assert.equal(result.session.status, "open");

  const aliceResponse = await json(await call(`/api/tracked-games/${created.joinToken}/response`, {
    method: "POST",
    body: auth(created, {
      response: {
        expectationMatch: 5,
        leaderDistinction: 4,
        fun: 4,
        pacing: 4,
        meaningfulDecisions: 5,
        battleTension: 4,
        rulesClarity: 4,
        factionClarity: 4,
        tableOrganization: 3,
        feltDecidedWhen: "late",
        agencyAfterDecided: "some",
        decisiveCause: "A late counterattack changed which routes still felt plausible.",
        playAgain: true,
        comments: "Terms created the most memorable decisions."
      }
    })
  }), 201);
  assert.equal(aliceResponse.session.responseCount, 1);
  assert.equal(aliceResponse.session.status, "open");
  assert.equal(aliceResponse.session.players.find((player) => player.participantId === created.participantId).responseSubmitted, true);

  const publicAfterResponse = await json(await call(`/api/tracked-games/${created.joinToken}`), 200);
  assert.equal(publicAfterResponse.responseCount, 1);
  assert.equal(JSON.stringify(publicAfterResponse).includes("Terms created"), false);

  const wrongReview = await json(await call(`/api/tracked-games/${created.joinToken}/review?host=wrong`), 403);
  assert.match(wrongReview.error, /review key/i);

  const partialReview = await json(await call(`/api/tracked-games/${created.joinToken}/review?host=${encodeURIComponent(created.hostKey)}`), 200);
  assert.equal(partialReview.result.durationMinutes, 74);
  assert.equal(partialReview.responses.length, 1);
  assert.equal(partialReview.responses[0].factionInterest, "Negotiation and political leverage sounded most interesting.");
  assert.equal(partialReview.responses[0].comments, "Terms created the most memorable decisions.");
  assert.equal(partialReview.responses[0].feltDecidedWhen, "late");
  assert.equal(partialReview.responses[0].agencyAfterDecided, "some");
  assert.equal(partialReview.events.some((event) =>
    event.eventType === "diagnostic_flag" && event.data.flag === "feels_decided"
  ), true);
  assert.equal(partialReview.arbiterLinks.length, 1);
  assert.equal(partialReview.arbiterLinks[0].participant_id, playerTwo.participantId);

  const benResponse = await json(await call(`/api/tracked-games/${created.joinToken}/response`, {
    method: "POST",
    body: auth(playerTwo, {
      response: {
        expectationMatch: 5,
        leaderDistinction: 5,
        fun: 5,
        pacing: 4,
        meaningfulDecisions: 4,
        battleTension: 5,
        rulesClarity: 4,
        factionClarity: 5,
        tableOrganization: 4,
        feltDecidedWhen: "at_end",
        agencyAfterDecided: "yes",
        decisiveCause: "The final push was not secure until the last battle resolved.",
        playAgain: true,
        comments: "Rout made the final push exciting."
      }
    })
  }), 201);
  assert.equal(benResponse.session.status, "closed");
  assert.equal(benResponse.session.lifecycleState, "submitted");
  assert.equal(benResponse.session.responseCount, 2);
  assert.equal(benResponse.session.complete, true);

  const retiredJoin = await json(await call(`/api/tracked-games/${created.joinToken}/join`, {
    method: "POST",
    body: {
      displayName: "Late",
      faction: "financiers",
      leader: "banker",
      selectionReason: "Economic engine building."
    }
  }), 409);
  assert.match(retiredJoin.error, /closed/i);

  const retiredEvent = await json(await call(`/api/tracked-games/${created.joinToken}/event`, {
    method: "POST",
    body: auth(created, { eventType: "note", data: { note: "Too late" } })
  }), 409);
  assert.match(retiredEvent.error, /closed/i);

  const finalReview = await json(await call(`/api/tracked-games/${created.joinToken}/review`, {
    headers: { "X-Host-Key": created.hostKey }
  }), 200);
  assert.equal(finalReview.session.status, "closed");
  assert.equal(finalReview.responses.length, 2);
  assert.deepEqual(finalReview.responses.map((response) => response.displayName), ["Alice", "Ben"]);
  assert.equal(finalReview.events.some((event) => event.eventType === "tracked_session_submitted"), true);

  console.log("Validated v0.7.0 public tracked creation -> two player seats -> authenticated milestones -> player-attributed Arbiter linkage -> shared result -> two private responses -> automatic closure -> private review/export data.");
} finally {
  db.close();
}
