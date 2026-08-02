import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("index.html", "utf8");
const styles = readFileSync("site.css", "utf8");

describe("homepage developer tools disclosure", () => {
  it("is a compact disclosure collapsed by default beneath public playtest resources", () => {
    expect(page).toContain('<details class="developer-tools">');
    expect(page).not.toContain('<details class="developer-tools" open>');
    expect(page).toContain("Review queues, compiled research data, and organizer records");
    expect(styles).toContain(".developer-tools summary");
    expect(styles).toContain(".developer-tools[open] .developer-tools-chevron");
  });

  it("links only the current operational dashboards with accurate credential language", () => {
    expect(page).toContain("https://gauntlet-rules-assistant.tymon-scott.workers.dev/admin");
    expect(page).toContain('href="playtest/analysis/"');
    expect(page).toContain('href="playtest/host/"');
    expect(page).toContain("Uses the Rules Arbiter admin token.");
    expect(page).toContain("Uses the facilitator key.");
  });

  it("keeps the developer surface visually subordinate and responsive", () => {
    expect(styles).toContain("margin-top: 20px");
    expect(styles).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(styles).toContain(".developer-tool-links { grid-template-columns: 1fr; }");
    expect(styles).toContain("#1c1916");
    expect(styles).toContain("#d7b783");
  });
});
