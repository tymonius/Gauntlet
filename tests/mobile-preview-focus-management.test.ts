import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const previewScripts = [
  "card-reference/mobile-card-preview.js",
  "deckbuilder/mobile-card-preview.js",
];

describe("mobile preview modal focus management", () => {
  for (const scriptPath of previewScripts) {
    it(`${scriptPath} keeps Tab focus inside the open modal`, () => {
      const source = readFileSync(scriptPath, "utf8");

      expect(source).toContain('if (event.key === "Tab" && open)');
      expect(source).toContain("trapModalFocus(event)");
      expect(source).toContain("preview.contains(active)");
      expect(source).toContain("event.shiftKey && active === first");
      expect(source).toContain("!event.shiftKey && active === last");
      expect(source).toContain("event.preventDefault()");
    });
  }
});
