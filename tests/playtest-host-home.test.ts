import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("playtest Host Home", () => {
  it("loads the shared registry in event and table entry points", () => {
    expect(read("playtest/onboarding/app.js")).toContain("../host-registry.js");
    expect(read("playtest/session/app.js")).toContain("../host-registry.js");
  });

  it("cache-busts organizer entry points and shared navigation layers", () => {
    const onboardingHtml = read("playtest/onboarding/index.html");
    const sessionHtml = read("playtest/session/index.html");
    const onboardingApp = read("playtest/onboarding/app.js");
    const sessionApp = read("playtest/session/app.js");

    expect(onboardingHtml).toMatch(/app\.js\?v=\d{8}-\d+/);
    expect(sessionHtml).toMatch(/app\.js\?v=\d{8}-\d+/);
    expect(onboardingApp).toMatch(/host-navigation\.js\?v=\d{8}-\d+/);
    expect(onboardingApp).toMatch(/host-registry\.js\?v=\d{8}-\d+/);
    expect(sessionApp).toMatch(/host-navigation\.js\?v=\d{8}-\d+/);
    expect(sessionApp).toMatch(/host-registry\.js\?v=\d{8}-\d+/);
  });

  it("provides a dedicated organizer launcher", () => {
    const html = read("playtest/host/index.html");
    const app = read("playtest/host/app.js");
    expect(html).toContain("Host Home");
    expect(html).toContain("Event dashboards");
    expect(app).toContain("Open event dashboard");
    expect(app).toContain("Preview player page");
    expect(app).toContain("Copy participant link");
  });

  it("keeps host credentials out of player links", () => {
    const registry = read("playtest/host-registry.js");
    expect(registry).toContain('participantUrl.searchParams.delete("host")');
    expect(registry).toContain("safeUrl");
  });
});