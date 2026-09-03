import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PUBLIC_HTML = [
  "404.html",
  "about/index.html",
  "accessibility/index.html",
  "card-reference/index.html",
  "changelog/index.html",
  "contact/index.html",
  "contact/thanks/index.html",
  "deckbuilder/index.html",
  "factions/diplomats/index.html",
  "factions/financiers/index.html",
  "factions/index.html",
  "factions/inquisition/index.html",
  "factions/intelligence/index.html",
  "factions/military/index.html",
  "factions/mystics/index.html",
  "faq/index.html",
  "index.html",
  "playtest/analysis/index.html",
  "playtest/analysis/integrity/index.html",
  "playtest/batch/index.html",
  "playtest/feedback/index.html",
  "playtest/guide/index.html",
  "playtest/host/index.html",
  "playtest/index.html",
  "playtest/onboarding/index.html",
  "playtest/player-mat/index.html",
  "playtest/retrospective/index.html",
  "playtest/session/index.html",
  "playtest/sheet/index.html",
  "playtest/tracked/index.html",
  "press/index.html",
  "privacy/index.html",
  "rulebook/index.html",
  "rules-arbiter/index.html",
  "start/index.html",
  "v0.7.1/index.html",
];

function matches(source: string, pattern: RegExp): RegExpMatchArray[] {
  return Array.from(source.matchAll(pattern));
}

function idsIn(source: string): string[] {
  return matches(source, /\bid=["']([^"']+)["']/g).map((match) => match[1]);
}

function referencedIds(source: string): string[] {
  return matches(source, /\baria-(?:labelledby|describedby|controls)=["']([^"']+)["']/g)
    .flatMap((match) => match[1].trim().split(/\s+/))
    .filter(Boolean);
}

describe("current public static accessibility contract", () => {
  for (const path of PUBLIC_HTML) {
    describe(path, () => {
      const html = readFileSync(path, "utf8");
      const ids = idsIn(html);
      const idSet = new Set(ids);

      it("has exactly one h1", () => {
        expect(matches(html, /<h1\b/gi)).toHaveLength(1);
      });

      it("does not duplicate ids", () => {
        const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
        expect(duplicates).toEqual([]);
      });

      it("resolves ARIA id references", () => {
        const missing = [...new Set(referencedIds(html).filter((id) => !idSet.has(id)))];
        expect(missing).toEqual([]);
      });

      it("resolves same-page fragment links", () => {
        const fragments = matches(html, /\bhref=["']#([^"']+)["']/g).map((match) => match[1]).filter(Boolean);
        const missing = [...new Set(fragments.filter((id) => !idSet.has(id)))];
        expect(missing).toEqual([]);
      });

      it("gives every static image an alt attribute", () => {
        const imagesWithoutAlt = matches(html, /<img\b[^>]*>/gi)
          .map((match) => match[0])
          .filter((tag) => !/\balt\s*=/.test(tag));
        expect(imagesWithoutAlt).toEqual([]);
      });

      it("gives every static iframe a nonempty title", () => {
        const framesWithoutTitle = matches(html, /<iframe\b[^>]*>/gi)
          .map((match) => match[0])
          .filter((tag) => !/\btitle\s*=\s*["'][^"']+["']/.test(tag));
        expect(framesWithoutTitle).toEqual([]);
      });

      it("gives every static button an explicit type", () => {
        const buttonsWithoutType = matches(html, /<button\b[^>]*>/gi)
          .map((match) => match[0])
          .filter((tag) => !/\btype\s*=/.test(tag));
        expect(buttonsWithoutType).toEqual([]);
      });

      it("resolves explicit label targets", () => {
        const targets = matches(html, /<label\b[^>]*\bfor=["']([^"']+)["']/gi).map((match) => match[1]);
        const missing = [...new Set(targets.filter((id) => !idSet.has(id)))];
        expect(missing).toEqual([]);
      });

      it("gives every static fieldset a legend", () => {
        const fieldsetsWithoutLegend = matches(html, /<fieldset\b[^>]*>[\s\S]*?<\/fieldset>/gi)
          .map((match) => match[0])
          .filter((fieldset) => !/<legend\b/i.test(fieldset));
        expect(fieldsetsWithoutLegend).toEqual([]);
      });
    });
  }
});
