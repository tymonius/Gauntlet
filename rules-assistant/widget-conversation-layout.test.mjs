import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const HERE = fileURLToPath(new URL(".", import.meta.url));

describe("Rules Arbiter conversation layout", () => {
  test("the Chief Justice header compacts after the first player question", () => {
    const widget = readFileSync(`${HERE}/widget.js`, "utf8");
    const css = readFileSync(`${HERE}/feedback.css`, "utf8");

    expect(widget).toContain('this.appendMessage({ role: "user", answer: question, sources: [] });');
    expect(css).toMatch(/--ga-rules-compact-header-height:\s*72px;/);
    expect(css).toMatch(/\.ga-rules-panel:has\(\.ga-rules-message\.user\) \.ga-rules-header\s*\{[\s\S]*min-height:\s*var\(--ga-rules-compact-header-height\);/);
    expect(css).toMatch(/\.ga-rules-panel:has\(\.ga-rules-message\.user\) \.ga-rules-chief-justice\s*\{[\s\S]*height:\s*var\(--ga-rules-compact-header-height\);/);
    expect(css).toMatch(/\.ga-rules-panel:has\(\.ga-rules-message\.user\) \.ga-rules-header-identity\s*\{[\s\S]*grid-template-columns:\s*60px\s+minmax\(0,\s*1fr\);/);
  });

  test("clearing the conversation restores the introductory portrait state", () => {
    const widget = readFileSync(`${HERE}/widget.js`, "utf8");

    expect(widget).toMatch(/clear\(\)\s*\{[\s\S]*this\.history = \[\];[\s\S]*this\.renderWelcome\(\);/);
    expect(widget).toMatch(/renderWelcome\(\)\s*\{[\s\S]*this\.elements\.messages\.innerHTML = "";/);
  });
});
