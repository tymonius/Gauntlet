import { describe, expect, it, vi } from "vitest";
import {
  currentPlaytestVersion,
  matchCurrentPlaytestRelease,
  resolveCurrentPlaytestRelease,
} from "./current-release.js";

const lifecycle = {
  current_release: "v0.7.1",
  releases: {
    "v0.7.1": { status: "current", public_cutover: true },
  },
};

describe("current playtest release", () => {
  it("resolves the approved playtest identity from lifecycle configuration", () => {
    expect(currentPlaytestVersion(lifecycle)).toBe("v0.7.1");
    expect(matchCurrentPlaytestRelease(lifecycle, { ok: true, version: "v0.7.1" })).toEqual({
      version: "v0.7.1",
      health: { ok: true, version: "v0.7.1" },
    });
  });

  it("rejects a service running a different rules version", () => {
    expect(() => matchCurrentPlaytestRelease(lifecycle, { ok: true, version: "v0.7.2" }))
      .toThrow("the current playtest is v0.7.1");
  });

  it("loads lifecycle and service identity through one client boundary", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => lifecycle })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, version: "v0.7.1", database: true }) });

    const resolved = await resolveCurrentPlaytestRelease("https://sessions.example/", { fetchImpl });

    expect(resolved.version).toBe("v0.7.1");
    expect(resolved.health.database).toBe(true);
    expect(fetchImpl).toHaveBeenNthCalledWith(1, "/config/release-lifecycle.json", { cache: "no-store" });
    expect(fetchImpl).toHaveBeenNthCalledWith(2, "https://sessions.example/health", { cache: "no-store" });
  });
});
