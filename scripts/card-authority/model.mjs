import { validateCurrentGameAuthority } from '../current-game-authority.mjs';
import { FACE_TEMPLATES, listFaces } from '../../card-design/face-authority.mjs';
import { FACE_TEMPLATE_CONTRACTS, resolveAllFaceSpecs } from '../../card-design/face-spec.mjs';
import { FACE_TEMPLATE_RENDERERS } from '../../card-design/face-template-registry.mjs';

const STANDARD_BACK_FACTIONS = Object.freeze([
  'military',
  'diplomats',
  'financiers',
  'intelligence',
  'mystics',
  'inquisition',
]);

const CARD_LIKE_FAMILIES = new Set([
  'reference-card',
  'tracker',
  'proposal-treaty-card',
  'ledger',
  'deed-card',
  'rite-card',
  'ritual-card',
]);

const BACK_POLICIES = new Set(['standardBack', 'twoSided', 'specialBack']);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sorted(values) {
  return [...values].sort((a, b) => String(a).localeCompare(String(b)));
}

function exactSet(actual, expected, label) {
  const left = sorted(actual);
  const right = sorted(expected);
  invariant(
    left.length === right.length && left.every((value, index) => value === right[index]),
    `${label} mismatch. Expected ${right.length}, received ${left.length}.\nMissing: ${right.filter(value => !left.includes(value)).join(', ') || 'none'}\nExtra: ${left.filter(value => !right.includes(value)).join(', ') || 'none'}`,
  );
}

export function runtimeGameFromAuthority(authority) {
  const contract = authority.componentContract || {};
  return Object.freeze({
    authorityUrl: '/game-data/current-game.json',
    visualAuthorityUrl: '/game-data/current-game.json',
    version: authority.version,
    displayVersion: authority.displayVersion,
    visualPolicy: authority.visualPolicy || {},
    artDirection: authority.artDirection || {},
    cards: authority.gameplay?.cards || [],
    territories: authority.gameplay?.territories || [],
    leaders: authority.leaders || [],
    proposals: authority.proposals || [],
    mystics: authority.mystics || {},
    components: contract.components || [],
    sharedComponents: contract.sharedComponents || [],
  });
}

export function allComponents(authority) {
  return [
    ...(authority.componentContract?.sharedComponents || []),
    ...(authority.componentContract?.components || []),
  ];
}

function componentSourceId(component) {
  if (component.family === 'proposal-treaty-card') {
    return String(component.renderSource?.componentId || component.id.replace(/^diplomats-proposal-/, '')).trim();
  }
  if (component.family === 'rite-card') {
    return String(component.renderSource?.componentId || component.id.replace(/^mystics-rite-/, '')).trim();
  }
  return String(component.renderSource?.componentId || component.id || '').trim();
}

export function expectedFaceIds(authority) {
  const ids = [];
  for (const card of authority.gameplay.cards) ids.push(`card:${card.id}`);
  for (const territory of authority.gameplay.territories) ids.push(`territory:${territory.id}`);
  for (const leader of authority.leaders) ids.push(`leader:${leader.faction}-${leader.id}`);

  for (const component of allComponents(authority).filter(item => item.cardLike)) {
    ids.push(`component:${component.id}:front`);
    if (component.backPolicy === 'twoSided' || component.backPolicy === 'specialBack') {
      ids.push(`component:${component.id}:reverse`);
    }
  }

  for (const faction of STANDARD_BACK_FACTIONS) ids.push(`back:${faction}`);
  return Object.freeze(ids);
}

export function validateCurrentGameContract(authority) {
  validateCurrentGameAuthority(authority);

  invariant(authority.authority === 'current-game', 'Card authority must be the complete current-game authority.');
  invariant(authority.version === authority.displayVersion, 'Current card authority version and displayVersion must agree.');
  invariant(authority.status === 'current-release' || authority.status === 'active-development', `Unsupported current authority status ${authority.status}.`);

  const components = allComponents(authority);
  const componentIds = components.map(component => component.id).filter(Boolean);
  exactSet(new Set(componentIds), componentIds, 'Component IDs');

  const proposalIds = new Set(authority.proposals.map(proposal => proposal.id));
  const riteIds = new Set((authority.mystics?.rites || []).map(rite => rite.id));

  for (const component of components) {
    invariant(component?.id, 'Every physical component must have an id.');
    if (!component.cardLike) continue;

    invariant(CARD_LIKE_FAMILIES.has(component.family), `Card-like component ${component.id} has unsupported family ${component.family || '(missing)'}.`);
    invariant(BACK_POLICIES.has(component.backPolicy), `Card-like component ${component.id} has unsupported back policy ${component.backPolicy || '(missing)'}.`);

    if (component.family === 'proposal-treaty-card') {
      invariant(proposalIds.has(componentSourceId(component)), `Proposal component ${component.id} does not resolve to current Proposal authority.`);
    } else if (component.family === 'rite-card') {
      invariant(riteIds.has(componentSourceId(component)), `Rite component ${component.id} does not resolve to current Rite authority.`);
    } else if (component.family === 'ritual-card') {
      invariant(authority.mystics?.ritual?.id, `Ritual component ${component.id} has no current Ritual authority.`);
    } else if (component.family === 'reference-card') {
      invariant(component.backPolicy === 'twoSided', `Reference card ${component.id} must be intrinsically two-sided.`);
      invariant(component.referenceFaces?.front && component.referenceFaces?.reverse, `Reference card ${component.id} is missing a canonical face selector.`);
      invariant(component.source, `Reference card ${component.id} is missing player-aid source copy.`);
      invariant(component.authoritySource, `Reference card ${component.id} is missing its audit authority.`);
    }
  }

  return Object.freeze({
    version: authority.version,
    status: authority.status,
    cards: authority.gameplay.cards.length,
    territories: authority.gameplay.territories.length,
    leaders: authority.leaders.length,
    cardLikeComponents: components.filter(component => component.cardLike).length,
    expectedFaces: expectedFaceIds(authority).length,
  });
}

function validateArtwork(spec) {
  const artwork = spec.artwork;
  if (!artwork) return;

  if (artwork.role === 'crop') {
    const source = artwork.source || {};
    invariant(
      (source.mode === 'exact' && Boolean(source.src))
      || (source.mode === 'first-existing' && Array.isArray(source.candidates) && source.candidates.length > 0),
      `Face ${spec.id} has no resolvable crop artwork source.`,
    );
    invariant(artwork.composition?.explicit === true, `Face ${spec.id} has no explicit artwork composition.`);
    const direction = artwork.composition.direction || {};
    invariant(direction.smart === false, `Face ${spec.id} still uses smart artwork positioning.`);
    for (const field of ['focusX', 'focusY', 'zoom']) {
      invariant(Number.isFinite(Number(direction[field])), `Face ${spec.id} has invalid artwork ${field}.`);
    }
  }

  if (artwork.role === 'full-face') {
    invariant(artwork.source?.mode === 'exact' && Boolean(artwork.source.src), `Face ${spec.id} has no exact full-face artwork source.`);
  }
}

export function validateFaceCatalogContract(authority) {
  validateCurrentGameContract(authority);
  const game = runtimeGameFromAuthority(authority);
  const faces = listFaces(game);
  const specs = resolveAllFaceSpecs(game);
  const expectedIds = expectedFaceIds(authority);

  exactSet(faces.map(face => face.id), expectedIds, 'Canonical face catalog');
  exactSet(Object.keys(FACE_TEMPLATE_RENDERERS), Object.keys(FACE_TEMPLATES), 'Face template renderer registry');
  exactSet(Object.keys(FACE_TEMPLATE_CONTRACTS), Object.keys(FACE_TEMPLATES), 'FaceSpec template contracts');
  exactSet(specs.map(spec => spec.id), expectedIds, 'Resolved FaceSpecs');

  const faceById = new Map(faces.map(face => [face.id, face]));
  const specById = new Map(specs.map(spec => [spec.id, spec]));

  for (const face of faces) {
    const template = FACE_TEMPLATES[face.template];
    invariant(template, `Face ${face.id} uses unknown template ${face.template}.`);
    invariant(face.orientation === template.orientation, `Face ${face.id} orientation disagrees with template ${face.template}.`);
    invariant(face.surface?.widthCssPx > 0 && face.surface?.heightCssPx > 0, `Face ${face.id} has invalid physical surface geometry.`);

    if (face.pairedFaceId) {
      const paired = faceById.get(face.pairedFaceId);
      invariant(paired, `Face ${face.id} points to missing paired face ${face.pairedFaceId}.`);
      invariant(paired.pairedFaceId === face.id, `Face ${face.id} pairing is not reciprocal.`);
    }

    const spec = specById.get(face.id);
    invariant(spec, `Face ${face.id} did not resolve to a FaceSpec.`);
    invariant(Object.isFrozen(spec), `FaceSpec ${face.id} is mutable.`);
    invariant(spec.template === face.template, `FaceSpec ${face.id} changed template identity.`);
    invariant(spec.orientation === face.orientation, `FaceSpec ${face.id} changed orientation identity.`);
    invariant(spec.side === face.side, `FaceSpec ${face.id} changed side identity.`);
    invariant(spec.backPolicy === face.backPolicy, `FaceSpec ${face.id} changed back policy.`);
    invariant(spec.provenance.gameplay === '/game-data/current-game.json', `FaceSpec ${face.id} has non-current gameplay provenance.`);
    invariant(spec.provenance.visual === '/game-data/current-game.json', `FaceSpec ${face.id} has non-current visual provenance.`);
    invariant(spec.provenance.version === authority.version, `FaceSpec ${face.id} has stale game version provenance.`);
    invariant(spec.provenance.displayVersion === authority.displayVersion, `FaceSpec ${face.id} has stale display-version provenance.`);
    invariant(Array.isArray(spec.dependencies.styles) && spec.dependencies.styles.length > 0, `FaceSpec ${face.id} has no style dependency contract.`);
    invariant(spec.dependencies.styles.every(style => String(style).startsWith('/')), `FaceSpec ${face.id} contains a non-rooted style dependency.`);
    invariant(spec.readiness.productionReady === true, `FaceSpec ${face.id} is not production-ready: ${spec.readiness.issues.join(', ') || 'unknown issue'}.`);
    validateArtwork(spec);
  }

  const byTemplate = {};
  for (const spec of specs) byTemplate[spec.template] = (byTemplate[spec.template] || 0) + 1;

  return Object.freeze({
    totalFaces: specs.length,
    byTemplate: Object.freeze(byTemplate),
    readyFaces: specs.filter(spec => spec.readiness.productionReady).length,
  });
}
