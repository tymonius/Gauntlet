import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retrieveRules } from "./local-search.js";
import {
  candidateRulebookHtmlToMarkdown,
  loadDevelopmentV063RulesCorpus,
  V063_RULES_VERSION
} from "./v063-development-corpus.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const rulebookMarkdown = await fs.readFile(
  path.join(root, "artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md"),
  "utf8"
);
const canonicalJson = await fs.readFile(path.join(root, "v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json"), "utf8");

// The old /v0.6.3/rulebook/ review route now redirects to the published current
// Rulebook. Keep this historical candidate parser covered by a deterministic
// release-doc fixture built from the preserved clean v0.6.3 Rulebook source.
const rulebookHtml = markdownToReleaseDocHtml(rulebookMarkdown);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function markdownToReleaseDocHtml(markdown) {
  const body = String(markdown)
    .split(/\r?\n/)
    .map((line) => {
      const heading = line.match(/^(#{1,5})\s+(.+)$/);
      if (heading) {
        const level = Math.min(6, heading[1].length + 1);
        return `<h${level}>${escapeHtml(heading[2])}</h${level}>`;
      }
      if (line.trim() === "---") return "<hr>";
      if (line.startsWith("> ")) return `<blockquote><p>${escapeHtml(line.slice(2))}</p></blockquote>`;
      if (line.startsWith("- ")) return `<li>${escapeHtml(line.slice(2))}</li>`;
      if (!line.trim()) return "";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("\n");
  return `<article class="release-doc">${body}</article>`;
}

function fakeFetch(url) {
  const text = String(url);
  if (text.includes("Gauntlet_v0.6.3_Canonical_Data_Candidate.json")) {
    return Promise.resolve(new Response(canonicalJson, { status: 200, headers: { "Content-Type": "application/json" } }));
  }
  if (text.includes("/v0.6.3/rulebook/")) {
    return Promise.resolve(new Response(rulebookHtml, { status: 200, headers: { "Content-Type": "text/html" } }));
  }
  return Promise.resolve(new Response("not found", { status: 404 }));
}

async function corpus() {
  return loadDevelopmentV063RulesCorpus({
    rulebookUrl: "https://gauntlet.run/v0.6.3/rulebook/",
    canonicalDataUrl: "https://gauntlet.run/v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json",
    referenceUrl: "https://gauntlet.run/v0.6.3/reference/",
    fetchImpl: fakeFetch
  });
}

describe("v0.6.3 development Rules Arbiter corpus", () => {
  it("reconstructs the candidate Rulebook from a preserved release-doc fixture", () => {
    const markdown = candidateRulebookHtmlToMarkdown(rulebookHtml);
    expect(markdown).toContain("# GAUNTLET");
    expect(markdown).toContain("## Official Rulebook");
    expect(markdown).toContain("Draw four cards, choose one card from those four");
    expect(markdown).toContain("DON'T FORGET THE BOARD");
    expect(markdown).toContain("Gambit/Tactic");
    expect(markdown).not.toContain("The normal way to win is to run the Gauntlet and win the final Last Stand battle");
  });

  it("loads 128 current cards and 25 Territories from candidate data", async () => {
    const loaded = await corpus();
    expect(loaded.version).toBe(V063_RULES_VERSION);
    expect(loaded.candidate).toBe(true);
    expect(loaded.publishedVersion).toBe("v0.6.2");
    expect(loaded.data.version).toBe("v0.6.3-candidate");
    expect(loaded.data.cards).toHaveLength(128);
    expect(loaded.data.territories).toHaveLength(25);
    expect(loaded.data.setup.sequence[0]).toBe("prepare_faction_components");
    expect(loaded.data.battlefield.last_stand.final_territory_capture_required).toBe(false);
    expect(loaded.documents.every((document) => document.sourcePath.includes("v0.6.3"))).toBe(true);
  });

  it("loads the final v0.6.3 title renames and persistent Margin Loan", async () => {
    const loaded = await corpus();
    const smugglersRun = loaded.data.territories.find((territory) => territory.id === "territory-smuggler-s-pass");
    expect(smugglersRun.name).toBe("Smuggler's Run");
    expect(JSON.stringify(smugglersRun)).not.toContain("Smuggler's Pass");

    const secondLine = loaded.data.cards.find((card) => card.id === "neutral-reserves");
    expect(secondLine.name).toBe("Second Line");

    const marginLoan = loaded.data.cards.find((card) => card.id === "financiers-margin-loan");
    const marginAsset = marginLoan.effects.find((effect) => effect.label === "Asset").text;
    expect(marginAsset).toContain("After income, you may choose:");
    expect(marginAsset).toContain("While this remains banked, you may not draw at the start of your turn.");
    expect(marginAsset).not.toContain("After income on your next turn");
  });

  it("retrieves the new setup and victory rules", async () => {
    const loaded = await corpus();
    const setup = retrieveRules(loaded, "When do I arrange my Territories after drawing my opening Hand?", { limit: 8 });
    expect(setup.some((source) => source.excerpt.includes("opening Hand") && source.excerpt.includes("arrange"))).toBe(true);
    const victory = retrieveRules(loaded, "Can I win by capturing the opponent final Territory before Last Stand?", { limit: 8 });
    expect(victory.some((source) => /capture/i.test(source.excerpt) && /Last Stand/i.test(source.excerpt))).toBe(true);
  });

  it("retrieves exact final card and Territory documents rather than superseded wording", async () => {
    const loaded = await corpus();
    for (const [title, marker] of [
      ["Margin Loan", "While this remains banked, you may not draw at the start of your turn."],
      ["Shock and Awe", "Afterward, you cannot move"],
      ["Protracted Siege", "prevent that capture"],
      ["Second Line", "Second Line"],
      ["Smuggler's Run", "Smuggler's Run"]
    ]) {
      const result = retrieveRules(loaded, title, { limit: 8 });
      expect(result.some((source) =>
        source.title.includes(title) && (source.body.includes(marker) || source.title.includes(marker))
      )).toBe(true);
    }
  });
});
