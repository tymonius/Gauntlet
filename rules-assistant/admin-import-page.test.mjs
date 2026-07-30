import { expect, test } from "vitest";
import { ADMIN_PAGE_WITH_IMPORT, enhanceAdminPage } from "./admin-import-page.js";
import workerEntry from "./worker-entry.js";

test("enhances the private dashboard with a guarded recommendation import", () => {
  expect(ADMIN_PAGE_WITH_IMPORT).toContain("Import recommendations");
  expect(ADMIN_PAGE_WITH_IMPORT).toContain("Import review recommendations");
  expect(ADMIN_PAGE_WITH_IMPORT).toContain("Duplicate interaction ID");
  expect(ADMIN_PAGE_WITH_IMPORT).toContain("does not exist in the live database");
  expect(ADMIN_PAGE_WITH_IMPORT).toContain("changed since the preview");
  expect(ADMIN_PAGE_WITH_IMPORT).toContain("Cross-interaction findings were not written to D1");

  const script = ADMIN_PAGE_WITH_IMPORT.match(/<script>([\s\S]*)<\/script>/)?.[1];
  expect(script).toBeTruthy();
  expect(() => new Function(script)).not.toThrow();
});

test("falls back to the original page if an enhancement marker changes", () => {
  const page = "<!doctype html><p>Original admin shell</p>";
  expect(enhanceAdminPage(page)).toBe(page);
});

test("the production entry point preserves admin security headers", async () => {
  const response = await workerEntry.fetch(
    new Request("https://rules.example/admin"),
    {},
    {}
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  expect(await response.text()).toContain("Import recommendations");
});

test("the production entry point delegates non-admin routes unchanged", async () => {
  const response = await workerEntry.fetch(
    new Request("https://rules.example/health"),
    {},
    {}
  );
  const payload = await response.json();
  expect(payload.service).toBe("gauntlet-rules-assistant");
  expect(payload.interactionLogging).toBe(false);
});
