import { loadV063RulesCorpus } from "./v063-public-corpus.js";
import { loadCurrentGame } from "../game-data/current-game.mjs";

export const CURRENT_GAME_AUTHORITY_PATH = "game-data/current-game.json";
export const V064_CANDIDATE_RULES_VERSION = "v0.6.4-candidate";
export const V064_CANDIDATE_VERSION_LABEL = "Gauntlet v0.6.4 candidate";
export const V064_PROPOSAL_SOURCE_PATH = CURRENT_GAME_AUTHORITY_PATH;
export const V064_PROPOSAL_SOURCE_ISSUE = 617;
export const V064_ARCANE_SYMBOL_SOURCE_PATH = CURRENT_GAME_AUTHORITY_PATH;
export const V064_TERRITORY_SOURCE_PATH = CURRENT_GAME_AUTHORITY_PATH;
export const V064_TERRITORY_SOURCE_ISSUE = 738;
export const V064_RULES_SOURCE_PATH = CURRENT_GAME_AUTHORITY_PATH;
export const V064_CARD_SOURCE_PATH = CURRENT_GAME_AUTHORITY_PATH;

export function defaultV064CandidateSourceUrls(origin = "https://gauntlet.run") {
  const base = String(origin || "https://gauntlet.run").replace(/\/$/, "");
  const authorityUrl = `${base}/${CURRENT_GAME_AUTHORITY_PATH}`;
  return {
    currentGameAuthorityUrl: authorityUrl,
    proposalSourceUrl: authorityUrl,
    arcaneSymbolSourceUrl: authorityUrl,
    territorySourceUrl: authorityUrl,
    rulesSourceUrl: authorityUrl,
    cardSourceUrl: authorityUrl
  };
}

export async function loadV064CandidateRulesCorpus({
  fetchImpl = globalThis.fetch,
  ...v063Options
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");

  const [baseCorpus, currentGame] = await Promise.all([
    loadV063RulesCorpus({ ...v063Options, fetchImpl }),
    loadCurrentGame()
  ]);

  if (currentGame.version !== V064_CANDIDATE_RULES_VERSION) {
    throw new Error(`Rules Arbiter expected ${V064_CANDIDATE_RULES_VERSION}, received ${currentGame.version}.`);
  }
  if (baseCorpus.version !== currentGame.baseVersion) {
    throw new Error(`Rules Arbiter base corpus ${baseCorpus.version} does not match current-game base ${currentGame.baseVersion}.`);
  }

  const authorityUrl = currentGame.authorityUrl;
  const proposalSource = {
    version: currentGame.version,
    base_version: currentGame.baseVersion,
    source_issue: currentGame.sourceMetadata?.proposals?.sourceIssue ?? V064_PROPOSAL_SOURCE_ISSUE,
    mechanics_changed: false,
    proposals: currentGame.proposals
  };
  const territorySource = {
    version: currentGame.version,
    base_version: currentGame.baseVersion,
    source_issue: currentGame.sourceMetadata?.territories?.sourceIssue ?? V064_TERRITORY_SOURCE_ISSUE,
    mechanics_changed: true,
    count: currentGame.territories.length,
    territories: currentGame.territories
  };
  const arcaneSource = currentGame.arcaneSymbol;
  const rulesSource = currentGame.ruleChanges;

  const rulesCorpus = applyV064SharedRulesOverride(baseCorpus, rulesSource, authorityUrl);
  const cardCorpus = applyV064CardOverride(rulesCorpus, currentGame.cards, authorityUrl);
  const proposalCorpus = applyV064ProposalOverride(cardCorpus, proposalSource, authorityUrl);
  const arcaneCorpus = applyV064ArcaneSymbolOverride(proposalCorpus, arcaneSource, authorityUrl);
  const resolved = applyV064TerritoryOverride(arcaneCorpus, territorySource, authorityUrl);
  return {
    ...resolved,
    currentGameAuthority: authorityUrl,
    currentGameVersion: currentGame.version,
    currentGameSources: currentGame.sources,
    rulesSourcePath: V064_RULES_SOURCE_PATH,
    rulesSourceUrl: authorityUrl,
    rulesSource,
    cardSourcePath: V064_CARD_SOURCE_PATH,
    cardSourceUrl: authorityUrl
  };
}

export function applyV064SharedRulesOverride(baseCorpus, rulesSource, sourceUrl) {
  validateV064RulesSource(rulesSource);
  const currentRuleDocuments = buildV064RuleDocuments(rulesSource, sourceUrl);
  const retainedDocuments = (baseCorpus?.documents || []).filter((document) => {
    if (document.kind !== "rulebook") return true;
    return !/pending battle/i.test(`${document.heading || ""} ${document.body || ""}`);
  });
  const documents = [...retainedDocuments, ...currentRuleDocuments];

  return {
    ...baseCorpus,
    version: V064_CANDIDATE_RULES_VERSION,
    versionLabel: V064_CANDIDATE_VERSION_LABEL,
    published: false,
    currentPublicRelease: "v0.6.3",
    candidateBaseVersion: "v0.6.3",
    rulesSourcePath: V064_RULES_SOURCE_PATH,
    rulesSourceUrl: sourceUrl,
    rulesSource,
    data: baseCorpus?.data
      ? {
          ...baseCorpus.data,
          battle: applyBattleRuleOverride(baseCorpus.data.battle, rulesSource.battle)
        }
      : baseCorpus?.data,
    documents,
    byId: new Map(documents.map((document) => [document.id, document]))
  };
}

export function applyV064CardOverride(baseCorpus, cards, sourceUrl) {
  if (!Array.isArray(cards) || !cards.length) throw new Error("Current-game card pool is missing.");
  const retainedDocuments = (baseCorpus?.documents || []).filter((document) => document.kind !== "card");
  const cardDocuments = buildV064CardDocuments(cards, sourceUrl);
  const documents = [...retainedDocuments, ...cardDocuments];

  return {
    ...baseCorpus,
    cardSourcePath: V064_CARD_SOURCE_PATH,
    cardSourceUrl: sourceUrl,
    documents,
    byId: new Map(documents.map((document) => [document.id, document]))
  };
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

export function applyV064TerritoryOverride(baseCorpus, territorySource, sourceUrl) {
  validateV064TerritorySource(territorySource);
  const retainedDocuments = (baseCorpus?.documents || []).filter((document) => {
    return document.kind !== "territory" && document.kind !== "arena";
  });
  const territoryDocuments = buildV064TerritoryDocuments(territorySource, sourceUrl);
  const documents = [...retainedDocuments, ...territoryDocuments];

  const baseTerritories = Array.isArray(baseCorpus?.data?.territories)
    ? baseCorpus.data.territories
    : [];
  const baseById = new Map(baseTerritories.map((territory) => [territory.id, territory]));
  const territories = territorySource.territories.map((territory) => ({
    ...(baseById.get(territory.id) || {}),
    ...territory,
    effects: territory.effects
  }));

  return {
    ...baseCorpus,
    version: V064_CANDIDATE_RULES_VERSION,
    versionLabel: V064_CANDIDATE_VERSION_LABEL,
    published: false,
    currentPublicRelease: "v0.6.3",
    candidateBaseVersion: "v0.6.3",
    territorySourceIssue: V064_TERRITORY_SOURCE_ISSUE,
    territorySourcePath: V064_TERRITORY_SOURCE_PATH,
    territorySourceUrl: sourceUrl,
    territorySource,
    data: baseCorpus?.data ? { ...baseCorpus.data, territories } : baseCorpus?.data,
    documents,
    byId: new Map(documents.map((document) => [document.id, document]))
  };
}

export function buildV064RuleDocuments(rulesSource, sourceUrl) {
  validateV064RulesSource(rulesSource);
  const resolvedUrl = sourceUrl || defaultV064CandidateSourceUrls().currentGameAuthorityUrl;
  return rulesSource.rulebook_overrides.map((rule) => ({
    id: `rulebook:v064-${rule.id}`,
    kind: "rulebook",
    title: `Current rules › ${rule.heading}`,
    heading: rule.heading,
    body: rule.body,
    sourcePath: V064_RULES_SOURCE_PATH,
    sourceUrl: resolvedUrl,
    searchText: `${rule.heading} ${rule.body}`.toLowerCase()
  }));
}

export function buildV064CardDocuments(cards, sourceUrl) {
  const resolvedUrl = sourceUrl || defaultV064CandidateSourceUrls().currentGameAuthorityUrl;
  return cards.map((card) => {
    const body = [
      card.allegiance && `Allegiance: ${card.allegiance}`,
      Number.isFinite(Number(card.cost)) && `Deckbuilding Value: ${Number(card.cost)}`,
      ...(Array.isArray(card.effects)
        ? card.effects.map((effect) => `${effect.label}: ${effect.text}`)
        : [])
    ].filter(Boolean).join("\n");
    return {
      id: `card:${card.id}`,
      kind: "card",
      title: `Card: ${card.name}`,
      heading: card.name,
      body,
      sourcePath: V064_CARD_SOURCE_PATH,
      sourceUrl: resolvedUrl,
      searchText: `${card.name} ${body}`.toLowerCase()
    };
  });
}

export function buildV064ProposalDocuments(proposalSource, sourceUrl) {
  validateV064ProposalSource(proposalSource);
  const resolvedUrl = sourceUrl || defaultV064CandidateSourceUrls().currentGameAuthorityUrl;

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
  const resolvedUrl = sourceUrl || defaultV064CandidateSourceUrls().currentGameAuthorityUrl;
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

export function buildV064TerritoryDocuments(territorySource, sourceUrl) {
  validateV064TerritorySource(territorySource);
  const resolvedUrl = sourceUrl || defaultV064CandidateSourceUrls().currentGameAuthorityUrl;
  return territorySource.territories.map((territory) => {
    const kind = territory.arena ? "arena" : "territory";
    return {
      id: `${kind}:${territory.id}`,
      kind,
      title: territory.arena ? territory.name : `Territory: ${territory.name}`,
      heading: territory.name,
      body: territory.text,
      sourcePath: V064_TERRITORY_SOURCE_PATH,
      sourceUrl: resolvedUrl,
      searchText: `${territory.name} ${territory.text}`.toLowerCase()
    };
  });
}

export function validateV064RulesSource(source) {
  if (!source || typeof source !== "object") {
    throw new Error("v0.6.4 rules source is missing.");
  }
  if (source.schema_version !== 1 || source.version !== V064_CANDIDATE_RULES_VERSION) {
    throw new Error(`Unexpected v0.6.4 rules source version: ${source.version || "missing"}.`);
  }
  if (source.base_version !== "v0.6.3") {
    throw new Error("v0.6.4 rules source must remain based on v0.6.3.");
  }
  if (source.change_type !== "collapse-pending-battle-into-onset" || source.mechanics_changed !== true) {
    throw new Error("v0.6.4 rules source must contain the accepted Onset migration.");
  }
  if (!source.battle || !Array.isArray(source.rulebook_overrides) || !source.rulebook_overrides.length) {
    throw new Error("v0.6.4 rules source is missing battle or rulebook overrides.");
  }
  if (Array.isArray(source.battle.pending_sequence)) {
    throw new Error("v0.6.4 current battle rules cannot retain a pending battle sequence.");
  }
  return true;
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

export function validateV064TerritorySource(source) {
  if (!source || typeof source !== "object") {
    throw new Error("v0.6.4 Territory candidate source is missing.");
  }
  if (source.version !== V064_CANDIDATE_RULES_VERSION) {
    throw new Error(`Unexpected Territory candidate version: ${source.version || "missing"}.`);
  }
  if (source.base_version !== "v0.6.3") {
    throw new Error("v0.6.4 Territory candidate must remain based on v0.6.3.");
  }
  if (source.source_issue !== V064_TERRITORY_SOURCE_ISSUE) {
    throw new Error(`v0.6.4 Territory candidate must remain pinned to issue #${V064_TERRITORY_SOURCE_ISSUE}.`);
  }
  if (source.mechanics_changed !== true) {
    throw new Error("Issue #738 Territory candidate must retain its approved clarification metadata.");
  }
  if (source.count !== 25 || !Array.isArray(source.territories) || source.territories.length !== 25) {
    throw new Error("Expected all 25 approved Territories and Arenas.");
  }

  const ids = new Set();
  let arenaCount = 0;
  for (const territory of source.territories) {
    for (const field of ["id", "name", "text", "type"]) {
      if (typeof territory?.[field] !== "string" || !territory[field].trim()) {
        throw new Error(`Territory ${territory?.id || "unknown"} is missing ${field}.`);
      }
    }
    if (!Number.isInteger(territory.number) || territory.number < 1 || territory.number > 25) {
      throw new Error(`Territory ${territory.id} has an invalid number.`);
    }
    if (!Array.isArray(territory.effects)
      || territory.effects.length !== 1
      || territory.effects[0]?.label !== "Text"
      || territory.effects[0]?.text !== territory.text) {
      throw new Error(`Territory ${territory.id} must keep its Text effect synchronized.`);
    }
    if (ids.has(territory.id)) throw new Error(`Duplicate Territory id: ${territory.id}.`);
    ids.add(territory.id);
    if (territory.arena) arenaCount += 1;
  }
  if (arenaCount !== 4) throw new Error(`Expected four Arenas, received ${arenaCount}.`);
  return true;
}

function applyBattleRuleOverride(base, override) {
  const result = { ...(base || {}), ...(override || {}) };
  const removeFields = Array.isArray(override?.remove_fields) ? override.remove_fields : [];
  delete result.remove_fields;
  for (const field of removeFields) delete result[field];
  return result;
}
