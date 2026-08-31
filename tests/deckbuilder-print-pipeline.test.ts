import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const app = read("deckbuilder/app.js");
const print = read("deckbuilder/print.js");

const transforms = [
  ["deckbuilder/print-duplex-sheet-pairing.js", "production-rendering", 40],
  ["deckbuilder/starter-decks.js", "starter-strategy", 65],
  ["deckbuilder/print-window-portrait-fixes.js", "print-window-polish", 70],
] as const;

describe("Deckbuilder print pipeline", () => {
  it("has one ordered core pipeline for print document transforms", () => {
    expect(app).toContain("const printTransforms = []");
    expect(app).toContain("function registerPrintTransform(name, callback, priority = 50)");
    expect(app).toContain("printTransforms.sort((left, right) => left.priority - right.priority || left.sequence - right.sequence)");
    expect(app).toContain("function preparePrintDocument(html, context = {})");
    expect(app).toContain("const next = transform.callback(output, context)");
    expect(app).toContain("registerPrintTransform,");
    expect(app).toContain("preparePrintDocument,");
  });

  it("routes the main Deckbuilder print action through the core pipeline", () => {
    expect(print).toContain("deckbuilder.preparePrintDocument(html");
    expect(print).toContain('kind: "deck"');
    expect(print).toContain("printWindow.document.write(preparedHtml)");
  });

  it("keeps only the intentional production and presentation print stages", () => {
    for (const [path, name, priority] of transforms) {
      const source = read(path);
      expect(source, path).toContain(`deckbuilder.registerPrintTransform("${name}"`);
      expect(source, path).toContain(`, ${priority});`);
    }
  });

  it("removes window.open/document.write monkeypatching from print transforms", () => {
    for (const [path] of transforms) {
      const source = read(path);
      expect(source, `${path} still intercepts window.open`).not.toContain("window.open");
      expect(source, `${path} still intercepts document.write`).not.toContain("document.write");
    }
  });

  it("runs the stale production-face guard as the final print transform", () => {
    const source = read("deckbuilder/print-duplex-sheet-pairing.js");
    expect(source).toContain('deckbuilder.registerPrintTransform("production-face-guard", guardProductionFaces, 100)');
    expect(source).toContain("Outdated print faces survived production rendering");
    expect(source).not.toContain("printWindow.document.close");
  });

  it("does not load the retired DOM-rewrite print layers", () => {
    const index = read("deckbuilder/index.html");
    for (const retired of [
      "print-duplex.js",
      "print-intelligence-trackers.js",
      "print-reference-placement.js",
      "print-intelligence-portraits.js",
      "print-card-back-orientation.js",
    ]) {
      expect(index).not.toContain(retired);
    }
    expect(index).toContain("custom-print-loader.js");
  });
});
