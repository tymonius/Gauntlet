import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("game-night playtest guide", () => {
  it("publishes distinct host and participant walkthroughs", () => {
    const html = read("playtest/guide/index.html");
    expect(html).toContain('data-guide-role="host"');
    expect(html).toContain('data-guide-role="participant"');
    expect(html).toContain("Four pages, four distinct jobs");
    expect(html).toContain("Create one QR code for each game");
    expect(html).toContain("Use a fresh QR code");
    expect(html).toContain("Ask from your own joined device");
    expect(html).toContain("One-page host checklist");
    expect(html).toContain("One-page player quick-start");
  });

  it("supports role-specific links and print output", () => {
    const app = read("playtest/guide/app.js");
    const css = read("playtest/guide/styles.css");
    expect(app).toContain('params.get("role") === "participant"');
    expect(app).toContain("window.print()");
    expect(css).toContain('@media print');
    expect(css).toContain('body[data-active-role="host"]');
    expect(css).toContain('body[data-active-role="participant"]');
  });

  it("links the guide from onboarding and table-session loaders", () => {
    const onboarding = read("playtest/onboarding/app.js");
    const session = read("playtest/session/app.js");
    const helper = read("playtest/guide-link.js");
    expect(onboarding).toMatch(/guide-link\.js\?v=\d{8}-\d+/);
    expect(session).toMatch(/guide-link\.js\?v=\d{8}-\d+/);
    expect(helper).toContain('role = hostContext ? "host" : "participant"');
    expect(helper).toContain("Host guide");
    expect(helper).toContain("Player guide");
  });
});

describe("Host Home game-night event creator", () => {
  it("creates one event through the existing protected session API", () => {
    const html = read("playtest/host/index.html");
    const creator = read("playtest/host/create-event.js");
    expect(html).toContain("create-event.css");
    expect(html).toContain("create-event.js");
    expect(html).toContain('type="module" src="create-event.js');
    expect(html).toContain("Game-night guide");
    expect(creator).toContain('import { resolveCurrentPlaytestRelease } from "../current-release.js"');
    expect(creator).toContain('fetch(`${API_ORIGIN}/api/sessions`');
    expect(creator).toContain('"Authorization": `Bearer ${adminToken}`');
    expect(creator).toContain('intendedUse: "game-night-event"');
    expect(creator).toContain("created.onboardingUrl");
    expect(creator).toContain("created.onboardingHostUrl");
    expect(creator).toContain("registry.registerEvent");
    expect(creator).not.toContain('const CURRENT_RULES_VERSION = "v0.7.1"');
  });

  it("uses the lifecycle-matched service version for batch sessions and manifests", () => {
    const html = read("playtest/batch/index.html");
    const batch = read("playtest/batch/app.js");
    expect(html).toContain('type="module" src="app.js');
    expect(batch).toContain('import { resolveCurrentPlaytestRelease } from "../current-release.js"');
    expect(batch).toContain("rulesVersion: release.version");
    expect(batch).toContain("rulesVersion,");
    expect(batch).toContain("batchMetadata.rulesVersion");
    expect(batch).not.toContain('rulesVersion: "v0.7.1"');
    expect(batch).not.toContain("gauntlet-v063-playtest-batch");
  });

  it("does not save the facilitator creation key", () => {
    const creator = read("playtest/host/create-event.js");
    expect(creator).not.toMatch(/localStorage\.setItem\([^\n]*adminToken/);
    expect(creator).toContain('el.eventAdminToken.value = ""');
    expect(creator).toContain("It is not saved in Host Home");
  });
});
