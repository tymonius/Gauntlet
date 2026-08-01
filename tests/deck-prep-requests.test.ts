import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const startApp = read("start/app.js");
const prepHost = read("deck-requests/host/app.js");
const prepPage = read("deck-requests/host/index.html");
const hostHome = read("playtest/host/index.html");

describe("Deck Prep requests", () => {
  it("keeps ordinary standalone onboarding unchanged unless a request token is present", () => {
    expect(startApp).toContain('params.get("request")');
    expect(startApp).toContain("TOKEN_PATTERN.test(requestCode)");
    expect(startApp).toContain("installDeckRequestPanel()");
    expect(startApp).toContain("Have the host prepare this Deck.");
  });

  it("submits the selected faction and Leader through the existing onboarding event contract", () => {
    expect(startApp).toContain('/api/sessions/${encodeURIComponent(requestCode)}/join');
    expect(startApp).toContain('purpose: "onboarding"');
    expect(startApp).toContain('/api/sessions/${encodeURIComponent(requestCode)}/event');
    expect(startApp).toContain('eventType: "onboarding_choice"');
    expect(startApp).toContain("leader: leaderName");
    expect(startApp).toContain("introConfirmed: true");
  });

  it("creates one prep list and hands players back to the canonical start page", () => {
    expect(prepHost).toContain('sessionKind: "event"');
    expect(prepHost).toContain('intendedUse: "deck-prep-list"');
    expect(prepHost).toContain('new URL("../../start/"');
    expect(prepHost).toContain('publicUrl.searchParams.set("request", code)');
    expect(prepPage).toContain("Send one link to everyone.");
  });

  it("never creates game tables, seats, or QR sessions", () => {
    expect(prepHost).not.toContain("/games");
    expect(prepHost).not.toContain("tableIndex");
    expect(prepHost).not.toContain("seatIndex");
    expect(prepHost).not.toContain("qr");
    expect(prepHost).not.toContain("arbiter");
    expect(prepPage).toContain("does not create tables, seats, QR cards, tracked games, or Rules Arbiter links");
  });

  it("gives the host exact starter printing and a local preparation workflow", () => {
    expect(prepHost).toContain('source", "deck-request"');
    expect(prepHost).toContain("requested");
    expect(prepHost).toContain("printed");
    expect(prepHost).toContain("prepared");
    expect(prepHost).toContain("collected");
    expect(prepHost).toContain("Open and print this Deck");
    expect(prepPage).toContain("Preparation statuses are local to this host browser.");
  });

  it("does not persist the facilitator creation key", () => {
    expect(prepHost).toContain("prepAdminToken.value = \"\"");
    expect(prepHost).not.toMatch(/localStorage\.setItem\([^\n]*admin/i);
    expect(prepPage).toContain("is never saved");
  });

  it("links Deck Prep prominently from Host Home", () => {
    expect(hostHome).toContain('../../deck-requests/host/');
    expect(hostHome).toContain("Open Deck Prep");
  });
});
