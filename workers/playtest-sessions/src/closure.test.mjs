import { describe, expect, it } from "vitest";
import closureWorker from "./closure.js";

const token = "abcdefghijklmnopqrstuvwxYZ012345";
const hostKey = "host-key-abcdefghijklmnopqrstuvwxyz012345";

async function digest(value) {
  const bytes = new TextEncoder().encode(String(value));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function closureDb() {
  const session = {
    id: "game-1",
    token_hash: await digest(token),
    host_key_hash: await digest(hostKey),
    sheet_serial: "G061-CLOSE01",
    rules_version: "v0.6.1",
    status: "open",
    created_at: "2026-08-03T01:00:00.000Z",
    closed_at: null,
    metadata_json: JSON.stringify({ mode: "tracked", collectionMode: "live-tracked" }),
    session_kind: "game",
    event_session_id: null
  };
  const events = [];

  return {
    session,
    events,
    prepare(sql) {
      const statement = String(sql);
      return {
        bind(...args) {
          return {
            async first() {
              if (statement.includes("SELECT id, status, host_key_hash, metadata_json")) {
                return args[0] === session.token_hash ? {
                  id: session.id,
                  status: session.status,
                  host_key_hash: session.host_key_hash,
                  metadata_json: session.metadata_json
                } : null;
              }
              if (statement.includes("SELECT id, token_hash, host_key_hash")) {
                return args[0] === session.token_hash ? { ...session } : null;
              }
              if (statement.includes("FROM playtest_session_results")) return null;
              if (statement.includes("SUM(CASE WHEN event_type = 'game_started'")) {
                return { started: 0, event_count: events.length };
              }
              if (statement.includes("FROM playtest_arbiter_links")) return { count: 0 };
              throw new Error(`Unexpected first SQL: ${statement}`);
            },
            async all() {
              if (statement.includes("FROM playtest_participants p")) {
                return { results: [{
                  participant_id: "11111111-1111-4111-8111-111111111111",
                  display_name: "Alice",
                  seat_index: 1,
                  faction: "diplomats",
                  leader: "Ambassador",
                  joined_at: "2026-08-03T01:00:00.000Z",
                  response_submitted: 1
                }] };
              }
              throw new Error(`Unexpected all SQL: ${statement}`);
            },
            async run() {
              if (statement.includes("UPDATE playtest_sessions SET status = 'closed'")) {
                session.status = "closed";
                session.closed_at = args[0];
                session.metadata_json = args[1];
                return { meta: { changes: 1 } };
              }
              if (statement.includes("INSERT INTO playtest_session_events")) {
                events.push({ id: args[0], sessionId: args[1], eventType: args[2], data: JSON.parse(args[3]), createdAt: args[4] });
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

function closeRequest(disposition, key = hostKey) {
  return new Request(`https://worker.example/api/tracked-games/${token}/close`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Host-Key": key },
    body: JSON.stringify({ disposition, reason: "Table is finished." })
  });
}

describe("manual tracked-session closure", () => {
  it("closes an incomplete session while preserving it for analysis", async () => {
    const db = await closureDb();
    const response = await closureWorker.fetch(closeRequest("close"), { DB: db });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.session.status).toBe("closed");
    expect(payload.session.lifecycleState).toBe("closed");
    expect(payload.session.closureType).toBe("manual-close");
    expect(payload.session.analysisEligible).toBe(true);
    expect(payload.session.complete).toBe(false);
    expect(db.events[0].eventType).toBe("tracked_session_closed_manually");
  });

  it("cancels a session and marks it ineligible for compiled analysis", async () => {
    const db = await closureDb();
    const response = await closureWorker.fetch(closeRequest("cancel"), { DB: db });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.session.lifecycleState).toBe("cancelled");
    expect(payload.session.closureType).toBe("cancelled");
    expect(payload.session.analysisEligible).toBe(false);
    expect(JSON.parse(db.session.metadata_json).cancelled).toBe(true);
    expect(db.events[0].eventType).toBe("tracked_session_cancelled");
  });

  it("rejects closure without the creator review key", async () => {
    const db = await closureDb();
    const response = await closureWorker.fetch(closeRequest("close", "wrong-key"), { DB: db });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Only the session creator can close or cancel this session" });
    expect(db.session.status).toBe("open");
  });
});
