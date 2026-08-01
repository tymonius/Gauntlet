import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const index = readFileSync("deckbuilder/index.html", "utf8");
const script = readFileSync("deckbuilder/print-request.js", "utf8");
const runtime = readFileSync("deckbuilder/v061-runtime.js", "utf8");

describe("Deckbuilder host printing requests", () => {
  it("is available directly in the main Deckbuilder", () => {
    expect(index).toContain('print-request.css?v=20260731-1');
    expect(index).toContain('print-request.js?v=20260731-1');
    expect(script).toContain("Prepping for a Gauntlet game night?");
    expect(script).toContain("Send your host this Deck and request printing.");
  });

  it("uses the existing canonical Deck JSON rather than a second request format", () => {
    expect(script).toContain("const deck = currentDeckData()");
    expect(script).toContain("JSON.stringify(deck, null, 2)");
    expect(script).toContain("BEGIN GAUNTLET DECK JSON");
    expect(script).toContain("END GAUNTLET DECK JSON");
    expect(script).toContain("Import JSON");
  });

  it("routes v0.6.1 imports through the canonical Deck data importer", () => {
    expect(runtime).toContain("applyDeckData(snapshot)");
    expect(runtime).not.toContain("loadDeckSnapshot(snapshot)");
  });

  it("opens a user-reviewed email draft without sending data through Gauntlet", () => {
    expect(script).toContain("mailto:");
    expect(script).toContain("Your Deck is not sent to Gauntlet");
    expect(script).not.toContain("fetch(");
    expect(script).not.toContain("XMLHttpRequest");
  });

  it("requires a valid Deck and host email before opening the draft", () => {
    expect(script).toContain("validateDeck().valid");
    expect(script).toContain("EMAIL_PATTERN.test");
    expect(script).toContain("Complete and validate the Deck before requesting printing.");
  });

  it("remembers only the host email locally for convenience", () => {
    expect(script).toContain('gauntlet-print-request-host-email-v1');
    expect(script).toContain("localStorage.setItem(EMAIL_STORAGE_KEY, email)");
    expect(script).not.toMatch(/localStorage\.setItem\([^\n]*(json|deck|note|player)/i);
  });
});
