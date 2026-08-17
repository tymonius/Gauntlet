import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const targetRoot = 'artifacts/reconstruction/clean-v0.6.3';
const outRoot = `${targetRoot}/faction-guides`;
const certificationPath = 'artifacts/reconstruction/clean-v0.6.2/certification/authority-set.json';
const planPath = 'config/reconstruction-version-plan.json';
const resolutionsPath = 'config/reconstruction-version-resolutions.json';
const lifecyclePath = 'config/release-lifecycle.json';
const evidencePath = 'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json';
const evidenceGitBlob = '955dfa654cac96a9de820867ab694e83d0fb1d36';
const cleanV062AuthoritySetId = '563ce3a0ac39a0bbba52cc113ae9ffbcaeb3c0985bad4cfa66fe462fb2cacb3b';

const factionDefs = [
  {
    slug: 'military',
    title: 'Military',
    allegiance: 'Military',
    source: 'artifacts/reconstruction/clean-v0.6.2/faction-guides/military/Gauntlet_v0.6.2_Military_Faction_Guide.md',
    output: `${outRoot}/military/Gauntlet_v0.6.3_Military_Faction_Guide.md`,
  },
  {
    slug: 'diplomat',
    title: 'Diplomat',
    allegiance: 'Diplomats',
    source: 'artifacts/reconstruction/clean-v0.6.2/faction-guides/diplomat/Gauntlet_v0.6.2_Diplomat_Faction_Guide.md',
    output: `${outRoot}/diplomat/Gauntlet_v0.6.3_Diplomat_Faction_Guide.md`,
  },
  {
    slug: 'financier',
    title: 'Financier',
    allegiance: 'Financiers',
    source: 'artifacts/reconstruction/clean-v0.6.2/faction-guides/financier/Gauntlet_v0.6.2_Financier_Faction_Guide.md',
    output: `${outRoot}/financier/Gauntlet_v0.6.3_Financier_Faction_Guide.md`,
  },
  {
    slug: 'intelligence',
    title: 'Intelligence',
    allegiance: 'Intelligence',
    source: 'artifacts/reconstruction/clean-v0.6.2/faction-guides/intelligence/Gauntlet_v0.6.2_Intelligence_Faction_Guide.md',
    output: `${outRoot}/intelligence/Gauntlet_v0.6.3_Intelligence_Faction_Guide.md`,
  },
  {
    slug: 'mystics',
    title: 'Mystics',
    allegiance: 'Mystics',
    source: 'artifacts/reconstruction/clean-v0.6.2/faction-guides/mystics/Gauntlet_v0.6.2_Mystics_Faction_Guide.md',
    output: `${outRoot}/mystics/Gauntlet_v0.6.3_Mystics_Faction_Guide.md`,
  },
  {
    slug: 'inquisition',
    title: 'Inquisition',
    allegiance: 'Inquisition',
    source: 'artifacts/reconstruction/clean-v0.6.2/faction-guides/inquisition/Gauntlet_v0.6.2_Inquisition_Faction_Guide.md',
    output: `${outRoot}/inquisition/Gauntlet_v0.6.3_Inquisition_Faction_Guide.md`,
  },
];

const requiredDeltas = [
  'rules-deck-draw-pile-terms',
  'setup-draw4-discard1-keep3',
  'setup-informed-territory-arrangement',
  'setup-first-player-after-arrangement',
  'setup-start-on-own-end-territory',
  'victory-final-territory-capture',
  'victory-independent-last-stand',
  'victory-run-the-gauntlet-umbrella',
  'cards-role-headings',
  'cards-asset-only-banked-heading',
  'cards-inherent-bank-action',
  'cards-directly-permitted-procedures',
  'cards-effect-granted-movement',
  'cards-additional-tactic-defaults',
  'cards-sanctions-shared-rule',
  'cards-asset-removed-event',
  'cards-bind-defaults',
  'cards-reveal-interference-priority',
  'cards-apply-repeat-effects',
  'cards-no-winner-cleanup',
  'cards-reroll-new-result-default',
  'card-protracted-siege-revision',
  'card-margin-loan-persistent',
  'identity-second-line',
  'identity-smugglers-run',
];

const targetedFactionCards = [
  'Shock and Awe',
  'Reserve Force',
  'Fog of War',
  'Necromancy',
  'Sleeper Network',
  'Give Chase',
  'Speculation',
  'Hold the Line',
  'Intercepted Orders',
  "Nature's Altar",
  'Field Command',
  'Counterworks',
  'Martyrdom',
  'Rearguard',
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function gitBlobSha(text) {
  const bytes = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

function lineCount(text) {
  return text.length === 0 ? 0 : text.split('\n').length;
}

function verifyInputs() {
  const certification = readJson(certificationPath);
  const plan = readJson(planPath);
  const resolutions = readJson(resolutionsPath);
  const lifecycle = readJson(lifecyclePath);
  const evidenceText = read(evidencePath);
  const evidence = JSON.parse(evidenceText);

  invariant(certification.status === 'certified_on_merge', 'clean v0.6.2 authority must be certified');
  invariant(certification.authority_set_id === cleanV062AuthoritySetId, 'unexpected clean v0.6.2 authority-set ID');
  invariant(certification.publication_unlocked === false, 'clean v0.6.2 certification must not unlock publication');

  const target = plan.targets?.['clean-v0.6.3'];
  invariant(plan.publication_unlocked === false, 'reconstruction publication must remain locked');
  invariant(target?.authority_base === 'clean-v0.6.2', 'clean v0.6.3 authority base must be clean v0.6.2');
  invariant(target?.authority_build_unlocked === true, 'clean v0.6.3 authority construction must be unlocked');
  invariant(target?.unlock?.basis === 'certified_clean_v0.6.2_authority', 'clean v0.6.3 unlock basis drifted');
  invariant(target?.unlock?.authority_set_id === cleanV062AuthoritySetId, 'clean v0.6.3 unlock must pin the certified clean v0.6.2 authority set');
  invariant(target?.unlock?.publication_unlocked === false, 'clean v0.6.3 unlock must not unlock publication');

  const deltaSet = new Set(target?.required_v063_deltas ?? []);
  for (const id of requiredDeltas) invariant(deltaSet.has(id), `required clean v0.6.3 delta missing: ${id}`);

  const recovered = resolutions['clean-v0.6.3']?.additional_recovered_decisions ?? [];
  const recoveredIds = recovered.map((entry) => entry.id).sort();
  const expectedRecovered = ['GNT-DEC-2026-0812-001', 'GNT-DEC-2026-0812-002', 'GNT-DEC-2026-0812-003'];
  invariant(JSON.stringify(recoveredIds) === JSON.stringify(expectedRecovered), 'late v0.6.3 recovered-decision set drifted');
  for (const entry of recovered) {
    invariant(entry.version_disposition === 'adopt', `${entry.id} must remain adopted for clean v0.6.3`);
    invariant(entry.evidence?.includes('https://github.com/tymonius/Gauntlet/pull/571'), `${entry.id} must remain pinned to PR #571`);
  }

  invariant(lifecycle.current_release === 'v0.6.1', 'v0.6.1 must remain current/public during reconstruction');
  invariant(lifecycle.releases?.['v0.6.2']?.status === 'withdrawn', 'historical v0.6.2 must remain withdrawn');
  invariant(lifecycle.releases?.['v0.6.3']?.status === 'withdrawn', 'historical v0.6.3 must remain withdrawn');

  invariant(gitBlobSha(evidenceText) === evidenceGitBlob, `v0.6.3 canonical-data evidence blob drifted; expected ${evidenceGitBlob}`);
  invariant(evidence.version === 'v0.6.3-candidate', 'unexpected v0.6.3 evidence version');
  invariant(Array.isArray(evidence.cards) && evidence.cards.length === 128, 'v0.6.3 evidence must contain 128 playable cards');

  const certifiedByPath = new Map((certification.authority_files ?? []).map((entry) => [entry.path, entry]));
  for (const faction of factionDefs) {
    const entry = certifiedByPath.get(faction.source);
    invariant(entry, `certification manifest does not include ${faction.source}`);
    const text = read(faction.source);
    invariant(sha256(text) === entry.sha256, `certified clean v0.6.2 source drifted: ${faction.source}`);
  }

  return { certification, plan, resolutions, lifecycle, evidence, evidenceText, certifiedByPath };
}

function findCardSection(text, factionTitle) {
  const startMatch = text.match(/^# \d+\. Canonical .* card pool$/m);
  invariant(startMatch, `${factionTitle}: canonical card-pool section missing`);
  const start = startMatch.index;
  const afterStart = start + startMatch[0].length;
  const quickMatch = text.slice(afterStart).match(/^# \d+\. Quick reference$/m);
  invariant(quickMatch, `${factionTitle}: quick-reference boundary missing`);
  const end = afterStart + quickMatch.index;
  return { start, end, heading: startMatch[0] };
}

function parseBaseCards(text, factionTitle) {
  const { start, end } = findCardSection(text, factionTitle);
  const section = text.slice(start, end);
  const headingMatches = [...section.matchAll(/^## (.+)$/gm)];
  invariant(headingMatches.length === 13, `${factionTitle}: expected 13 certified card headings, found ${headingMatches.length}`);

  return headingMatches.map((match, index) => {
    const blockStart = match.index;
    const blockEnd = index + 1 < headingMatches.length ? headingMatches[index + 1].index : section.length;
    const block = section.slice(blockStart, blockEnd);
    const costMatch = block.match(/^\*\*Cost:\*\* (\d+)/m);
    invariant(costMatch, `${factionTitle}/${match[1]}: cost missing in certified source`);
    const traitMatch = block.match(/^\*\*Trait:\*\* (.+)$/m);
    const formMatch = block.match(/^\*\*Card form:\*\* (.+)$/m);
    const uniqueMatch = block.match(/^\*\*Unique:\*\* (.+)$/m);
    return {
      name: match[1].trim(),
      cost: Number(costMatch[1]),
      trait: traitMatch?.[1]?.trim() ?? null,
      card_form: formMatch?.[1]?.trim() ?? null,
      unique: Boolean(uniqueMatch),
    };
  });
}

function verifyFactionEvidence(baseCards, evidenceCards, faction) {
  invariant(evidenceCards.length === 13, `${faction.title}: v0.6.3 evidence must contain 13 faction cards`);
  const byName = new Map(evidenceCards.map((card) => [card.name, card]));
  invariant(byName.size === 13, `${faction.title}: duplicate card title in v0.6.3 evidence`);

  const baseNames = baseCards.map((card) => card.name);
  const evidenceNames = [...byName.keys()].sort();
  invariant(JSON.stringify([...baseNames].sort()) === JSON.stringify(evidenceNames), `${faction.title}: faction card identity set drifted between certified clean v0.6.2 and v0.6.3 evidence`);

  for (const base of baseCards) {
    const card = byName.get(base.name);
    invariant(card, `${faction.title}: missing v0.6.3 evidence card ${base.name}`);
    invariant(card.cost === base.cost, `${faction.title}/${base.name}: cost drifted (${base.cost} -> ${card.cost})`);
    invariant((card.trait ?? null) === base.trait, `${faction.title}/${base.name}: trait drifted`);
    const cardFormMatches = (card.card_form ?? null) === base.card_form || (base.name === 'Extraordinary Rendition' && base.card_form === 'Asset with a bound opposing card' && card.card_form === 'Asset');
    invariant(cardFormMatches, `${faction.title}/${base.name}: card form drifted outside the approved Extraordinary Rendition normalization`);
    invariant(Boolean(card.unique) === base.unique, `${faction.title}/${base.name}: unique status drifted`);
    invariant(Array.isArray(card.effects) && card.effects.length > 0, `${faction.title}/${base.name}: v0.6.3 effect list missing`);
    invariant(!(card.effects ?? []).some((effect) => ['Battle', 'Activate', 'Use'].includes(effect.label)), `${faction.title}/${base.name}: retired effect heading survives in v0.6.3 evidence`);
  }

  return byName;
}

function renderCard(card) {
  const metadata = [`**Cost:** ${card.cost}`];
  if (card.trait) metadata.push(`**Trait:** ${card.trait}`);
  if (card.card_form) metadata.push(`**Card form:** ${card.card_form}`);
  if (card.unique) metadata.push(`**Unique:** ${(card.unique_rule ?? 'Maximum one copy per Deck.').replaceAll('Playable Deck', 'Deck')}`);

  const effects = card.effects
    .map((effect) => `> **${effect.label}:** ${effect.text}`)
    .join('\n>\n');

  const notes = Array.isArray(card.rules_notes) ? card.rules_notes : [];
  const notesText = notes.length ? `\n\n${notes.join('\n\n')}` : '';
  return `## ${card.name}\n\n${metadata.join('  \n')}\n\n${effects}${notesText}`;
}

function normalizeNonCardProse(text, faction) {
  const oldTitle = `# Gauntlet v0.6.2 ${faction.title} Faction Guide`;
  const newTitle = `# Gauntlet v0.6.3 ${faction.title} Faction Guide`;
  invariant(text.includes(oldTitle), `${faction.title}: certified title missing`);
  text = text.replace(oldTitle, newTitle);

  const noticePattern = new RegExp(`> \\*\\*Clean v0\\.6\\.2 ${faction.title} faction authority candidate\\.\\*\\*[^\\n]*`);
  invariant(noticePattern.test(text), `${faction.title}: clean v0.6.2 source notice missing`);
  text = text.replace(
    noticePattern,
    `> **Clean v0.6.3 ${faction.title} faction authority candidate.** Reconstructed from the certified clean v0.6.2 faction authority plus only the approved clean-v0.6.3 deltas. Faction-card wording is adopted from the pinned finalized v0.6.3 canonical-data evidence; that evidence is not an authority skeleton. Shared rules remain the certified clean v0.6.2 Rulebook plus approved v0.6.3 shared-rule deltas until the clean v0.6.3 Rulebook is reconstructed. The withdrawn v0.6.3 Rulebook and combined faction guide are forbidden authority sources.`
  );

  if (faction.slug === 'diplomat') {
    const oldSanctions = "## Sanctions\n\n**Sanctions** is a shared title series, not a separate card type.\n\nEach Sanction identifies:\n\n- the opponent whose refusal allowed it to enter play; and\n- its owner.\n\nIts ongoing effect and relief condition continue to refer to those identified players even if an Overlay changes control with its Territory.";
    const v063Sanctions = "## Sanctions\n\n**Sanctions** is a shared title series, not a separate card type. A card whose title begins **Sanctions:** is a **Sanction**.\n\nWhen a Sanction is played, placed, or banked because an opponent refused its owner's Terms:\n\n- that opponent remains associated with that Sanction for as long as it remains in play; and\n- unless the Sanction says otherwise, after that opponent accepts the owner's Terms, put the Sanction in its owner's Discard Pile.\n\nA Sanction may state additional removal conditions. Cards therefore do not need to repeat identification of the refusing opponent or the default expiration after later acceptance.";
    invariant(text.includes(oldSanctions), 'Diplomat: certified Sanctions section drifted');
    text = text.replace(oldSanctions, v063Sanctions);
  }

  return text
    .replaceAll('Playable Deck', 'Deck')
    .replaceAll('Tactic or Battle effect', 'Gambit or Tactic effect')
    .replaceAll('Gambit or Battle effect', 'Gambit or Tactic effect')
    .replaceAll('Battle effects', 'Gambit or Tactic effects')
    .replaceAll('Battle effect', 'Gambit or Tactic effect')
    .replaceAll('Ritual of Ascendance', 'Ritual of Ascension')
    .replaceAll('Gauntlet v0.6.2 reconstruction candidate © 2026 Tymon Scott.', 'Gauntlet v0.6.3 reconstruction candidate © 2026 Tymon Scott.');
}

function buildGuide(faction, evidence) {
  const sourceText = read(faction.source);
  const baseCards = parseBaseCards(sourceText, faction.title);
  const evidenceCards = (evidence.cards ?? []).filter((card) => card.allegiance === faction.allegiance);
  const evidenceByName = verifyFactionEvidence(baseCards, evidenceCards, faction);

  let text = normalizeNonCardProse(sourceText, faction);
  const boundary = findCardSection(text, faction.title);
  const provenance = '> **Card-text boundary.** The card identities and ordering below are inherited from certified clean v0.6.2 faction authority. The printed v0.6.3 effect text is the exact pinned finalized canonical-data evidence produced by the approved v0.6.3 card-language pipeline (PRs #540, #549, #550, #551, and #560). This adoption does not authorize any withdrawn or downstream v0.6.3 release surface.';
  const renderedCards = baseCards.map((base) => renderCard(evidenceByName.get(base.name))).join('\n\n');
  const replacement = `${boundary.heading}\n\n${provenance}\n\n${renderedCards}\n\n`;
  text = `${text.slice(0, boundary.start)}${replacement}${text.slice(boundary.end)}`;

  invariant(!/> \*\*Battle:\*\*/.test(text), `${faction.title}: retired Battle effect heading survived reconstruction`);
  invariant(!/> \*\*Activate:\*\*/.test(text), `${faction.title}: retired Activate effect heading survived reconstruction`);
  invariant(!/> \*\*Use:\*\*/.test(text), `${faction.title}: retired Use effect heading survived reconstruction`);
  invariant(!/\bPlayable Deck\b/.test(text), `${faction.title}: retired Playable Deck terminology survived reconstruction`);
  invariant(!/\bBattle effects?\b/.test(text), `${faction.title}: retired Battle-effect prose survived reconstruction`);
  invariant(!/> \*\*Action:\*\* Bank this card\.$/m.test(text), `${faction.title}: redundant standalone inherent Bank Action survived reconstruction`);

  return `${text.trimEnd()}\n`;
}

function buildSupportFiles(guideOutputs, verified) {
  const guideManifest = factionDefs.map((faction) => {
    const text = guideOutputs[faction.output];
    const sourceEntry = verified.certifiedByPath.get(faction.source);
    return {
      faction: faction.slug,
      path: faction.output,
      sha256: sha256(text),
      bytes: Buffer.byteLength(text),
      lines: lineCount(text),
      authority_base_path: faction.source,
      authority_base_sha256: sourceEntry.sha256,
    };
  });

  const manifest = {
    schema_version: 1,
    status: 'authority_candidate_pending_merge_review',
    target: 'clean-v0.6.3',
    authority_base: 'certified clean-v0.6.2 faction authority',
    authority_base_set_id: cleanV062AuthoritySetId,
    publication_unlocked: false,
    evidence: {
      canonical_data_path: evidencePath,
      git_blob_sha: evidenceGitBlob,
      role: 'verified_delta_payload_only',
      governing_prs: [540, 549, 550, 551, 560, 571, 575, 615],
    },
    forbidden_authority_sources: verified.plan.targets['clean-v0.6.3'].forbidden_authority_sources,
    required_v063_deltas: requiredDeltas,
    recovered_late_decisions: verified.resolutions['clean-v0.6.3'].additional_recovered_decisions.map((entry) => entry.id),
    targeted_faction_card_review: targetedFactionCards,
    approved_identity_transitions: [
      {
        card: 'Extraordinary Rendition',
        field: 'card_form',
        from: 'Asset with a bound opposing card',
        to: 'Asset',
        classification: 'convention-normalization',
        evidence: 'docs/v063-card-language-overrides/intelligence.json',
      },
    ],
    integrated_faction_shared_rules: ['diplomat-sanctions-default-expiration'],
    guides: guideManifest,
  };

  const readme = `# Clean v0.6.3 reconstruction\n\nThis directory contains the clean v0.6.3 authority candidates reconstructed from the certified clean v0.6.2 authority set. Publication remains locked.\n\nThe faction-guide package is built first because the later clean v0.6.3 Rulebook must integrate the approved faction authority rather than reconstruct faction mechanics from a withdrawn combined guide.\n`;

  const factionReadme = `# Clean v0.6.3 faction authority candidates\n\nThese six faction guides are derived from the certified clean v0.6.2 faction guides, preserving their self-contained faction/Leader architecture. Only approved v0.6.3 deltas are applied.\n\nFaction-card identities, costs, traits, unique status, and ordering are checked against the certified clean v0.6.2 guides. Card form is equality-locked except for the explicitly audited Extraordinary Rendition convention normalization from Asset with a bound opposing card to Asset. Exact v0.6.3 effect wording is imported from the pinned finalized canonical-data candidate strictly as a verified delta payload. The build rejects the withdrawn v0.6.3 Rulebook and combined faction guide as authority inputs.\n\nManual merge of the PR introducing these files approves this faction-authority candidate set for the next reconstruction step only. It does not publish v0.6.3.\n`;

  const sourceBoundary = `# Source boundary\n\nThe clean v0.6.3 faction authority candidates are synthesized from:\n\n- the seven-file certified clean v0.6.2 authority set, specifically the six certified faction guides;\n- the approved clean-v0.6.3 reconstruction plan and version-resolution layer;\n- the v0.6.3 card-language and shared-rule decisions represented by PRs #540, #549, #550, #551, and #560;\n- the late recovered v0.6.3 decisions from PR #571, admitted to reconstruction by PR #615; and\n- the finalized v0.6.3 canonical-data candidate at Git blob ${evidenceGitBlob}, used only as the exact card-text delta payload.\n\nThe withdrawn v0.6.3 Rulebook and combined faction/component guide are forbidden as authority skeletons. No text is copied from them into these guides. The historical canonical-data candidate is evidence only; it cannot override certified clean v0.6.2 identity fields except for the explicitly audited Extraordinary Rendition card-form convention normalization, and its effect text becomes authority only through manual merge of this reconstruction PR.\n\nPublication remains locked. Competitive starters from PR #573 remain downstream until complete clean v0.6.3 authority is certified.\n`;

  const mergeBoundary = `# Merge boundary\n\nMerging this faction-authority reconstruction approves only the six clean v0.6.3 faction guides and their recorded derivation boundary. It does not certify the complete clean v0.6.3 authority set and does not unlock publication.\n\nAfter merge, the next authority step is to reconstruct the clean v0.6.3 Rulebook from the certified clean v0.6.2 Rulebook, approved shared v0.6.3 deltas, and these approved faction guides. Downstream canonical data, card reference, Deckbuilder, browser, Rules Arbiter, digital implementation, print/export surfaces, and starter Decks remain blocked until the complete clean v0.6.3 authority set is certified.\n`;

  const semanticReview = `# Semantic review\n\n## Authority preservation\n\n- All six source guides are hash-checked against clean v0.6.2 authority set ${cleanV062AuthoritySetId}.\n- Faction card title, count, cost, trait, card form, unique status, and ordering remain anchored to those certified guides.\n- The pinned v0.6.3 canonical-data evidence may supply effect wording only; it cannot add, remove, rename, reprice, retrait, reform, or change unique status for a faction card except for the explicitly audited Extraordinary Rendition form normalization from Asset with a bound opposing card to Asset.\n- Retired v0.6.2 card-face conventions are rejected: Battle/Activate/Use effect headings, exact standalone inherent Bank Actions, and Playable Deck terminology. Special banking Actions that carry additional rules meaning remain printed.\n\n## Targeted v0.6.3 faction-card review\n\nThe build explicitly flags the finalized/bespoke faction cards whose wording or interaction behavior received special v0.6.3 attention: ${targetedFactionCards.join(', ')}. Their exact effect text is pinned to the finalized evidence payload rather than reinterpreted during reconstruction.\n\n## Faction engines\n\nNo new faction engine, Leader, Faction Action, alternate victory condition, resource system, or component procedure is introduced by this step. Existing clean v0.6.2 faction-engine prose is preserved except for approved v0.6.3 terminology normalization.\n\n## Publication\n\nPublication remains locked; historical v0.6.2 and v0.6.3 remain withdrawn.\n`;

  const validationStatus = `# Validation status\n\nThe deterministic build verifies the certified clean v0.6.2 source hashes, clean-v0.6.3 construction unlock, required delta set, PR #571 recovered-decision set, lifecycle containment, the pinned v0.6.3 evidence blob, and all six 13-card faction identity boundaries before writing these candidates.\n\nThe companion validator regenerates every output in memory and requires the committed files to match exactly.\n`;

  const checklist = {
    schema_version: 1,
    target: 'clean-v0.6.3-faction-authority',
    publication_unlocked: false,
    checks: [
      { id: 'certified-v062-base', status: 'pass' },
      { id: 'v063-authority-build-unlocked', status: 'pass' },
      { id: 'required-v063-deltas-present', status: 'pass' },
      { id: 'late-pr571-decisions-recovered', status: 'pass' },
      { id: 'historical-v063-publication-withdrawn', status: 'pass' },
      { id: 'candidate-evidence-blob-pinned', status: 'pass' },
      { id: 'six-faction-card-identity-boundaries-preserved', status: 'pass' },
      { id: 'retired-card-heading-language-absent', status: 'pass' },
      { id: 'downstream-surfaces-still-blocked', status: 'pass' },
    ],
  };

  return {
    [`${targetRoot}/README.md`]: readme,
    [`${outRoot}/README.md`]: factionReadme,
    [`${outRoot}/source-boundary.md`]: sourceBoundary,
    [`${outRoot}/merge-boundary.md`]: mergeBoundary,
    [`${outRoot}/semantic-review.md`]: semanticReview,
    [`${outRoot}/validation-status.md`]: validationStatus,
    [`${outRoot}/review-checklist.json`]: `${JSON.stringify(checklist, null, 2)}\n`,
    [`${outRoot}/authority-manifest.json`]: `${JSON.stringify(manifest, null, 2)}\n`,
  };
}

export function buildOutputs() {
  const verified = verifyInputs();
  const guideOutputs = {};
  for (const faction of factionDefs) guideOutputs[faction.output] = buildGuide(faction, verified.evidence);
  return { ...guideOutputs, ...buildSupportFiles(guideOutputs, verified) };
}

export function writeOutputs(outputs = buildOutputs()) {
  for (const [rel, content] of Object.entries(outputs)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  console.log(`Built ${factionDefs.length} clean v0.6.3 faction authority candidates from certified clean v0.6.2 authority; publication remains locked.`);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) writeOutputs();
