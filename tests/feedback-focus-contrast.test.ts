import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("standalone feedback focus contrast", () => {
  it("uses the solid bronze focus indicator for textarea and rating choices", () => {
    const css = readFileSync("playtest/feedback/styles.css", "utf8");
    expect(css).toContain(".feedback-form-layout textarea:focus{outline:3px solid var(--bronze);outline-offset:2px;border-color:var(--bronze)}");
    expect(css).toContain(".rating-option input:focus-visible + span{outline:3px solid var(--bronze);outline-offset:2px}");
    expect(css).not.toMatch(/outline:\s*2px solid rgba\(211,110,94,\.(?:55|65)\)/);
  });
});
