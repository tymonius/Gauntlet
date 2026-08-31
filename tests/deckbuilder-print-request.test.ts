import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const index = readFileSync("deckbuilder/index.html", "utf8");
const script = readFileSync("deckbuilder/print-request.js", "utf8");
const runtime = readFileSync("deckbuilder/current-runtime.js", "utf8");
const app = readFileSync("deckbuilder/app.js", "utf8");

describe("Deckbuilder host printing requests", () => {
  it("is available directly in the main Deckbuilder", () => {
    expect(index).toContain('print-request.css?v=20260731-1');
    expect(index).toContain('print-request.js?v=20260731-2');
    expect(script).toContain("Prepping for a Gauntlet game night?");
    expect(script).toContain("Send your host this Deck and request printing.");
    expect(script).toContain("Copy request and open email");
  });

  it("uses the existing canonical Deck JSON rather than a second request format", () => {
    expect(script).toContain("const deck = deckbuilder.serialize()");
    expect(script).toContain("JSON.stringify(deck, null, 2)");
    expect(script).toContain("BEGIN GAUNTLET DECK JSON");
    expect(script).toContain("END GAUNTLET DECK JSON");
    expect(script).toContain("Import JSON");
  });

  it("uses the current Deck schema and authority runtime without legacy import shims", () => {
    expect(app).toContain('schema: "gauntlet-deck"');
    expect(app).toContain("schemaVersion: 3");
    expect(app).toContain('data.schema !== "gauntlet-deck" || data.schemaVersion !== 3');
    expect(runtime).toContain("deckbuilder.setAuthorityBootstrap(currentGame)");
    expect(runtime).not.toContain("Storage.prototype");
  });

  it("keeps the complete Deck request out of the mailto URL", () => {
    expect(script).toContain("copyText(request.body)");
    expect(script).toContain("buildEmailDraftBody(request)");
    expect(script).toContain("Paste them below before sending this email");
    expect(script).toContain("encodeURIComponent(draftBody)");
    expect(script).not.toContain("encodeURIComponent(request.body)");
  });

  it("opens a user-reviewed email draft without sending data through Gauntlet", () => {
    expect(script).toContain("mailto:");
    expect(script).toContain("Your Deck is not sent to Gauntlet");
    expect(script).not.toContain("fetch(");
    expect(script).not.toContain("XMLHttpRequest");
  });

  it("requires a valid Deck and host email before opening the draft", () => {
    expect(script).toContain("deckbuilder.validate().valid");
    expect(script).toContain("EMAIL_PATTERN.test");
    expect(script).toContain("Complete and validate the Deck before requesting printing.");
  });

  it("remembers only the host email locally for convenience", () => {
    expect(script).toContain('gauntlet-print-request-host-email-v1');
    expect(script).toContain("localStorage.setItem(EMAIL_STORAGE_KEY, email)");
    expect(script).not.toMatch(/localStorage\.setItem\([^\n]*(json|deck|note|player)/i);
  });
});
