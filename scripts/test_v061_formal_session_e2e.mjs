#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../workers/playtest-sessions/src/index.js";

class LocalD1 {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    this.database.exec(readFileSync(new URL("../rules-assistant/migrations/0001_rules_interactions.sql", import.meta.url), "utf8"));
    this.database.exec(readFileSync(new URL("../rules-assistant/migrations/0002_playtest_sessions.sql", import.meta.url), "utf8"));
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

async function call(path, { method = "GET", body, authorization } = {}) {
  const headers = new Headers({ Origin: origin });
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
  assert.equal(response.status, expectedStatus, `Expected ${expectedStatus}; received ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

try {
  const health = await json(await call("/health"), 200);
  assert.deepEqual(health, {
    ok: true,
    service: "gauntlet-playtest-sessions",
    version: "v0.6.1",
    database: true,
    sessionCreationConfigured: true
  });

  const created = await json(await call("/api/sessions", {
    method: "POST",
    authorization: adminToken,
    body: {
      rulesVersion: "v0.6.1",
      sheetSerial: "G061-E2E001",
      metadata: { batch: "automated-e2e", sheetIndex: 1, formal: true }
    }
  }), 201);

  assert.equal(created.sheetSerial, "G061-E2E001");
  assert.equal(created.status, "open");
  assert.match(created.joinToken, /^[A-Za-z0-9_-]{24,96}$/);
  assert.match(created.hostKey, /^[A-Za-z0-9_-]{24,96}$/);
  assert.equal(created.joinUrl, `${origin}/playtest/session/?code=${encodeURIComponent(created.joinToken)}`);
  assert.equal(created.hostUrl, `${created.joinUrl}&host=${encodeURIComponent(created.hostKey)}`);

  const duplicate = await json(await call("/api/sessions", {
    method: "POST",
    authorization: adminToken,
    body: { rulesVersion: "v0.6.1", sheetSerial: "G061-E2E001" }
  }), 409);
  assert.match(duplicate.error, /already assigned/i);

  const opened = await json(await call(`/api/sessions/${created.joinToken}`), 200);
  assert.equal(opened.status, "open");
  assert.equal(opened.participantCount, 0);
  assert.equal(opened.arbiterQuestionCount, 0);

  const joined = await json(await call(`/api/sessions/${created.joinToken}/join`, {
    method: "POST",
    body: { displayName: "Automated Player", role: "player" }
  }), 201);
  assert.match(joined.participantId, /^[0-9a-f-]{36}$/i);

  await json(await call(`/api/sessions/${created.joinToken}/event`, {
    method: "POST",
    body: { eventType: "game_started", data: { source: "coded-sheet-e2e" } }
  }), 201);

  const interactionId = "11111111-1111-4111-8111-111111111111";
  await db.prepare(`INSERT INTO rules_interactions
    (id, session_id, sequence_index, created_at, updated_at, question, answer,
     game_version, ruling_status, confidence, answer_mode, source_count)
    VALUES (?, ?, 1, ?, ?, ?, ?, 'v0.6.1', 'explicit', 'high', 'retrieval_only', 1)`)
    .bind(
      interactionId,
      "arbiter-e2e-session",
      "2026-07-30T00:00:00.000Z",
      "2026-07-30T00:00:00.000Z",
      "Where does a Gambit go?",
      "A Gambit normally goes to its owner's Graveyard during the Aftermath."
    ).run();

  const linked = await json(await call(`/api/sessions/${created.joinToken}/arbiter`, {
    method: "POST",
    body: {
      interactionId,
      classification: "explicit",
      question: "Where does a Gambit go?",
      answer: "A Gambit normally goes to its owner's Graveyard during the Aftermath.",
      sources: [{ title: "v0.6.1 Rulebook", section: "Aftermath" }]
    }
  }), 201);
  assert.equal(linked.ok, true);

  const afterActivity = await json(await call(`/api/sessions/${created.joinToken}`), 200);
  assert.equal(afterActivity.participantCount, 1);
  assert.equal(afterActivity.arbiterQuestionCount, 1);

  const interaction = await db.prepare(
    "SELECT playtest_session_id, sheet_serial FROM rules_interactions WHERE id = ?"
  ).bind(interactionId).first();
  assert.equal(interaction.playtest_session_id, created.sessionId);
  assert.equal(interaction.sheet_serial, created.sheetSerial);

  const wrongClose = await json(await call(`/api/sessions/${created.joinToken}/close`, {
    method: "POST",
    body: { hostKey: "wrong-host-key" }
  }), 403);
  assert.match(wrongClose.error, /invalid host key/i);

  const closed = await json(await call(`/api/sessions/${created.joinToken}/close`, {
    method: "POST",
    body: { hostKey: created.hostKey }
  }), 200);
  assert.equal(closed.status, "closed");
  assert.ok(closed.closedAt);

  const retired = await json(await call(`/api/sessions/${created.joinToken}`), 200);
  assert.equal(retired.status, "closed");

  const rejectedJoin = await json(await call(`/api/sessions/${created.joinToken}/join`, {
    method: "POST",
    body: { displayName: "Late Player", role: "player" }
  }), 409);
  assert.match(rejectedJoin.error, /closed/i);

  const rejectedEvent = await json(await call(`/api/sessions/${created.joinToken}/event`, {
    method: "POST",
    body: { eventType: "note", data: { note: "should not persist" } }
  }), 409);
  assert.match(rejectedEvent.error, /closed/i);

  const events = db.database.prepare(
    "SELECT event_type FROM playtest_session_events WHERE session_id = ? ORDER BY created_at, rowid"
  ).all(created.sessionId).map(row => row.event_type);
  for (const expected of [
    "session_created",
    "participant_joined",
    "game_started",
    "arbiter_linked",
    "session_closed"
  ]) {
    assert.ok(events.includes(expected), `Missing lifecycle event: ${expected}`);
  }

  console.log("Validated formal coded-sheet lifecycle: create -> join -> event -> Arbiter link -> close -> retired code rejection.");
} finally {
  db.close();
}
