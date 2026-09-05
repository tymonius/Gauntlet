import { expect, test } from "vitest";
import worker from "./admin-refinement-worker.js";
import { adminRefinementRuntimeSource } from "./admin-refinement-runtime.js";

function scriptsFrom(html) {
  return [...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
}

test("deployed admin response embeds the refinement runtime inline", async () => {
  const response = await worker.fetch(
    new Request("https://gauntlet-rules-assistant.example/admin"),
    { SITE_ORIGIN: "https://gauntlet.run" },
    {}
  );
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toContain("text/html");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Content-Security-Policy")).toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(html).toContain('id="rules-refinement-inline-runtime"');
  expect(html).toContain("Refinement runtime starting…");
  expect(html).not.toContain('src="/admin-refinement-runtime.js"');
  expect(html).toContain(adminRefinementRuntimeSource());

  const scripts = scriptsFrom(html);
  expect(scripts.length).toBeGreaterThanOrEqual(2);
  for (const source of scripts) expect(() => new Function(source)).not.toThrow();
});
