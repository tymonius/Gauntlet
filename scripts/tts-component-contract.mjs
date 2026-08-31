import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ROOT,
  CURRENT_GAME_AUTHORITY_SOURCE,
  loadCurrentGameAuthority,
} from './current-game-authority.mjs';

export const TTS_COMPONENT_CONTRACT_AUTHORITY = `${CURRENT_GAME_AUTHORITY_SOURCE}#componentContract`;

const FACTIONS = Object.freeze([
  'military',
  'diplomats',
  'financiers',
  'intelligence',
  'mystics',
  'inquisition',
]);
const BACK_POLICIES = new Set(['standardBack', 'twoSided', 'specialBack']);
const PRODUCTION_STATUSES = new Set(['ready', 'artwork-pending', 'export-pending', 'design-pending']);
const DESIGN_STATUSES = new Set(['final', 'refinement-pending', 'placeholder']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function designStatusFor(component) {
  return component.designStatus || 'final';
}

function validateCardLikeMetadata(component) {
  assert(BACK_POLICIES.has(component.backPolicy), `${component.id} must declare a valid backPolicy.`);
  assert(DESIGN_STATUSES.has(designStatusFor(component)), `${component.id} has invalid designStatus ${component.designStatus}.`);
  if (component.backPolicy === 'twoSided') {
    assert(String(component.reverse || '').trim(), `${component.id} is two-sided but has no reverse definition.`);
  }
  if (component.backPolicy === 'specialBack') {
    assert(String(component.specialBackFile || '').trim(), `${component.id} uses specialBack but has no specialBackFile.`);
  }
}

async function readContract() {
  const authority = await loadCurrentGameAuthority();
  const embedded = authority.componentContract;
  if (!embedded || typeof embedded !== 'object') {
    throw new Error(`${CURRENT_GAME_AUTHORITY_SOURCE} is missing componentContract.`);
  }
  const contract = JSON.parse(JSON.stringify(embedded));
  contract.currentGameAuthority = CURRENT_GAME_AUTHORITY_SOURCE;
  contract.currentGameComponentSource = TTS_COMPONENT_CONTRACT_AUTHORITY;
  return contract;
}

function componentMap(contract) {
  return new Map((contract.components || []).map((component) => [component.id, component]));
}

function componentsFor(contract, faction, family = null) {
  return (contract.components || []).filter((component) => (
    component.faction === faction && (!family || component.family === family)
  ));
}

export function resolveStandardBackVariant(contract) {
  const standardBack = contract?.standardBack || {};
  const universal = standardBack.universalVariant;
  assert(standardBack.variants?.includes(universal), `Universal standard-back variant is not available: ${universal || 'missing'}.`);
  return universal;
}

export function resolveStandardBackFile(contract) {
  return `backs/${resolveStandardBackVariant(contract)}.png`;
}

export function resolveFactionBackVariant(contract, faction) {
  const standardBack = contract?.standardBack || {};
  assert(FACTIONS.includes(faction), `Cannot resolve faction component back for ${faction || 'missing faction'}.`);
  assert(standardBack.variants?.includes(faction), `Faction back variant is not available for ${faction}.`);
  return faction;
}

export function resolveFactionBackFile(contract, faction) {
  return `backs/${resolveFactionBackVariant(contract, faction)}.png`;
}

async function validateTrackerRenderSource(component) {
  const surface = String(component.renderSource?.surface || '').trim();
  const componentId = String(component.renderSource?.componentId || '').trim();
  assert(surface, `${component.id} sliding tracker must declare its production render surface.`);
  assert(componentId, `${component.id} sliding tracker must declare its production component id.`);
  await access(join(ROOT, surface));
  const source = await readFile(join(ROOT, surface), 'utf8');
  assert(
    source.includes(`'${component.id}'`) || source.includes(`"${component.id}"`) || source.includes(`id: '${componentId}'`) || source.includes(`id: "${componentId}"`) || source.includes('currentGame.components'),
    `${component.id} production component ${componentId} is missing from ${surface}.`,
  );
}

export async function validateTtsComponentContract(contract) {
  assert(contract?.schemaVersion === 1, `Unsupported TTS component-contract schema: ${contract?.schemaVersion ?? 'missing'}.`);

  const standardBack = contract.standardBack || {};
  assert(Array.isArray(standardBack.allowedModes) && standardBack.allowedModes.includes('faction') && standardBack.allowedModes.includes('universal-black'), 'Standard-back policy must support faction and universal-black modes.');
  assert(Array.isArray(standardBack.variants), 'Standard-back policy must declare variants.');
  assert(FACTIONS.every((faction) => standardBack.variants.includes(faction)), 'Standard-back variants must cover all six factions.');
  assert(standardBack.allowedModes.includes(standardBack.mode), `Current standard-back mode is invalid: ${standardBack.mode || 'missing'}.`);
  assert(standardBack.mode === 'universal-black', 'Current playable-card and Territory standard backs must be universal black.');
  assert(contract.effectiveBackPolicy?.standardBack === 'universal-black', 'Current component authority must declare its effective universal-black standard-back policy.');
  assert(contract.effectiveBackPolicy?.factionComponentBack === 'faction', 'Current component authority must declare faction-colored single-sided faction-component backs.');
  assert(standardBack.variants.includes(standardBack.universalVariant), 'Universal black back must resolve to a declared back variant.');

  const families = contract.canonicalFamilies || {};
  for (const family of ['playable-card', 'leader-card', 'territory-card']) {
    assert(families[family]?.cardLike === true, `${family} must be declared card-like.`);
    assert(families[family]?.backPolicy === 'standardBack', `${family} must use standardBack.`);
  }
  assert(families['territory-card'].orientation === 'landscape', 'Territories must retain landscape orientation.');

  const allComponents = [...(contract.sharedComponents || []), ...(contract.components || [])];
  const ids = allComponents.map((component) => component.id);
  assert(ids.every(Boolean), 'Every TTS physical component must have an id.');
  assert(new Set(ids).size === ids.length, 'Duplicate TTS physical component id detected.');

  for (const component of contract.sharedComponents || []) {
    assert(Number.isInteger(component.quantityPerPlayer) && component.quantityPerPlayer > 0, `${component.id} must declare a positive quantityPerPlayer.`);
    assert(PRODUCTION_STATUSES.has(component.productionStatus), `${component.id} has invalid productionStatus ${component.productionStatus}.`);
    assert(component.source, `${component.id} must cite its canonical source.`);
    if (component.cardLike) validateCardLikeMetadata(component);
    await access(join(ROOT, component.source));
  }

  for (const component of contract.components || []) {
    assert(FACTIONS.includes(component.faction), `${component.id} has unsupported faction ${component.faction}.`);
    assert(Number.isInteger(component.quantity) && component.quantity > 0, `${component.id} must declare a positive quantity.`);
    assert(PRODUCTION_STATUSES.has(component.productionStatus), `${component.id} has invalid productionStatus ${component.productionStatus}.`);
    assert(component.source, `${component.id} must cite its canonical source.`);
    await access(join(ROOT, component.source));

    if (component.cardLike) validateCardLikeMetadata(component);

    if (component.productionStatus === 'ready' && component.reverseArtwork) {
      await access(join(ROOT, component.reverseArtwork));
    }

    if (component.tts?.representation === 'sliding-tracker') {
      assert(component.productionStatus === 'ready', `${component.id} has a production tracker face and must be marked ready.`);
      assert(component.backPolicy === 'standardBack', `${component.id} sliding tracker must use the standard back policy.`);
      assert(component.tts.stackable === false, `${component.id} sliding tracker must be non-stackable in TTS.`);
      assert(['vertical', 'horizontal'].includes(component.tts.axis), `${component.id} sliding tracker must declare a valid axis.`);
      assert(String(component.tts.assembly || '').trim(), `${component.id} sliding tracker must declare an assembly.`);
      assert(Number.isInteger(component.tts.layer) && component.tts.layer > 0, `${component.id} sliding tracker must declare a positive layer.`);
      assert(String(component.tts.snapTag || '').trim(), `${component.id} sliding tracker must declare a snapTag.`);
      assert(component.tts.snapPositions === 'renderer-derived' || Array.isArray(component.tts.snapPositions), `${component.id} sliding tracker must use renderer-derived or explicit snap positions.`);
      assert(['leader', 'component'].includes(component.cover?.kind), `${component.id} sliding tracker must declare a leader or component cover.`);
      if (component.cover?.kind === 'component') {
        assert(String(component.cover.componentId || '').trim(), `${component.id} component cover must declare componentId.`);
      }
      await validateTrackerRenderSource(component);
    }
  }

  resolveStandardBackVariant(contract);
  for (const faction of FACTIONS) resolveFactionBackVariant(contract, faction);

  const map = componentMap(contract);
  const sharedMap = new Map((contract.sharedComponents || []).map((component) => [component.id, component]));
  const universalReference = sharedMap.get('universal-reference');
  assert(universalReference, 'Every player package must contain the Universal Reference Card.');
  assert(universalReference.family === 'reference-card', 'Universal Reference Card must use the reference-card family.');
  assert(universalReference.quantityPerPlayer === 1, 'Every player package must contain exactly one Universal Reference Card.');
  assert(universalReference.deckInclusion === 'every-deck', 'Universal Reference Card must be declared for every deck.');
  assert(universalReference.cardLike === true && universalReference.backPolicy === 'twoSided', 'Universal Reference Card must be a two-sided card-like component.');
  assert(designStatusFor(universalReference) === 'final' && universalReference.productionStatus === 'ready', 'Universal Reference Card must be finalized and production-ready.');
  assert(universalReference.copyMode === 'bespoke', 'Universal Reference Card must use authored bespoke player-aid copy.');
  assert(String(universalReference.source || '').startsWith('card-design/reference-copy/v0.7.0/'), 'Universal Reference Card must source its compact v0.7.0 player-aid copy.');
  assert(universalReference.authoritySource === 'rulebook/player-facing/current-rulebook.md', 'Universal Reference Card must audit against the complete current Rulebook authority.');
  assert(universalReference.referenceFaces?.front?.sections?.length && universalReference.referenceFaces?.reverse?.sections?.length, 'Universal Reference Card must declare both production faces.');

  const trackers = (contract.components || []).filter((component) => component.tts?.representation === 'sliding-tracker');
  assert(trackers.length === 6, `Current physical package must contain exactly six sliding trackers; found ${trackers.length}.`);
  for (const tracker of trackers) {
    if (tracker.cover?.kind === 'component') {
      const cover = map.get(tracker.cover.componentId);
      assert(cover, `${tracker.id} references missing cover component ${tracker.cover.componentId}.`);
      assert(cover.faction === tracker.faction, `${tracker.id} cover ${cover.id} must belong to the same faction.`);
      assert(cover.productionStatus === 'ready', `${tracker.id} cover ${cover.id} must be ready before tracker assembly can ship.`);
    }
  }

  assert(map.has('military-command-tracker'), 'Military package must contain its Command Tracker.');
  assert(!componentsFor(contract, 'military', 'reference-card').length, 'Military must not acquire a faction-specific reference card that its guide does not specify.');

  const proposals = componentsFor(contract, 'diplomats', 'proposal-treaty-card');
  assert(proposals.length === 9, `Diplomats must contain exactly 9 Proposal/Treaty cards; found ${proposals.length}.`);
  assert(proposals.every((component) => component.backPolicy === 'twoSided'), 'All Proposal/Treaty cards must be two-sided.');
  assert(proposals.every((component) => component.productionStatus === 'export-pending' && designStatusFor(component) === 'final'), 'Proposal/Treaty card designs and artwork are final; only their remaining export integration may be pending.');

  const factionReferences = (contract.components || []).filter((component) => component.family === 'reference-card');
  assert(factionReferences.length === 7, `Current faction packages must contain exactly seven faction reference cards; found ${factionReferences.length}.`);
  assert(factionReferences.every((component) => component.productionStatus === 'ready'), 'Every faction reference card must be production-ready.');
  assert(factionReferences.every((component) => designStatusFor(component) === 'final'), 'Every faction reference-card design must be final.');
  assert(factionReferences.every((component) => component.copyMode === 'bespoke'), 'Every faction reference card must use authored bespoke player-aid copy.');
  assert(factionReferences.every((component) => String(component.source || '').startsWith('card-design/reference-copy/v0.7.0/')), 'Every faction reference card must source its compact v0.7.0 player-aid copy.');
  assert(factionReferences.every((component) => component.authoritySource === 'game-data/current-game.json'), 'Every faction reference card must audit against the complete current gameplay authority.');

  const capitalLimitTracker = map.get('financiers-capital-limit-tracker');
  assert(capitalLimitTracker, 'Financiers package must contain its Capital Limit Tracker.');
  assert(capitalLimitTracker.trackedValue?.starting === 3 && capitalLimitTracker.trackedValue?.maximum === null, 'Capital Limit Tracker must begin at 3 in standard setup and must not define a rules maximum.');
  assert(capitalLimitTracker.cover?.kind === 'leader', 'Capital Limit Tracker must use the selected Financier Leader as its physical cover.');

  const ledger = map.get('financiers-capital-ledger');
  assert(ledger?.productionStatus === 'export-pending' && designStatusFor(ledger) === 'final', 'Capital Ledger design is final and must be marked export-pending rather than design-pending.');
  assert(ledger?.backPolicy === 'twoSided', 'Capital Ledger must declare its intrinsic duplex reverse directly in component authority.');

  const deeds = map.get('financiers-deed');
  assert(deeds?.quantity === 8 && deeds?.identicalCopies === true, 'Financiers must have eight identical full-size Deed Cards.');
  assert(deeds?.productionStatus === 'export-pending' && designStatusFor(deeds) === 'final', 'Deed design is final and must be marked export-pending rather than design-pending.');

  const intelligenceReferences = componentsFor(contract, 'intelligence', 'reference-card');
  assert(intelligenceReferences.length === 2, `Intelligence must contain Mission and Operations Reference Cards; found ${intelligenceReferences.length}.`);
  assert(map.has('intelligence-mission-reference') && map.has('intelligence-operations-reference'), 'Intelligence reference-card identities do not match the current guide.');
  const intelligenceTrackers = [
    map.get('intelligence-intel-tracker'),
    map.get('intelligence-operation-progress-tracker'),
  ];
  assert(intelligenceTrackers.every(Boolean), 'Intelligence must contain both Intel and Operation Progress trackers.');
  assert(intelligenceTrackers.every((component) => component.tts?.assembly === 'intelligence-progress'), 'Intelligence trackers must share the stacked intelligence-progress assembly.');
  assert(new Set(intelligenceTrackers.map((component) => component.tts.layer)).size === 2, 'Intelligence stacked trackers must occupy distinct layers.');
  assert(new Set(intelligenceTrackers.map((component) => component.tts.snapTag)).size === 2, 'Intelligence stacked trackers must use distinct snap tags.');
  const intelTracker = map.get('intelligence-intel-tracker');
  const operationProgressTracker = map.get('intelligence-operation-progress-tracker');
  assert(intelTracker.cover?.kind === 'leader', 'Intel Tracker must use the selected Intelligence Leader as its physical cover.');
  assert(operationProgressTracker.cover?.kind === 'component' && operationProgressTracker.cover?.componentId === 'intelligence-intel-tracker', 'Operation Progress Tracker must use the Intel Tracker as its physical cover.');
  assert(operationProgressTracker.tts?.layer === 1 && intelTracker.tts?.layer === 2, 'Intelligence tracker layers must run Operation Progress bottom, Intel above it.');

  const rites = componentsFor(contract, 'mystics', 'rite-card');
  const currentAuthority = await loadCurrentGameAuthority();
  const currentRites = currentAuthority.mystics?.rites || [];
  const expectedRiteIds = currentRites.map((rite) => `mystics-rite-${rite.id}`).sort();
  const contractRiteIds = rites.map((rite) => rite.id).sort();
  assert(
    JSON.stringify(contractRiteIds) === JSON.stringify(expectedRiteIds),
    `Mystics physical Rite contract does not match the current Rite pool: ${contractRiteIds.join(', ')}.`,
  );
  assert(rites.every((component) => component.productionStatus === 'ready' && component.backPolicy === 'twoSided'), 'All current Mystics Rite cards must be ready and two-sided.');
  assert(rites.every((component) => component.deckInclusion === 'selected-rite'), 'Mystics Rite components must use selected-rite package inclusion.');
  assert(rites.every((component) => component.source === CURRENT_GAME_AUTHORITY_SOURCE), 'Mystics Rite components must source current-game authority directly.');

  const inquisitionReferences = componentsFor(contract, 'inquisition', 'reference-card');
  assert(inquisitionReferences.length === 2, `Inquisition must contain Doctrine and Purge Reference Cards; found ${inquisitionReferences.length}.`);
  assert(map.has('inquisition-doctrine-reference') && map.has('inquisition-purge-reference'), 'Inquisition reference-card identities do not match the current guide.');

  return contract;
}

export async function loadTtsComponentContract() {
  return validateTtsComponentContract(await readContract());
}

async function main() {
  const contract = await loadTtsComponentContract();
  const allComponents = [...(contract.sharedComponents || []), ...(contract.components || [])];
  const pending = allComponents.filter((component) => component.productionStatus !== 'ready');
  const designWork = allComponents.filter((component) => component.cardLike && designStatusFor(component) !== 'final');
  const trackers = (contract.components || []).filter((component) => component.tts?.representation === 'sliding-tracker');
  console.log(`TTS component contract passed through ${contract.currentGameAuthority}: ${contract.components.length} faction components, ${contract.sharedComponents.length} shared component types, ${trackers.length} sliding trackers, ${pending.length} components still pending production/export, ${designWork.length} card-like components still pending refinement/design; ordinary card backs are universal black and single-sided faction-component backs are faction-colored.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
