import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { presentRulesAnswer } from "./answer-presentation.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));

describe("Rules Arbiter welcome and compact UI regressions", () => {
  test("welcome copy is never collapsed into Details and exceptions", () => {
    const welcome = "Ask me about the v0.6.3 rulebook, cards, Leaders, faction systems, Territories, Gambits, Tactics, battle timing, or victory conditions. If the written rules leave a genuine gap, I will issue a provisional ruling so play can continue.";

    expect(presentRulesAnswer({ answer: welcome, rulingStatus: "welcome" })).toEqual({
      answer: welcome,
      details: ""
    });
  });

  test("generic sentence splitting preserves dotted version numbers", () => {
    const presented = presentRulesAnswer({
      answer: "Gauntlet v0.6.3 uses the current rules. This is the second sentence needed for the primary answer. A third sentence belongs in the collapsed details.",
      rulingStatus: "explicit"
    });

    expect(presented.answer).toBe("Gauntlet v0.6.3 uses the current rules. This is the second sentence needed for the primary answer.");
    expect(presented.details).toBe("A third sentence belongs in the collapsed details.");
  });

  test("plain-text presentation removes unsupported inline Markdown markers", () => {
    const presented = presentRulesAnswer({
      answer: "The Deed's cost is **min(your Deeds + 1, 6)**, then add **-1** if you control it, **0** if you occupy it, or **+1** if neither; then add the `buyout premium` if an opponent owns it.",
      rulingStatus: "explicit"
    });

    expect(presented.answer).toBe("The Deed's cost is min(your Deeds + 1, 6), then add -1 if you control it, 0 if you occupy it, or +1 if neither; then add the buyout premium if an opponent owns it.");
    expect(presented.details).toBe("");
  });

  test("suggested questions wrap into the panel instead of creating a horizontal scroller", () => {
    const css = readFileSync(`${HERE}/answer-presentation.css`, "utf8");

    expect(css).toMatch(/\.ga-rules-suggestions\s*\{[\s\S]*display:\s*grid;/);
    expect(css).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
    expect(css).toMatch(/overflow:\s*visible;/);
    expect(css).toMatch(/\.ga-rules-suggestion\s*\{[\s\S]*max-width:\s*none;/);
  });

  test("widget uses a solid high-contrast keyboard focus indicator", () => {
    const css = readFileSync(`${HERE}/widget.css`, "utf8");
    expect(css).toMatch(/\.ga-rules-launcher:focus-visible,[\s\S]*outline:\s*3px\s+solid\s+var\(--ga-bronze\);/);
    expect(css).not.toContain("outline: 3px solid rgba(143, 31, 37, 0.28);");
  });

  test("widget identifies the Rules Arbiter with the Chief Justice artwork", () => {
    const widget = readFileSync(`${HERE}/widget.js`, "utf8");
    const css = readFileSync(`${HERE}/widget.css`, "utf8");
    const portrait = readFileSync(`${HERE}/../images/rules-arbiter/chief-justice-rules-arbiter-popup.webp`);

    expect(widget).toContain('class="ga-rules-chief-justice"');
    expect(widget).toContain('/images/rules-arbiter/chief-justice-rules-arbiter-popup.webp');
    expect(css).toMatch(/\.ga-rules-header-identity\s*\{[\s\S]*grid-template-columns:\s*132px\s+minmax\(0,\s*1fr\);/);
    expect(css).toMatch(/\.ga-rules-chief-justice\s*\{[\s\S]*width:\s*132px;/);
    expect(portrait.byteLength).toBeGreaterThan(1000);
  });

  test("widget uses the current square editorial design language", () => {
    const css = readFileSync(`${HERE}/widget.css`, "utf8");
    const feedbackCss = readFileSync(`${HERE}/feedback.css`, "utf8");

    expect(css).toContain('@import url("https://use.typekit.net/vgm6nwi.css");');
    expect(css).toMatch(/--ga-reading:\s*"adobe-caslon-pro"/);
    expect(css).toMatch(/\.ga-rules-panel\s*\{[\s\S]*border-top:\s*5px solid var\(--ga-crimson\);[\s\S]*border-radius:\s*0;/);
    expect(css).toMatch(/\.ga-rules-header\s*\{[\s\S]*background:\s*var\(--ga-paper\);/);
    expect(css).toMatch(/\.ga-rules-message\s*\{[\s\S]*border-radius:\s*0;[\s\S]*box-shadow:\s*none;/);
    expect(css).toMatch(/\.ga-rules-input-row textarea\s*\{[\s\S]*border-radius:\s*0;/);
    expect(css).toMatch(/\.ga-rules-send\s*\{[\s\S]*border-radius:\s*0;[\s\S]*background:\s*var\(--ga-crimson\);/);
    expect(css).toMatch(/\.ga-rules-suggestion\s*\{[\s\S]*border-radius:\s*0;/);
    expect(feedbackCss).toMatch(/\.ga-rules-feedback button\s*\{[\s\S]*border-radius:\s*0;/);
    expect(feedbackCss).toMatch(/\.ga-rules-feedback-comment textarea\s*\{[\s\S]*border-radius:\s*0;/);
    expect(css).not.toContain("border-radius: 999px");
    expect(css).not.toContain("linear-gradient");
    expect(feedbackCss).not.toContain("border-radius: 8px");
  });
});
