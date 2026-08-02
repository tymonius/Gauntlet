import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("playtest/analysis/integrity/index.html", "utf8");
const styles = readFileSync("playtest/analysis/integrity/styles.css", "utf8");

describe("playtest integrity access form", () => {
  it("keeps each label and input together as one grid item", () => {
    expect(page.match(/class="access-field"/g)?.length).toBe(2);
    expect(styles).toContain(".access-field{display:grid");
    expect(styles).not.toContain(".access-panel form label{grid-row:1}");
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

  it("keeps both fields readable and responsive", () => {
    expect(styles).toContain("background:#fffaf0");
    expect(styles).toContain("color:#171512");
    expect(styles).toContain("input:-webkit-autofill");
    expect(styles).toContain("@media(max-width:620px)");
    expect(styles).toContain(".access-panel form{grid-template-columns:1fr}");
  });
});
