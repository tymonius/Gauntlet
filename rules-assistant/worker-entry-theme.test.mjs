import { expect, test } from "vitest";
import { addDeveloperToolChrome, allowSiteAssets } from "./worker-entry.js";

test("wraps the Rules Arbiter admin page in Gauntlet Developer Tools chrome", () => {
  const html = addDeveloperToolChrome(
    "<!doctype html><html><head><title>Review</title></head><body><main>Admin</main></body></html>",
    "https://gauntlet.run"
  );

  expect(html).toContain('class="developer-page developer-rules-page"');
  expect(html).toContain('class="site-header developer-site-header"');
  expect(html).toContain('href="https://gauntlet.run/site.css"');
  expect(html).toContain('href="https://gauntlet.run/developer-tools.css?v=20260815-1"');
  expect(html).toContain('href="https://gauntlet.run/playtest/analysis/"');
  expect(html).toContain('class="developer-site-footer"');
});

test("does not apply the Developer Tools chrome twice", () => {
  const once = addDeveloperToolChrome("<html><head></head><body></body></html>");
  expect(addDeveloperToolChrome(once)).toBe(once);
});

test("allows only the site and existing Typekit hosts needed by the admin theme", () => {
  const policy = allowSiteAssets(
    "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:;",
    "https://gauntlet.run"
  );

  expect(policy).toContain("style-src 'unsafe-inline' https://gauntlet.run https://use.typekit.net");
  expect(policy).toContain("font-src https://use.typekit.net https://p.typekit.net");
  expect(policy).toContain("img-src 'self' data: https://gauntlet.run https://p.typekit.net");
  expect(policy).toContain("script-src 'unsafe-inline'");
});
