import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("playtest/analysis/integrity/index.html", "utf8");
const styles = readFileSync("playtest/analysis/integrity/styles.css", "utf8");
const developerStyles = readFileSync("developer-tools.css", "utf8");

describe("playtest integrity access form", () => {
  it("keeps each label and input together as one grid item", () => {
    expect(page.match(/class="access-field"/g)?.length).toBe(2);
    expect(developerStyles).toContain(".access-field { display: grid;");
    expect(styles).toContain("Component styling is shared with Playtest Analysis");
    expect(developerStyles).not.toContain(".access-panel form label{grid-row:1}");
  });

  it("distinguishes the facilitator key from editable reviewer attribution", () => {
    expect(page).toContain('id="adminToken"');
    expect(page).toContain('type="password"');
    expect(page).toContain('autocomplete="new-password"');
    expect(page).toContain('id="reviewerName"');
    expect(page).toContain('type="text"');
    expect(page).toContain('autocomplete="nickname"');
    expect(page.match(/data-1p-ignore/g)?.length).toBe(2);
    expect(page.match(/data-lpignore="true"/g)?.length).toBe(2);
  });

  it("keeps both fields readable and responsive through the shared developer stylesheet", () => {
    expect(developerStyles).toContain("background: #fffaf0;");
    expect(developerStyles).toContain("color: var(--ink);");
    expect(developerStyles).toContain("@media (max-width: 620px)");
    expect(developerStyles).toContain(".integrity-main .access-panel form { grid-template-columns: 1fr; }");
    expect(developerStyles).toContain(".access-field input { width: 100%; min-height: 46px;");
  });
});
