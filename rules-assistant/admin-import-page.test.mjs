import { expect, test } from "vitest";
import { ADMIN_PAGE_WITH_IMPORT, enhanceAdminPage } from "./admin-import-page.js";
import workerEntry, { addSiteFaviconLinks, allowSiteImages } from "./worker-entry.js";

const SITE_ORIGIN = "https://gauntlet.run";
const FAVICON_VERSION = "20260804-1";

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

test("adds the shared site favicon links idempotently", () => {
  const page = '<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Admin</title></head></html>';
  const enhanced = addSiteFaviconLinks(page);

  expect(enhanced).toContain(
    `<link rel="icon" type="image/png" href="${SITE_ORIGIN}/favicon-32.png?v=${FAVICON_VERSION}" sizes="32x32">`
  );
  expect(enhanced).toContain(
    `<link rel="icon" type="image/x-icon" href="${SITE_ORIGIN}/favicon.ico?v=${FAVICON_VERSION}" sizes="any">`
  );
  expect(enhanced).toContain(
    `<link rel="apple-touch-icon" href="${SITE_ORIGIN}/apple-touch-icon.png?v=${FAVICON_VERSION}">`
  );
  expect(addSiteFaviconLinks(enhanced)).toBe(enhanced);
});

test("allows the shared site origin through the admin image CSP", () => {
  const policy = "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'";
  const enhanced = allowSiteImages(policy);

  expect(enhanced).toContain(`img-src 'self' data: ${SITE_ORIGIN}`);
  expect(allowSiteImages(enhanced)).toBe(enhanced);
});

test("the production entry point preserves admin security headers and adds the shared favicon", async () => {
  const response = await workerEntry.fetch(
    new Request("https://rules.example/admin"),
    {},
    {}
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  expect(response.headers.get("Content-Security-Policy")).toContain(SITE_ORIGIN);

  const page = await response.text();
  expect(page).toContain("Import recommendations");
  expect(page).toContain(`${SITE_ORIGIN}/favicon-32.png?v=${FAVICON_VERSION}`);
  expect(page).toContain(`${SITE_ORIGIN}/favicon.ico?v=${FAVICON_VERSION}`);
  expect(page).toContain(`${SITE_ORIGIN}/apple-touch-icon.png?v=${FAVICON_VERSION}`);
});

test("the production entry point honors a configured site origin", async () => {
  const response = await workerEntry.fetch(
    new Request("https://rules.example/admin"),
    { SITE_ORIGIN: "https://preview.gauntlet.run/path-that-is-ignored" },
    {}
  );
  const page = await response.text();

  expect(page).toContain("https://preview.gauntlet.run/favicon-32.png");
  expect(response.headers.get("Content-Security-Policy")).toContain("https://preview.gauntlet.run");
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
