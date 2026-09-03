import { expect, test } from "vitest";
import worker, { cleanSerial, sanitizeMetadata } from "./index.js";

const allowedEnv = {
  ALLOWED_ORIGINS: "https://gauntlet.run,http://localhost:8000"
};

test("reports service, rules version, and configuration state", async () => {
  const response = await worker.fetch(new Request("https://sessions.example/health"), {});
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    ok: true,
    service: "gauntlet-playtest-sessions",
    version: "v0.7.1",
    database: false,
    sessionCreationConfigured: false,
    onboardingSupported: true,
    eventGamesSupported: true,
    playerAttributionSupported: true
  });
});

test("rejects browser origins outside the configured allowlist", async () => {
  const response = await worker.fetch(new Request("https://sessions.example/health", {
    headers: { Origin: "https://malicious.example" }
  }), allowedEnv);
  expect(response.status).toBe(403);
  expect(response.headers.get("access-control-allow-origin")).toBeNull();
});

test("allows the production site and local playtest development origins", async () => {
  for (const origin of ["https://gauntlet.run", "http://localhost:8000"]) {
    const response = await worker.fetch(new Request("https://sessions.example/health", {
      headers: { Origin: origin }
    }), allowedEnv);
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
  }
});

test("does not expose session creation without a configured facilitator secret", async () => {
  const response = await worker.fetch(new Request("https://sessions.example/api/sessions", {
    method: "POST",
    headers: {
      Origin: "https://gauntlet.run",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ rulesVersion: "v0.7.1" })
  }), allowedEnv);
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain("not configured");
});

test("rejects an incorrect facilitator creation secret before touching D1", async () => {
  const response = await worker.fetch(new Request("https://sessions.example/api/sessions", {
    method: "POST",
    headers: {
      Origin: "https://gauntlet.run",
      Authorization: "Bearer wrong",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ rulesVersion: "v0.7.1" })
  }), {
    ...allowedEnv,
    SESSION_ADMIN_TOKEN: "correct"
  });
  expect(response.status).toBe(401);
});

test("normalizes and validates v0.7.1 sheet serials", () => {
  expect(cleanSerial("g071-abcd23")).toBe("G071-ABCD23");
  expect(() => cleanSerial("G061-ABCD23")).toThrow("Invalid v0.7.1 sheet serial");
  expect(() => cleanSerial("G071-I")).toThrow("Invalid v0.7.1 sheet serial");
});

test("limits session metadata to safe scalar values", () => {
  const metadata = sanitizeMetadata({
    label: "A".repeat(700),
    index: 3,
    formal: true,
    absent: null,
    nested: { should: "not persist" },
    list: ["not", "persisted"]
  });
  expect(metadata.label).toHaveLength(500);
  expect(metadata.index).toBe(3);
  expect(metadata.formal).toBe(true);
  expect(metadata.absent).toBeNull();
  expect(metadata).not.toHaveProperty("nested");
  expect(metadata).not.toHaveProperty("list");
});
