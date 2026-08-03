import { describe, expect, it } from "vitest";
import journalWorker from "./journal.js";

const token = "abcdefghijklmnopqrstuvwxYZ012345";
const participantId = "11111111-1111-4111-8111-111111111111";
const participantToken = "player-one-access-token-abcdefghijklmnopqrstuvwxyz";

function journalDb() {
  const events = [{
    id: "other-note",
    event_type: "player_note",
    event_json: JSON.stringify({
      participantId: "22222222-2222-4222-8222-222222222222",
      category: "balance_concern",
      note: "This belongs to the other player."
    }),
    created_at: "2026-08-02T20:05:00.000Z"
  }];

  return {
    events,
    prepare(sql) {
      const statement = String(sql);
      return {
        bind(...args) {
          return {
            async first() {
              if (statement.includes("FROM playtest_sessions")) {
                return {
                  id: "game-1",
                  status: "open",
                  created_at: "2026-08-02T20:00:00.000Z",
                  metadata_json: JSON.stringify({ mode: "tracked", collectionMode: "live-tracked" })
                };
              }
              if (statement.includes("FROM playtest_participants")) {
                return { id: participantId, display_name: "Alice", seat_index: 1 };
              }
              if (statement.includes("json_extract(event_json, '$.clientNoteId')")) {
                const requestedClientId = args[2];
                const duplicate = events.find((row) => JSON.parse(row.event_json).clientNoteId === requestedClientId);
                return duplicate ? { id: duplicate.id } : null;
              }
              if (statement.includes("event_type = 'game_started'")) {
                return { created_at: "2026-08-02T20:00:00.000Z" };
              }
              throw new Error(`Unexpected first SQL: ${statement}`);
            },
            async all() {
              if (statement.includes("event_type IN ('player_note', 'note')")) return { results: events };
              throw new Error(`Unexpected all SQL: ${statement}`);
            },
            async run() {
              if (statement.includes("INSERT INTO playtest_session_events")) {
                events.push({
                  id: args[0],
                  event_type: args[2],
                  event_json: args[3],
                  created_at: args[4]
                });
                return { meta: { changes: 1 } };
              }
              throw new Error(`Unexpected run SQL: ${statement}`);
            }
          };
        }
      };
    }
  };
}

function request(method, body = null) {
  return new Request(`https://worker.example/api/tracked-games/${token}/notes`, {
    method,
    headers: {
      "content-type": "application/json",
      "X-Participant-Id": participantId,
      "X-Participant-Token": participantToken
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

describe("playtest journal worker", () => {
  it("returns only the authenticated player's private notes", async () => {
    const db = journalDb();
    db.events.push({
      id: "own-note",
      event_type: "player_note",
      event_json: JSON.stringify({
        participantId,
        clientNoteId: "client-own",
        category: "rules_confusion",
        note: "We were unsure when the Territory changed hands.",
        round: 3,
        elapsedMinutes: 24,
        source: "live"
      }),
      created_at: "2026-08-02T20:24:00.000Z"
    });

    const response = await journalWorker.fetch(request("GET"), { DB: db });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.notes).toHaveLength(1);
    expect(payload.notes[0].category).toBe("rules_confusion");
    expect(payload.notes[0].note).toContain("Territory");
  });

  it("stores categorized notes with participant attribution and deduplicates offline retries", async () => {
    const db = journalDb();
    const body = {
      clientNoteId: "offline-note-1",
      category: "great_moment",
      round: 4,
      elapsedMinutes: 31,
      note: "The reserve commitment produced a dramatic reversal."
    };

    const first = await journalWorker.fetch(request("POST", body), { DB: db });
    expect(first.status).toBe(201);
    const firstPayload = await first.json();
    expect(firstPayload.notes).toHaveLength(1);
    expect(firstPayload.notes[0].source).toBe("live");

    const retry = await journalWorker.fetch(request("POST", body), { DB: db });
    expect(retry.status).toBe(200);
    const retryPayload = await retry.json();
    expect(retryPayload.duplicate).toBe(true);
    expect(retryPayload.notes).toHaveLength(1);
  });

  it("rejects unsupported note categories", async () => {
    const response = await journalWorker.fetch(request("POST", {
      clientNoteId: "bad-category",
      category: "designer_fix",
      note: "Change the rule immediately."
    }), { DB: journalDb() });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Choose a valid note category" });
  });
});
