import { buildRulesCorpus } from "./local-search.js";

export const V063_RULES_VERSION = "v0.6.3-candidate-2026-08-11";
export const V063_VERSION_LABEL = "Gauntlet v0.6.3 candidate";

const RULEBOOK_SOURCE_PATH = "artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_Rulebook_Candidate.md";
const CANONICAL_SOURCE_PATH = "artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json";

export function defaultDevelopmentV063SourceUrls(origin = "https://gauntlet.run") {
  const base = String(origin || "https://gauntlet.run").replace(/\/$/, "");
  return {
    rulebookUrl: `${base}/v0.6.3/rulebook/`,
    canonicalDataUrl: `${base}/v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json`,
    referenceUrl: `${base}/v0.6.3/reference/`
  };
}

export async function loadDevelopmentV063RulesCorpus({
  rulebookUrl,
  canonicalDataUrl,
  referenceUrl,
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  const defaults = defaultDevelopmentV063SourceUrls(globalThis.location?.origin || "https://gauntlet.run");
  const urls = {
    rulebookUrl: rulebookUrl || defaults.rulebookUrl,
    canonicalDataUrl: canonicalDataUrl || defaults.canonicalDataUrl,
    referenceUrl: referenceUrl || defaults.referenceUrl
  };

  const [rulebookResponse, canonicalResponse] = await Promise.all([
    fetchImpl(urls.rulebookUrl, { cache: "no-store" }),
    fetchImpl(urls.canonicalDataUrl, { cache: "no-store" })
  ]);
  if (!rulebookResponse.ok) throw new Error(`v0.6.3 candidate Rulebook returned ${rulebookResponse.status}.`);
  if (!canonicalResponse.ok) throw new Error(`v0.6.3 candidate canonical data returned ${canonicalResponse.status}.`);

  const rulebookHtml = await rulebookResponse.text();
  const canonicalData = await canonicalResponse.json();
  validateCandidateData(canonicalData);

  const rulebookMarkdown = candidateRulebookHtmlToMarkdown(rulebookHtml);
  const corpus = buildRulesCorpus({
    canonicalData,
    rulebookMarkdown,
    siteOrigin: inferOrigin(urls.rulebookUrl),
    canonicalDataUrl: urls.canonicalDataUrl,
    rulebookUrl: urls.rulebookUrl,
    rulebookBrowserUrl: urls.rulebookUrl,
    rulebookPdfUrl: urls.rulebookUrl
  });

  corpus.version = V063_RULES_VERSION;
  corpus.versionLabel = V063_VERSION_LABEL;
  corpus.candidate = true;
  corpus.publishedVersion = "v0.6.2";
  corpus.sourceUrls = urls;
  corpus.documents = corpus.documents.map((document) => ({
    ...document,
    sourcePath: document.kind === "rulebook" ? RULEBOOK_SOURCE_PATH : CANONICAL_SOURCE_PATH,
    sourceUrl: document.kind === "rulebook" ? urls.rulebookUrl : urls.referenceUrl
  }));
  corpus.byId = new Map(corpus.documents.map((document) => [document.id, document]));
  return corpus;
}

export function candidateRulebookHtmlToMarkdown(html) {
  const source = String(html || "");
  const article = source.match(/<article\b[^>]*class=["'][^"']*\brelease-doc\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/i)?.[1] || source;
  let text = article
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<hr\s*\/?\s*>/gi, "\n\n---\n\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<h([2-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, body) => `\n\n${"#".repeat(Math.max(1, Number(level) - 1))} ${stripTags(body)}\n\n`)
    .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, body) => `\n${htmlBlockToLines(body).map((line) => `> ${line}`).join("\n")}\n`)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, body) => `\n- ${stripTags(body)}`)
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, body) => `\n\n${stripTags(body)}\n\n`)
    .replace(/<td\b[^>]*>([\s\S]*?)<\/td>/gi, (_, body) => ` ${stripTags(body)} |`)
    .replace(/<tr\b[^>]*>/gi, "\n|")
    .replace(/<\/tr>/gi, "")
    .replace(/<[^>]+>/g, " ");

  text = decodeHtml(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  if (!text.includes("# Gauntlet Rulebook")) throw new Error("Candidate Rulebook HTML did not contain the expected Rulebook heading.");
  return text;
}

function validateCandidateData(data) {
  if (data?.version !== "v0.6.3-candidate") throw new Error(`Expected v0.6.3-candidate data, received ${data?.version || "unknown"}.`);
  if (data?.cards?.length !== 128) throw new Error("Expected 128 playable cards in the v0.6.3 candidate.");
  if (data?.territories?.length !== 25) throw new Error("Expected 25 Territories in the v0.6.3 candidate.");
  if (data?.normalization?.canonical_data_integration?.published_release !== false) throw new Error("Candidate data incorrectly claims published-release status.");
  if (data?.battlefield?.last_stand?.final_territory_capture_required !== false) throw new Error("Candidate data contains the obsolete final-Territory capture prerequisite for Last Stand.");
  if (data?.setup?.sequence?.[0] !== "prepare_faction_components") throw new Error("Candidate data contains obsolete setup ordering.");

  const smugglersRun = data.territories.find((territory) => territory.id === "territory-smuggler-s-pass");
  if (smugglersRun?.name !== "Smuggler's Run") throw new Error("Candidate data is missing the Smuggler's Run title rename.");
  if (JSON.stringify(smugglersRun).includes("Smuggler's Pass")) throw new Error("Candidate Smuggler's Run still contains an active Smuggler's Pass self-reference.");

  const secondLine = data.cards.find((card) => card.id === "neutral-reserves");
  if (secondLine?.name !== "Second Line") throw new Error("Candidate data is missing the Second Line card-title rename.");

  const marginLoan = data.cards.find((card) => card.id === "financiers-margin-loan");
  const marginAsset = marginLoan?.effects?.find((effect) => effect.label === "Asset")?.text || marginLoan?.asset || "";
  if (!marginAsset.includes("After income, you may choose:")) throw new Error("Margin Loan still has mandatory next-turn settlement timing.");
  if (!marginAsset.includes("While this remains banked, you may not draw at the start of your turn.")) throw new Error("Margin Loan is missing its persistent banked draw restriction.");
  if (marginAsset.includes("After income on your next turn")) throw new Error("Margin Loan still contains the retired next-turn-only wording.");
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function htmlBlockToLines(value) {
  return String(value || "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\n+/)
    .map((line) => decodeHtml(line).replace(/[ \t]{2,}/g, " ").trim())
    .filter(Boolean);
}

function decodeHtml(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&nbsp;", " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function inferOrigin(url) {
  try { return new URL(url).origin; } catch { return "https://gauntlet.run"; }
}
