import { expect, test } from "vitest";
import worker, {
  sanitizePlaytestContext,
  sanitizeSessionId
} from "./worker-v061.js";
import {
  interactionsToCsv,
  isAdminAuthorized
} from "./worker.js";

test("preserves valid anonymous session identifiers", () => {
  expect(sanitizeSessionId("session_12345678")).toBe("session_12345678");
});

test("replaces invalid session identifiers", () => {
  const value = sanitizeSessionId("bad id");
  expect(value).toMatch(/^[0-9a-f-]{36}$/i);
});

test("normalizes valid formal-playtest context without accepting arbitrary identifiers", () => {
  expect(sanitizePlaytestContext({
    playtestSessionId: "123e4567-e89b-42d3-a456-426614174000",
    sheetSerial: "g061-abcd23"
  })).toEqual({
    playtestSessionId: "123e4567-e89b-42d3-a456-426614174000",
    sheetSerial: "G061-ABCD23"
  });
  expect(sanitizePlaytestContext({
    playtestSessionId: "not-a-session",
    sheetSerial: "old-sheet"
  })).toEqual({ playtestSessionId: null, sheetSerial: null });
});

test("uses constant-shape bearer-token authorization", async () => {
  const request = new Request("https://rules.example/api/admin/summary", {
    headers: { Authorization: "Bearer correct-token" }
  });
  expect(await isAdminAuthorized(request, { ADMIN_TOKEN: "correct-token" })).toBe(true);
  expect(await isAdminAuthorized(request, { ADMIN_TOKEN: "wrong-token" })).toBe(false);
});

test("CSV export quotes commas, quotes, and newlines", () => {
  const csv = interactionsToCsv([{
    id: "one",
    question: "Can I move, then battle?",
    answer: "He said \"yes\".\nThen explained why."
  }]);
  expect(csv).toContain('"Can I move, then battle?"');
  expect(csv).toContain('"He said ""yes"".\nThen explained why."');
});

test("serves the private review shell without exposing data", async () => {
  const response = await worker.fetch(new Request("https://rules.example/admin"), {});
  expect(response.status).toBe(200);
  expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  const html = await response.text();
  expect(html).toContain("Rules interaction review");
  expect(html).toContain("Review with ChatGPT");
  expect(html).toContain("gauntlet.rules-review-bundle.v1");
  expect(html).toContain("anonymous session identifiers");
});

test("reports the governing v0.6.1 worker and optional logging bindings", async () => {
  const response = await worker.fetch(new Request("https://rules.example/health"), {});
  const payload = await response.json();
  expect(payload.version).toBe("v0.6.1");
  expect(payload.interactionLogging).toBe(false);
  expect(payload.playtestLinking).toBe(false);
});

test("rejects requests for a different rules version before retrieval", async () => {
  const response = await worker.fetch(new Request("https://rules.example/api/rules", {
    method: "POST",
    headers: {
      Origin: "https://gauntlet.run",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question: "Where does a Gambit go?",
      rulesVersion: "v0.6.2"
    })
  }), {
    OPENAI_API_KEY: "test-key",
    ALLOWED_ORIGINS: "https://gauntlet.run"
  });
  expect(response.status).toBe(409);
  expect((await response.json()).error).toContain("v0.6.1");
});
