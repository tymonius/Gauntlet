import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hostNavigation = readFileSync("playtest/host-navigation.js", "utf8");
const onboardingEntry = readFileSync("playtest/onboarding/app.js", "utf8");
const sessionEntry = readFileSync("playtest/session/app.js", "utf8");

describe("playtest host navigation", () => {
  it("loads the shared navigation layer in both event and table entry points", () => {
    expect(onboardingEntry).toContain("../host-navigation.js");
    expect(sessionEntry).toContain("../host-navigation.js");
  });

  it("separates the organizer dashboard from participant onboarding", () => {
    expect(hostNavigation).toContain("Game-night event dashboard");
    expect(hostNavigation).toContain("event-dashboard-mode");
    expect(hostNavigation).toContain("Preview participant onboarding");
    expect(hostNavigation).toContain("body.event-dashboard-mode #onboardingForm");
  });

  it("marks table pages opened by the host as organizer previews", () => {
    expect(hostNavigation).toContain('previewUrl.searchParams.set("organizerPreview", "1")');
    expect(hostNavigation).toContain("Table-session player view");
    expect(hostNavigation).toContain("Return to event dashboard");
    expect(hostNavigation).toContain("window.opener.focus()");
  });

  it("keeps ordinary participant links free of the organizer preview flag", () => {
    expect(hostNavigation).toContain('cleanPlayerUrl.searchParams.delete("organizerPreview")');
    expect(hostNavigation).not.toContain('previewUrl.searchParams.set("host"');
  });
});
