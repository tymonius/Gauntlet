import { loadV063RulesCorpus } from "./v063-public-corpus.js";

export const V064_CANDIDATE_RULES_VERSION = "v0.6.4-candidate";
export const V064_CANDIDATE_VERSION_LABEL = "Gauntlet v0.6.4 candidate";
export const V064_PROPOSAL_SOURCE_PATH = "docs/v0.6.4-diplomat-proposals.json";
export const V064_PROPOSAL_SOURCE_ISSUE = 617;
export const V064_ARCANE_SYMBOL_SOURCE_PATH = "docs/v0.6.4-arcane-symbol.json";

export function defaultV064CandidateSourceUrls(origin = "https://gauntlet.run") {
  const base = String(origin || "https://gauntlet.run").replace(/\/$/, "");
  return {
    proposalSourceUrl: `${base}/${V064_PROPOSAL_SOURCE_PATH}`,
    arcaneSymbolSourceUrl: `${base}/${V064_ARCANE_SYMBOL_SOURCE_PATH}`
  };
}

export async function loadV064CandidateRulesCorpus({
  proposalSourceUrl,
  arcaneSymbolSourceUrl,
  fetchImpl = globalThis.fetch,
  ...v063Options
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");

  const baseCorpusPromise = loadV063RulesCorpus({ ...v063Options, fetchImpl });
  const defaults = defaultV064CandidateSourceUrls(
    globalThis.location?.origin || "https://gauntlet.run"
  );
  const proposalUrl = proposalSourceUrl || defaults.proposalSourceUrl;
  const arcaneUrl = arcaneSymbolSourceUrl || defaults.arcaneSymbolSourceUrl;
  const proposalResponsePromise = fetchImpl(proposalUrl, { cache: "no-store" });
  const arcaneResponsePromise = fetchImpl(arcaneUrl, { cache: "no-store" });

  const [baseCorpus, proposalResponse, arcaneResponse] = await Promise.all([
    baseCorpusPromise,
    proposalResponsePromise,
    arcaneResponsePromise
  ]);

  if (!proposalResponse.ok) {
    throw new Error(`v0.6.4 Proposal candidate source returned ${proposalResponse.status}.`);
  }
  if (!arcaneResponse.ok) {
    throw new Error(`v0.6.4 Arcane-symbol candidate source returned ${arcaneResponse.status}.`);
  }

  const proposalSource = await proposalResponse.json();
  const arcaneSource = await arcaneResponse.json();
  const proposalCorpus = applyV064ProposalOverride(baseCorpus, proposalSource, proposalUrl);
  return applyV064ArcaneSymbolOverride(proposalCorpus, arcaneSource, arcaneUrl);
}

export function applyV064ProposalOverride(baseCorpus, proposalSource, sourceUrl) {
  validateV064ProposalSource(proposalSource);

  const proposalNames = new Set(proposalSource.proposals.map((proposal) => proposal.name));
  const retainedDocuments = (baseCorpus?.documents || []).filter((document) => {
    return !(document.kind === "rulebook" && proposalNames.has(document.heading));
  });
  const proposalDocuments = buildV064ProposalDocuments(proposalSource, sourceUrl);
  const documents = [...retainedDocuments, ...proposalDocuments];

  return {
    ...baseCorpus,
    version: V064_CANDIDATE_RULES_VERSION,
    versionLabel: V064_CANDIDATE_VERSION_LABEL,
    published: false,
    currentPublicRelease: "v0.6.3",
    candidateBaseVersion: "v0.6.3",
    proposalSourceIssue: V064_PROPOSAL_SOURCE_ISSUE,
    proposalSourcePath: V064_PROPOSAL_SOURCE_PATH,
    proposalSourceUrl: sourceUrl,
    proposalSource,
    documents,
    byId: new Map(documents.map((document) => [document.id, document]))
  };
}

export function applyV064ArcaneSymbolOverride(baseCorpus, arcaneSource, sourceUrl) {
  validateV064ArcaneSymbolSource(arcaneSource);
  const replacedHeadings = new Set([
    arcaneSource.general_rule.heading,
    arcaneSource.mystics_rule.heading
  ]);
  const retainedDocuments = (baseCorpus?.documents || []).filter((document) => {
    return !(document.kind === "rulebook" && replacedHeadings.has(document.heading));
  });
  const arcaneDocuments = buildV064ArcaneSymbolDocuments(arcaneSource, sourceUrl);
  const documents = [...retainedDocuments, ...arcaneDocuments];

  return {
    ...baseCorpus,
    version: V064_CANDIDATE_RULES_VERSION,
    versionLabel: V064_CANDIDATE_VERSION_LABEL,
    published: false,
    currentPublicRelease: "v0.6.3",
    candidateBaseVersion: "v0.6.3",
    arcaneSymbolSourcePath: V064_ARCANE_SYMBOL_SOURCE_PATH,
    arcaneSymbolSourceUrl: sourceUrl,
    arcaneSymbolSource: arcaneSource,
    documents,
    byId: new Map(documents.map((document) => [document.id, document]))
  };
}

export function buildV064ProposalDocuments(proposalSource, sourceUrl) {
  validateV064ProposalSource(proposalSource);
  const resolvedUrl = sourceUrl || defaultV064CandidateSourceUrls().proposalSourceUrl;

  return proposalSource.proposals.map((proposal) => {
    const body = [
      `Stake: ${proposal.stake}`,
      `Requirement: ${proposal.requirement}`,
      `Accepted: ${proposal.accepted}`,
      `Refused: ${proposal.refused}`
    ].join("\n");

    return {
      id: `proposal:${proposal.id}`,
      kind: "proposal",
      title: `Proposal: ${proposal.name}`,
      heading: proposal.name,
      body,
      sourcePath: V064_PROPOSAL_SOURCE_PATH,
      sourceUrl: resolvedUrl,
      searchText: `${proposal.name} ${body}`.toLowerCase()
    };
  });
}

export function buildV064ArcaneSymbolDocuments(arcaneSource, sourceUrl) {
  validateV064ArcaneSymbolSource(arcaneSource);
  const resolvedUrl = sourceUrl || defaultV064CandidateSourceUrls().arcaneSymbolSourceUrl;
  return [arcaneSource.general_rule, arcaneSource.mystics_rule].map((rule) => ({
    id: `rulebook:v064-${rule.id}`,
    kind: "rulebook",
    title: rule.id === "arcane-symbol"
      ? "Cards, Zones, and the Play Area › Arcane symbol"
      : "Mystics › Arcane trait",
    heading: rule.heading,
    body: rule.body,
    sourcePath: V064_ARCANE_SYMBOL_SOURCE_PATH,
    sourceUrl: resolvedUrl,
    searchText: `${rule.heading} ${rule.body}`.toLowerCase()
  }));
}

export function validateV064ProposalSource(source) {
  if (!source || typeof source !== "object") {
    throw new Error("v0.6.4 Proposal candidate source is missing.");
  }
  if (source.version !== V064_CANDIDATE_RULES_VERSION) {
    throw new Error(`Unexpected Proposal candidate version: ${source.version || "missing"}.`);
  }
  if (source.base_version !== "v0.6.3") {
    throw new Error("v0.6.4 Proposal candidate must remain based on v0.6.3.");
  }
  if (source.source_issue !== V064_PROPOSAL_SOURCE_ISSUE) {
    throw new Error(`v0.6.4 Proposal candidate must remain pinned to issue #${V064_PROPOSAL_SOURCE_ISSUE}.`);
  }
  if (source.mechanics_changed !== false) {
    throw new Error("Issue #617 Proposal candidate must remain wording-only.");
  }
  if (!Array.isArray(source.proposals) || source.proposals.length !== 9) {
    throw new Error("Expected all nine approved Diplomat Proposals.");
  }

  const ids = new Set();
  for (const proposal of source.proposals) {
    for (const field of ["id", "name", "requirement", "accepted", "refused"]) {
      if (typeof proposal?.[field] !== "string" || !proposal[field].trim()) {
        throw new Error(`Proposal ${proposal?.id || "unknown"} is missing ${field}.`);
      }
    }
    if (!Number.isInteger(proposal.stake) || proposal.stake < 0) {
      throw new Error(`Proposal ${proposal.id} has an invalid Stake.`);
    }
    if (ids.has(proposal.id)) throw new Error(`Duplicate Proposal id: ${proposal.id}.`);
    ids.add(proposal.id);
  }

  return true;
}

export function validateV064ArcaneSymbolSource(source) {
  if (!source || typeof source !== "object") {
    throw new Error("v0.6.4 Arcane-symbol candidate source is missing.");
  }
  if (source.version !== V064_CANDIDATE_RULES_VERSION) {
    throw new Error(`Unexpected Arcane-symbol candidate version: ${source.version || "missing"}.`);
  }
  if (source.base_version !== "v0.6.3") {
    throw new Error("v0.6.4 Arcane-symbol candidate must remain based on v0.6.3.");
  }
  if (source.mechanics_changed !== false) {
    throw new Error("The Arcane-symbol candidate must remain a visual/rules clarification only.");
  }
  for (const key of ["general_rule", "mystics_rule"]) {
    const rule = source[key];
    for (const field of ["id", "heading", "placement", "body"]) {
      if (typeof rule?.[field] !== "string" || !rule[field].trim()) {
        throw new Error(`Arcane-symbol ${key} is missing ${field}.`);
      }
    }
  }
  if (!/Mystics sigil/.test(source.general_rule.body)
    || !/shape identifies the Arcane trait/.test(source.general_rule.body)
    || !/color reflects the card's allegiance/.test(source.general_rule.body)) {
    throw new Error("The general Arcane-symbol rule must explain symbol shape and allegiance color.");
  }
  return true;
}
