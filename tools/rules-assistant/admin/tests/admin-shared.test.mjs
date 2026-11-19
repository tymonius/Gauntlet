import { describe, expect, it } from "vitest";
import {
  isAdminAuthorized,
  interactionsToCsv
} from "../admin-shared.js";
import {
  isAdminAuthorized as legacyIsAdminAuthorized,
  interactionsToCsv as legacyInteractionsToCsv
} from "../../../../rules-assistant/worker.js";

describe("admin-owned authentication and CSV helpers", () => {
  it("preserves exact historical Worker export identity", () => {
    expect(legacyIsAdminAuthorized).toBe(isAdminAuthorized);
    expect(legacyInteractionsToCsv).toBe(interactionsToCsv);
  });

  it("accepts only an exact bearer token and fails closed otherwise", async () => {
    const request = (authorization) => new Request("https://rules.example/api/admin/export", {
      headers: authorization ? { Authorization: authorization } : {}
    });
    const env = { ADMIN_TOKEN: "secret-token" };
    expect(await isAdminAuthorized(request("Bearer secret-token"), env)).toBe(true);
    for (const value of [
      "Bearer wrong-token", "bearer secret-token", "Basic secret-token",
      "Bearer secret-token-extra", "Bearer ", ""
    ]) {
      expect(await isAdminAuthorized(request(value), env), value).toBe(false);
    }
    expect(await isAdminAuthorized(request("Bearer secret-token"), {})).toBe(false);
  });

  it("preserves exact CSV column order, escaping and CRLF row endings", () => {
    const first = { id: '123', question: 'comma, quoted "text"', answer: "line one\nline two" };
    const csv = interactionsToCsv([first]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0].startsWith("id,session_id,sequence_index,created_at,question,answer,")).toBe(true);
    expect(lines[1]).toContain('"comma, quoted ""text"""');
    expect(lines[1]).toContain('"line one\nline two"');
    expect(legacyInteractionsToCsv([first])).toBe(csv);
  });
});
