import { expect, test } from "vitest";
import {
  ADMIN_PAGE_WITH_INCREMENTAL_EXPORT,
  enhanceIncrementalExport
} from "./admin-incremental-export-page.js";
import workerEntry from "./worker-entry.js";

test("enhances the dashboard with scoped incremental review exports", () => {
  expect(ADMIN_PAGE_WITH_INCREMENTAL_EXPORT).toContain("Review new with ChatGPT");
  expect(ADMIN_PAGE_WITH_INCREMENTAL_EXPORT).toContain("Incremental review export");
  expect(ADMIN_PAGE_WITH_INCREMENTAL_EXPORT).toContain("Mark current data as exported");
  expect(ADMIN_PAGE_WITH_INCREMENTAL_EXPORT).toContain("Each dashboard filter combination keeps its own checkpoint");
  expect(ADMIN_PAGE_WITH_INCREMENTAL_EXPORT).toContain("remainingAfterThisBundle");
  expect(ADMIN_PAGE_WITH_INCREMENTAL_EXPORT).toContain("No new matching interactions since the last export");

  const script = ADMIN_PAGE_WITH_INCREMENTAL_EXPORT.match(/<script>([\s\S]*)<\/script>/)?.[1];
  expect(script).toBeTruthy();
  expect(() => new Function(script)).not.toThrow();
});

test("falls back when an incremental-export enhancement marker changes", () => {
  const page = "<!doctype html><p>Existing dashboard</p>";
  expect(enhanceIncrementalExport(page)).toBe(page);
});

test("the production entry serves the enhanced dashboard with security headers", async () => {
  const response = await workerEntry.fetch(
    new Request("https://rules.example/admin"),
    {},
    {}
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  expect(await response.text()).toContain("Review new with ChatGPT");
});

test("the production entry intercepts checkpoint requests", async () => {
  const response = await workerEntry.fetch(
    new Request("https://rules.example/api/admin/review-export-checkpoint", { method: "POST" }),
    {},
    {}
  );
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain("Interaction logging");
});
