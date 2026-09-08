import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/host/app.js", "utf8");
const html = readFileSync("playtest/host/index.html", "utf8");

describe("Host Home removal focus", () => {
  it("restores focus to a neighboring record after removing a saved event or standalone session", () => {
    expect(source).toContain("function focusReplacement(list, key, headingId)");
    expect(source).toContain('focusReplacement(el.eventList, neighborKey, "events-title");');
    expect(source).toContain('focusReplacement(el.standaloneList, neighborKey, "standalone-title");');
    expect(source).toContain('card.dataset.hostRecordKey = String(event.code || event.dashboardUrl || event.sheetSerial || index);');
    expect(source).toContain('card.dataset.hostRecordKey = String(identity || index);');
  });

  it("provides focusable section-heading fallbacks when a removal empties a list", () => {
    expect(html).toContain('<h2 id="events-title" tabindex="-1">Event dashboards</h2>');
    expect(html).toContain('<h2 id="standalone-title" tabindex="-1">Standalone sessions</h2>');
  });
});
