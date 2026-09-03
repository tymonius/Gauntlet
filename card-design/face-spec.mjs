import { loadRenderContext } from './render-context.mjs';
import { surfaceCssSize } from './production-surface.mjs';

const FACTIONS = Object.freeze([
  'military',
  'diplomats',
  'financiers',
  'intelligence',
  'mystics',
  'inquisition',
]);

const BASE_CARD_STYLES = Object.freeze([
  '/design-tokens.css',
  '/card-design/card-design.css',
  '/card-design/card-design-refinement.css',
  '/card-design/faction-specimens.css',
]);

const LEADER_STYLES = Object.freeze([
  ...BASE_CARD_STYLES,
  '/card-design/leader-card.css',
  '/card-design/leader-card-copy.css',
]);

const CARD_BACK_STYLES = Object.freeze([
  '/design-tokens.css',
  '/card-design/card-back.css',
]);

function leaderRenderId(leader) {
  return `${leader.faction}-${leader.id}`;
}

export function leaderFaceId(leaderOrRenderId) {
  const renderId = typeof leaderOrRenderId === 'string'
    ? leaderOrRenderId
    : leaderRenderId(leaderOrRenderId);
  return `leader:${renderId}`;
}

export function cardBackFaceId(faction) {
  return `back:${String(faction || '').trim().toLowerCase()}`;
}

function parseFaceId(faceId) {
  const normalized = String(faceId || '').trim();
  const separator = normalized.indexOf(':');
  if (separator <= 0 || separator === normalized.length - 1) {
    throw new Error(`Invalid canonical FaceSpec id: ${normalized || '(missing)'}.`);
  }
  return Object.freeze({
    id: normalized,
    namespace: normalized.slice(0, separator).toLowerCase(),
    localId: normalized.slice(separator + 1),
  });
}

function requireExplicitArtworkDirection(context, artworkId) {
  const raw = context.artDirection?.[artworkId];
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Face ${artworkId} has no explicit canonical artwork composition.`);
  }
  const resolved = context.artDirectionFor(artworkId);
  if (!resolved || typeof resolved !== 'object') {
    throw new Error(`Face ${artworkId} could not resolve canonical artwork composition.`);
  }
  if (resolved.focusX == null || resolved.focusY == null || resolved.smart !== false) {
    throw new Error(`Face ${artworkId} artwork composition is not fully authored for production.`);
  }
  return Object.freeze({ ...resolved });
}

function commonSpec(context, options) {
  const orientation = options.orientation || 'portrait';
  return {
    schemaVersion: 1,
    id: options.id,
    kind: options.kind,
    family: options.family,
    template: options.template,
    side: options.side || 'front',
    orientation,
    surface: surfaceCssSize(orientation),
    label: options.label,
    faction: options.faction || 'neutral',
    backPolicy: options.backPolicy || 'none',
    styles: Object.freeze([...(options.styles || [])]),
    gameplayAuthorityUrl: context.gameplayAuthorityUrl,
    visualAuthorityUrl: context.visualAuthorityUrl,
    displayVersion: context.displayVersion,
  };
}

function leaderSpec(context, requestedId) {
  const leader = (context.game.leaders || []).find(item => leaderRenderId(item) === requestedId);
  if (!leader) throw new Error(`Unknown Leader face: ${requestedId}.`);

  const artworkId = leaderRenderId(leader);
  return Object.freeze({
    ...commonSpec(context, {
      id: leaderFaceId(artworkId),
      kind: 'leader',
      family: 'leader',
      template: 'leader',
      side: 'front',
      orientation: 'portrait',
      label: `${leader.name} ${leader.factionLabel} Leader`,
      faction: leader.faction,
      backPolicy: 'standardBack',
      styles: LEADER_STYLES,
    }),
    artwork: Object.freeze({
      id: artworkId,
      src: leader.image,
      direction: requireExplicitArtworkDirection(context, artworkId),
    }),
    payload: leader,
  });
}

function cardBackSpec(context, requestedId) {
  const faction = String(requestedId || '').trim().toLowerCase();
  if (!FACTIONS.includes(faction)) throw new Error(`Unknown card-back faction: ${requestedId}.`);

  return Object.freeze({
    ...commonSpec(context, {
      id: cardBackFaceId(faction),
      kind: 'back',
      family: 'card-back',
      template: 'card-back',
      side: 'back',
      orientation: 'portrait',
      label: `${faction} Gauntlet card back`,
      faction,
      backPolicy: 'none',
      styles: CARD_BACK_STYLES,
    }),
    payload: Object.freeze({ faction }),
  });
}

export async function resolveFaceSpec(faceId) {
  const parsed = parseFaceId(faceId);
  const context = await loadRenderContext();

  if (parsed.namespace === 'leader') return leaderSpec(context, parsed.localId);
  if (parsed.namespace === 'back') return cardBackSpec(context, parsed.localId);

  throw new Error(`FaceSpec namespace is not migrated yet: ${parsed.namespace}.`);
}

export function migratedFaceNamespaces() {
  return Object.freeze(['leader', 'back']);
}
