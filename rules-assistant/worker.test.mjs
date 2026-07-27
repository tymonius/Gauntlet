import { expect, test } from "vitest";
import worker, {
  interactionsToCsv,
  isAdminAuthorized,
  sanitizeSessionId
} from "./worker.js";

test("preserves valid anonymous session identifiers", () => {
  expect(sanitizeSessionId("session_12345678")).toBe("session_12345678");
});

test("replaces invalid session identifiers", () => {
  const value = sanitizeSessionId("bad id");
  expect(value).toMatch(/^[0-9a-f-]{36}$/i);
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
  expect(await response.text()).toContain("Rules interaction review");
});

test("reports whether interaction logging is configured", async () => {
  const response = await worker.fetch(new Request("https://rules.example/health"), {});
  const payload = await response.json();
  expect(payload.interactionLogging).toBe(false);
});
