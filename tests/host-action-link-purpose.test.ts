import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Host Home repeated action names", () => {
  const source = readFileSync("playtest/host/app.js", "utf8");

  it("adds record context to repeated link and button accessible names", () => {
    expect(source).toContain('aria-label="${escapeAttribute(`${label} — ${context}`)}"');
    expect(source).toContain('linkButton(game.joinUrl, "Open clean player page", false, true, tableLabel)');
    expect(source).toContain('button("Copy player link", "copy-table", false, tableLabel)');
    expect(source).toContain('button("Copy player link", "copy-standalone", false, title)');
  });

  it("preserves visible labels as the accessible-name prefix", () => {
    expect(source).toContain('`${label} — ${context}`');
    expect(source).toContain('>${escapeHtml(label)}</a>');
    expect(source).toContain('>${escapeHtml(label)}</button>');
  });
});
