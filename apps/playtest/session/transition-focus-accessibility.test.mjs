import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/session/app-core.js", "utf8");
const html = readFileSync("playtest/session/index.html", "utf8");

describe("playtest session transition focus", () => {
  it("moves focus into the joined state after the join form is hidden", () => {
    expect(html).toContain('id="joinedPanel" class="panel joined-panel" hidden tabindex="-1" aria-labelledby="joinedTitle"');
    expect(html).toContain('<h2 id="joinedTitle">You are linked to this playtest sheet.</h2>');
    expect(source).toContain('el.joinedPanel.focus({ preventScroll: true });');
  });

  it("moves focus to the status after closing hides facilitator controls", () => {
    expect(html).toContain('id="statusPill" class="status-pill" role="status" tabindex="-1"');
    expect(source).toContain('el.statusPill.focus({ preventScroll: true });');
  });
});
