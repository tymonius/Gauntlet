import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());
const PUBLIC_ROOTS = [
  "404.html",
  "index.html",
  "about",
  "accessibility",
  "card-reference",
  "contact",
  "deckbuilder",
  "faq",
  "factions",
  "playtest",
  "privacy",
  "rulebook",
  "rules-arbiter",
  "start",
];

const ID_REFERENCE_ATTRIBUTES = [
  "aria-activedescendant",
  "aria-controls",
  "aria-describedby",
  "aria-errormessage",
  "aria-flowto",
  "aria-labelledby",
  "aria-owns",
];

type ParsedTag = {
  name: string;
  attributes: Map<string, string>;
  source: string;
};

function collectHtmlFiles(path: string): string[] {
  const absolute = join(ROOT, path);
  const stat = statSync(absolute);
  if (stat.isFile()) return path.endsWith(".html") ? [absolute] : [];

  return readdirSync(absolute, { withFileTypes: true })
    .flatMap((entry) => {
      const child = join(absolute, entry.name);
      if (entry.isDirectory()) return collectHtmlFiles(relative(ROOT, child));
      return entry.isFile() && entry.name.endsWith(".html") ? [child] : [];
    });
}

function displayPath(file: string): string {
  return relative(ROOT, file).split(sep).join("/");
}

function stripNonMarkupContent(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "");
}

function parseAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const attrPattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(source))) {
    const name = match[1].toLowerCase();
    if (name === "<") continue;
    attributes.set(name, match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function parseTags(html: string): ParsedTag[] {
  const markup = stripNonMarkupContent(html);
  const tags: ParsedTag[] = [];
  const tagPattern = /<([a-z][\w:-]*)(\s[^<>]*?)?\s*\/?\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(markup))) {
    tags.push({
      name: match[1].toLowerCase(),
      attributes: parseAttributes(match[2] || ""),
      source: match[0],
    });
  }
  return tags;
}

function idsFor(tags: ParsedTag[]): string[] {
  return tags
    .map((tag) => tag.attributes.get("id"))
    .filter((value): value is string => Boolean(value));
}

const files = PUBLIC_ROOTS.flatMap(collectHtmlFiles).sort();

describe("public static accessibility contract", () => {
  it("covers the public HTML surface", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    const path = displayPath(file);

    it(`${path}: has structurally valid static accessibility hooks`, () => {
      const html = readFileSync(file, "utf8");
      const tags = parseTags(html);
      const ids = idsFor(tags);
      const idSet = new Set(ids);

      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      expect([...new Set(duplicates)], `${path} has duplicate IDs`).toEqual([]);

      const headings = tags
        .map((tag) => /^h([1-6])$/.exec(tag.name))
        .filter((match): match is RegExpExecArray => Boolean(match))
        .map((match) => Number(match[1]));
      expect(headings.filter((level) => level === 1).length, `${path} should have exactly one h1`).toBe(1);
      for (let index = 1; index < headings.length; index += 1) {
        expect(
          headings[index] <= headings[index - 1] + 1,
          `${path} skips heading level h${headings[index - 1]} → h${headings[index]}`,
        ).toBe(true);
      }

      for (const tag of tags) {
        if (tag.name === "label" && tag.attributes.has("for")) {
          const target = tag.attributes.get("for") || "";
          expect(idSet.has(target), `${path} label target #${target} does not exist`).toBe(true);
        }

        if (tag.name === "img") {
          expect(tag.attributes.has("alt"), `${path} image is missing alt: ${tag.source}`).toBe(true);
        }

        if (tag.name === "button") {
          expect(tag.attributes.has("type"), `${path} button is missing an explicit type: ${tag.source}`).toBe(true);
        }

        if (tag.name === "a") {
          const href = tag.attributes.get("href") || "";
          if (/^#[^#]+$/.test(href)) {
            const target = decodeURIComponent(href.slice(1));
            expect(idSet.has(target), `${path} fragment target ${href} does not exist`).toBe(true);
          }
        }

        for (const attribute of ID_REFERENCE_ATTRIBUTES) {
          const value = tag.attributes.get(attribute);
          if (!value) continue;
          for (const target of value.trim().split(/\s+/)) {
            expect(
              idSet.has(target),
              `${path} ${attribute} references missing #${target}: ${tag.source}`,
            ).toBe(true);
          }
        }
      }
    });
  }
});
