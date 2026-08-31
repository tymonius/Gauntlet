#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../workers/playtest-sessions/src/index.js";

class LocalD1 {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    for (const migration of [
      "0001_rules_interactions.sql",
      "0002_review_export_checkpoints.sql",
      "0003_playtest_sessions.sql",
      "0004_event_game_sessions.sql"
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
const adminToken = "formal-session-e2e-admin-token";
const env = {
  DB: db,
  SESSION_ADMIN_TOKEN: adminToken,
  PUBLIC_SITE_ORIGIN: origin,
  ALLOWED_ORIGINS: `${origin},http://localhost:8000,http://127.0.0.1:8000`
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function call(path, { method = "GET", body, authorization, headers: extraHeaders } = {}) {
  const headers = new Headers({ Origin: origin, ...(extraHeaders || {}) });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (authorization) headers.set("Authorization", `Bearer ${authorization}`);
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

async function submitChoice(token, participant, choice) {
  return json(await call(`/api/sessions/${token}/event`, {
    method: "POST",
    body: {
      eventType: "onboarding_choice",
      data: {
        participantId: participant.participantId,
        displayName: choice.displayName,
        faction: choice.faction,
        leader: choice.leader,
        reason: choice.reason,
        introConfirmed: true
      }
    }
  }), 201);
}

try {
  const health = await json(await call("/health"), 200);
  assert.deepEqual(health, {
    ok: true,
    service: "gauntlet-playtest-sessions",
    version: "v0.7.0",
    database: true,
    sessionCreationConfigured: true,
    onboardingSupported: true,
    eventGamesSupported: true,
    playerAttributionSupported: true
  });

  const rejectedLegacyCreation = await json(await call("/api/sessions", {
    method: "POST",
    authorization: adminToken,
    body: { rulesVersion: "v0.6.1" }
  }), 400);
  assert.match(rejectedLegacyCreation.error, /v0\.7\.0 sessions only/i);

  const event = await json(await call("/api/sessions", {
    method: "POST",
    authorization: adminToken,
    body: {
      rulesVersion: "v0.7.0",
      sessionKind: "event",
      metadata: { label: "Automated v0.7.0 game night" }
    }
  }), 201);
  assert.equal(event.rulesVersion, "v0.7.0");
  assert.equal(event.sessionKind, "event");
  assert.match(event.sheetSerial, /^EV070-[A-Z0-9]{8}$/);
  assert.equal(event.onboardingUrl, `${origin}/playtest/onboarding/?code=${encodeURIComponent(event.joinToken)}`);
  assert.equal(event.onboardingHostUrl, `${event.onboardingUrl}&host=${encodeURIComponent(event.hostKey)}`);

  const playerOne = await json(await call(`/api/sessions/${event.joinToken}/join`, {
    method: "POST",
    body: { displayName: "Alice", role: "player", purpose: "onboarding" }
  }), 201);
  const playerTwo = await json(await call(`/api/sessions/${event.joinToken}/join`, {
    method: "POST",
    body: { displayName: "Ben", role: "player", purpose: "onboarding" }
  }), 201);
  assert.match(playerOne.participantToken, /^[A-Za-z0-9_-]{24,96}$/);
  assert.match(playerTwo.participantToken, /^[A-Za-z0-9_-]{24,96}$/);

  await submitChoice(event.joinToken, playerOne, {
    displayName: "Alice",
    faction: "diplomats",
    leader: "Ambassador",
    reason: "Negotiation"
  });
  await submitChoice(event.joinToken, playerTwo, {
    displayName: "Ben",
    faction: "military",
    leader: "General",
    reason: "Battlefield pressure"
  });

  const createdGames = await json(await call(`/api/sessions/${event.joinToken}/games`, {
    method: "POST",
    headers: { "X-Host-Key": event.hostKey },
    body: { count: 2, metadata: { source: "automated-v070-event-e2e" } }
  }), 201);
  assert.equal(createdGames.games.length, 2);
  const [gameOne, gameTwo] = createdGames.games;
  for (const game of createdGames.games) {
    assert.equal(game.rulesVersion, "v0.7.0");
    assert.equal(game.sessionKind, "game");
    assert.equal(game.eventSessionId, event.sessionId);
    assert.match(game.sheetSerial, /^G070-[A-Z0-9]{8}$/);
  }

  const roster = await json(await call(`/api/sessions/${gameOne.joinToken}/event-participants`), 200);
  assert.deepEqual(
    roster.participants.map((participant) => [participant.displayName, participant.faction, participant.leader]),
    [
      ["Alice", "diplomats", "Ambassador"],
      ["Ben", "military", "General"]
    ]
  );

  const seatOne = await json(await call(`/api/sessions/${gameOne.joinToken}/join`, {
    method: "POST",
    body: {
      role: "player",
      eventParticipantId: playerOne.participantId,
      participantToken: playerOne.participantToken
    }
  }), 201);
  const seatTwo = await json(await call(`/api/sessions/${gameOne.joinToken}/join`, {
    method: "POST",
    body: {
      role: "player",
      eventParticipantId: playerTwo.participantId,
      confirmedRosterSelection: true
    }
  }), 201);
  assert.equal(seatOne.seatIndex, 1);
  assert.equal(seatTwo.seatIndex, 2);

  const interactionId = "11111111-1111-4111-8111-111111111111";
  await db.prepare(`INSERT INTO rules_interactions
    (id, session_id, sequence_index, created_at, updated_at, question, answer,
     game_version, ruling_status, confidence, answer_mode, source_count)
    VALUES (?, ?, 1, ?, ?, ?, ?, 'v0.7.0', 'explicit', 'high', 'retrieval_only', 1)`)
    .bind(
      interactionId,
      "arbiter-v070-event-game-e2e",
      "2026-08-16T00:00:00.000Z",
      "2026-08-16T00:00:00.000Z",
      "Where does a Gambit go?",
      "A Gambit normally goes to its owner's Graveyard during the Aftermath."
    ).run();

  const linked = await json(await call(`/api/sessions/${gameOne.joinToken}/arbiter`, {
    method: "POST",
    body: {
      interactionId,
      participantId: seatOne.participantId,
      classification: "explicit",
      question: "Where does a Gambit go?",
      answer: "A Gambit normally goes to its owner's Graveyard during the Aftermath.",
      sources: [{ title: "v0.7.0 Rulebook", section: "Aftermath" }]
    }
  }), 201);
  assert.equal(linked.participantId, seatOne.participantId);

  const gameAfterActivity = await json(await call(`/api/sessions/${gameOne.joinToken}`), 200);
  assert.equal(gameAfterActivity.rulesVersion, "v0.7.0");
  assert.equal(gameAfterActivity.participantCount, 2);
  assert.equal(gameAfterActivity.arbiterQuestionCount, 1);

  const closedGame = await json(await call(`/api/sessions/${event.joinToken}/games/${gameOne.sessionId}/close`, {
    method: "POST",
    headers: { "X-Host-Key": event.hostKey },
    body: {}
  }), 200);
  assert.equal(closedGame.status, "closed");

  const retiredJoin = await json(await call(`/api/sessions/${gameOne.joinToken}/join`, {
    method: "POST",
    body: {
      role: "player",
      eventParticipantId: playerOne.participantId,
      participantToken: playerOne.participantToken
    }
  }), 409);
  assert.match(retiredJoin.error, /closed/i);

  const repeatGameSeat = await json(await call(`/api/sessions/${gameTwo.joinToken}/join`, {
    method: "POST",
    body: {
      role: "player",
      eventParticipantId: playerOne.participantId,
      participantToken: playerOne.participantToken
    }
  }), 201);
  assert.equal(repeatGameSeat.seatIndex, 1);

  const standalone = await json(await call("/api/sessions", {
    method: "POST",
    authorization: adminToken,
    body: {
      rulesVersion: "v0.7.0",
      sheetSerial: "G070-STD001",
      metadata: { formal: true }
    }
  }), 201);
  assert.equal(standalone.rulesVersion, "v0.7.0");
  assert.equal(standalone.sheetSerial, "G070-STD001");
  assert.equal(standalone.sessionKind, "game");

  const legacyToken = "legacy-v061-session-token-000001";
  const legacyHostKey = "legacy-v061-host-key-000001";
  const legacySessionId = "22222222-2222-4222-8222-222222222222";
  await db.prepare(`INSERT INTO playtest_sessions
    (id, token_hash, host_key_hash, sheet_serial, rules_version, status, created_at,
     metadata_json, session_kind, event_session_id)
    VALUES (?, ?, ?, 'G061-LEGACY1', 'v0.6.1', 'closed', ?, '{}', 'game', NULL)`)
    .bind(
      legacySessionId,
      sha256(legacyToken),
      sha256(legacyHostKey),
      "2026-07-31T00:00:00.000Z"
    ).run();

  const legacyRead = await json(await call(`/api/sessions/${legacyToken}`), 200);
  assert.equal(legacyRead.sessionId, legacySessionId);
  assert.equal(legacyRead.rulesVersion, "v0.6.1");
  assert.equal(legacyRead.sheetSerial, "G061-LEGACY1");
  assert.equal(legacyRead.status, "closed");

  console.log("Validated v0.7.0 event and standalone creation, G070/EV070 serials, table-game onboarding and Arbiter linkage, closure, rejection of new v0.6.1 creation, and read compatibility for stored v0.6.1 sessions.");
} finally {
  db.close();
}
