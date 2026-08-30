#!/usr/bin/env node

import assert from "node:assert/strict";
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
    version: "v0.6.1",
    database: true,
    sessionCreationConfigured: true,
    onboardingSupported: true,
    eventGamesSupported: true,
    playerAttributionSupported: true
  });

  const event = await json(await call("/api/sessions", {
    method: "POST",
    authorization: adminToken,
    body: {
      rulesVersion: "v0.6.1",
      sheetSerial: "G061-EVENT01",
      sessionKind: "event",
      metadata: { label: "Automated game night" }
    }
  }), 201);
  assert.equal(event.sessionKind, "event");
  assert.equal(event.onboardingUrl, `${origin}/playtest/onboarding/?code=${encodeURIComponent(event.joinToken)}`);
  assert.equal(event.onboardingHostUrl, `${event.onboardingUrl}&host=${encodeURIComponent(event.hostKey)}`);

  const playerOne = await json(await call(`/api/sessions/${event.joinToken}/join`, {
    method: "POST",
    body: { displayName: "Alice", role: "player", purpose: "onboarding" }
  }), 201);
  assert.match(playerOne.participantId, /^[0-9a-f-]{36}$/i);
  assert.match(playerOne.participantToken, /^[A-Za-z0-9_-]{24,96}$/);

  const playerTwo = await json(await call(`/api/sessions/${event.joinToken}/join`, {
    method: "POST",
    body: { displayName: "Ben", role: "player", purpose: "onboarding" }
  }), 201);
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

  const eventRead = await json(await call(`/api/sessions/${event.joinToken}`), 200);
  assert.equal(eventRead.sessionKind, "event");
  assert.equal(eventRead.participantCount, 2);

  const eventGameActivity = await json(await call(`/api/sessions/${event.joinToken}/event`, {
    method: "POST",
    body: { eventType: "game_started", data: {} }
  }), 409);
  assert.match(eventGameActivity.error, /table game session/i);

  const wrongGameList = await json(await call(`/api/sessions/${event.joinToken}/games`, {
    headers: { "X-Host-Key": "wrong-host-key" }
  }), 403);
  assert.match(wrongGameList.error, /invalid host key/i);

  const createdGames = await json(await call(`/api/sessions/${event.joinToken}/games`, {
    method: "POST",
    headers: { "X-Host-Key": event.hostKey },
    body: { count: 2, metadata: { source: "automated-event-e2e" } }
  }), 201);
  assert.equal(createdGames.games.length, 2);
  const [gameOne, gameTwo] = createdGames.games;
  assert.equal(gameOne.sessionKind, "game");
  assert.equal(gameOne.eventSessionId, event.sessionId);
  assert.match(gameOne.joinUrl, /\/playtest\/session\/\?code=/);

  const roster = await json(await call(`/api/sessions/${gameOne.joinToken}/event-participants`), 200);
  assert.equal(roster.event.sessionId, event.sessionId);
  assert.deepEqual(
    roster.participants.map((participant) => [participant.displayName, participant.faction, participant.leader]),
    [
      ["Alice", "diplomats", "Ambassador"],
      ["Ben", "military", "General"]
    ]
  );

  const wrongIdentity = await json(await call(`/api/sessions/${gameOne.joinToken}/join`, {
    method: "POST",
    body: {
      role: "player",
      eventParticipantId: playerOne.participantId,
      participantToken: "wrong-identity-token"
    }
  }), 403);
  assert.match(wrongIdentity.error, /identity/i);

  const seatOne = await json(await call(`/api/sessions/${gameOne.joinToken}/join`, {
    method: "POST",
    body: {
      role: "player",
      eventParticipantId: playerOne.participantId,
      participantToken: playerOne.participantToken
    }
  }), 201);
  assert.equal(seatOne.seatIndex, 1);
  assert.equal(seatOne.displayName, "Alice");
  assert.equal(seatOne.leader, "Ambassador");
  assert.equal(seatOne.identityMethod, "saved_identity");

  const repeatedJoin = await json(await call(`/api/sessions/${gameOne.joinToken}/join`, {
    method: "POST",
    body: {
      role: "player",
      eventParticipantId: playerOne.participantId,
      participantToken: playerOne.participantToken
    }
  }), 200);
  assert.equal(repeatedJoin.participantId, seatOne.participantId);
  assert.equal(repeatedJoin.seatIndex, 1);

  const seatTwo = await json(await call(`/api/sessions/${gameOne.joinToken}/join`, {
    method: "POST",
    body: {
      role: "player",
      eventParticipantId: playerTwo.participantId,
      confirmedRosterSelection: true
    }
  }), 201);
  assert.equal(seatTwo.seatIndex, 2);
  assert.equal(seatTwo.displayName, "Ben");
  assert.equal(seatTwo.identityMethod, "roster_selection");

  const thirdSeat = await json(await call(`/api/sessions/${gameOne.joinToken}/join`, {
    method: "POST",
    body: {
      role: "player",
      displayName: "Late Guest",
      faction: "mystics",
      leader: "Alchemist"
    }
  }), 409);
  assert.match(thirdSeat.error, /both player seats/i);

  await json(await call(`/api/sessions/${gameOne.joinToken}/event`, {
    method: "POST",
    body: { eventType: "game_started", data: { participantId: seatOne.participantId } }
  }), 201);

  const interactionId = "11111111-1111-4111-8111-111111111111";
  await db.prepare(`INSERT INTO rules_interactions
    (id, session_id, sequence_index, created_at, updated_at, question, answer,
     game_version, ruling_status, confidence, answer_mode, source_count)
    VALUES (?, ?, 1, ?, ?, ?, ?, 'v0.6.1', 'explicit', 'high', 'retrieval_only', 1)`)
    .bind(
      interactionId,
      "arbiter-event-game-e2e",
      "2026-07-31T00:00:00.000Z",
      "2026-07-31T00:00:00.000Z",
      "Where does a Gambit go?",
      "A Gambit normally goes to its owner's Graveyard during the Aftermath."
    ).run();

  const missingAsker = await json(await call(`/api/sessions/${gameOne.joinToken}/arbiter`, {
    method: "POST",
    body: { interactionId }
  }), 400);
  assert.match(missingAsker.error, /join the game/i);

  const linked = await json(await call(`/api/sessions/${gameOne.joinToken}/arbiter`, {
    method: "POST",
    body: {
      interactionId,
      participantId: seatOne.participantId,
      classification: "explicit",
      question: "Where does a Gambit go?",
      answer: "A Gambit normally goes to its owner's Graveyard during the Aftermath.",
      sources: [{ title: "v0.6.1 Rulebook", section: "Aftermath" }]
    }
  }), 201);
  assert.equal(linked.participantId, seatOne.participantId);

  const gameAfterActivity = await json(await call(`/api/sessions/${gameOne.joinToken}`), 200);
  assert.equal(gameAfterActivity.participantCount, 2);
  assert.equal(gameAfterActivity.arbiterQuestionCount, 1);
  assert.deepEqual(
    gameAfterActivity.players.map((player) => [player.seatIndex, player.displayName, player.leader]),
    [[1, "Alice", "Ambassador"], [2, "Ben", "General"]]
  );

  const linkedInteraction = await db.prepare(
    `SELECT playtest_session_id, sheet_serial, playtest_participant_id
       FROM rules_interactions WHERE id = ?`
  ).bind(interactionId).first();
  assert.equal(linkedInteraction.playtest_session_id, gameOne.sessionId);
  assert.equal(linkedInteraction.sheet_serial, gameOne.sheetSerial);
  assert.equal(linkedInteraction.playtest_participant_id, seatOne.participantId);

  const eventArbiter = await json(await call(`/api/sessions/${event.joinToken}/arbiter`, {
    method: "POST",
    body: { interactionId, participantId: playerOne.participantId }
  }), 409);
  assert.match(eventArbiter.error, /table game session/i);

  const listedGames = await json(await call(`/api/sessions/${event.joinToken}/games`, {
    headers: { "X-Host-Key": event.hostKey }
  }), 200);
  assert.equal(listedGames.games.length, 2);
  assert.equal(listedGames.games[0].players.length, 2);
  assert.equal(listedGames.games[1].players.length, 0);

  const repeatGameSeat = await json(await call(`/api/sessions/${gameTwo.joinToken}/join`, {
    method: "POST",
    body: {
      role: "player",
      eventParticipantId: playerOne.participantId,
      participantToken: playerOne.participantToken
    }
  }), 201);
  assert.equal(repeatGameSeat.seatIndex, 1);
  assert.notEqual(repeatGameSeat.participantId, seatOne.participantId);

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

  const closedEvent = await json(await call(`/api/sessions/${event.joinToken}/close`, {
    method: "POST",
    body: { hostKey: event.hostKey }
  }), 200);
  assert.equal(closedEvent.status, "closed");

  const gameAfterRegistrationClosed = await json(await call(`/api/sessions/${event.joinToken}/games`, {
    method: "POST",
    headers: { "X-Host-Key": event.hostKey },
    body: { count: 1 }
  }), 201);
  assert.equal(gameAfterRegistrationClosed.games.length, 1);
  assert.equal(gameAfterRegistrationClosed.games[0].eventSessionId, event.sessionId);

  const closedRoster = await json(await call(`/api/sessions/${event.joinToken}/onboarding`, {
    headers: { "X-Host-Key": event.hostKey }
  }), 200);
  assert.equal(closedRoster.choices.length, 2);

  const standalone = await json(await call("/api/sessions", {
    method: "POST",
    authorization: adminToken,
    body: {
      rulesVersion: "v0.6.1",
      sheetSerial: "G061-STD001",
      metadata: { formal: true }
    }
  }), 201);
  assert.equal(standalone.sessionKind, "game");
  assert.equal(standalone.eventSessionId, null);
  const standaloneJoin = await json(await call(`/api/sessions/${standalone.joinToken}/join`, {
    method: "POST",
    body: { displayName: "Standalone Player", role: "player" }
  }), 201);
  assert.match(standaloneJoin.participantId, /^[0-9a-f-]{36}$/i);
  assert.equal(standaloneJoin.participantToken, undefined);

  console.log("Validated event onboarding -> unique table games -> two player seats -> player-attributed Arbiter records -> independent game and event closure, while preserving standalone coded sheets.");
} finally {
  db.close();
}
