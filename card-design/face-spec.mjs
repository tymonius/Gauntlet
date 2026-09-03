import { artworkCandidates } from './card-artwork-resolver.js';
import { listFaces, resolveFace } from './face-authority.mjs';
import { hasExplicitArtDirection, resolveArtDirection } from '../game-data/art-direction.mjs';

const BASE_CARD_STYLES = Object.freeze([
  '/design-tokens.css',
  '/card-design/card-design.css',
  '/card-design/card-design-refinement.css',
  '/card-design/faction-component.css',
]);

export const FACE_TEMPLATE_CONTRACTS = Object.freeze({
  playable: Object.freeze({
    styles: Object.freeze([
      ...BASE_CARD_STYLES,
      '/card-design/faction-specimens.css',
      '/card-design/playable-card-renderer.css',
    ]),
    artworkRole: 'crop',
  }),
  territory: Object.freeze({
    styles: Object.freeze([
      '/design-tokens.css',
      '/card-design/card-design-refinement.css',
      '/card-design/territory-card-renderer.css',
    ]),
    artworkRole: 'crop',
  }),
  leader: Object.freeze({
    styles: Object.freeze([
      ...BASE_CARD_STYLES,
      '/card-design/faction-specimens.css',
      '/card-design/leader-card.css',
      '/card-design/leader-card-copy.css',
    ]),
    artworkRole: 'crop',
  }),
  reference: Object.freeze({
    styles: Object.freeze([
      ...BASE_CARD_STYLES,
      '/card-design/faction-specimens.css',
      '/card-design/reference-card.css',
      '/card-design/universal-reference.css',
      '/card-design/supplemental-refinements.css',
    ]),
    artworkRole: 'none',
  }),
  tracker: Object.freeze({
    styles: Object.freeze([
      ...BASE_CARD_STYLES,
      '/card-design/faction-specimens.css',
      '/card-design/supplemental-card.css',
      '/card-design/supplemental-refinements.css',
    ]),
    artworkRole: 'none',
  }),
  proposal: Object.freeze({
    styles: Object.freeze([
      ...BASE_CARD_STYLES,
      '/card-design/faction-specimens.css',
      '/card-design/proposal-card.css',
    ]),
    artworkRole: 'template-dependent',
  }),
  ledger: Object.freeze({
    styles: Object.freeze([
      ...BASE_CARD_STYLES,
      '/card-design/faction-specimens.css',
      '/card-design/reference-card.css',
      '/card-design/capital-ledger.css',
    ]),
    artworkRole: 'none',
  }),
  deed: Object.freeze({
    styles: Object.freeze([
      ...BASE_CARD_STYLES,
      '/card-design/faction-specimens.css',
      '/card-design/supplemental-card.css',
      '/card-design/deed-card.css',
    ]),
    artworkRole: 'none',
  }),
  rite: Object.freeze({
    styles: Object.freeze([
      ...BASE_CARD_STYLES,
      '/card-design/faction-specimens.css',
      '/card-design/rite-card.css',
    ]),
    artworkRole: 'template-dependent',
  }),
  ritual: Object.freeze({
    styles: Object.freeze([
      ...BASE_CARD_STYLES,
      '/card-design/faction-specimens.css',
      '/card-design/rite-card.css',
    ]),
    artworkRole: 'template-dependent',
  }),
  'standard-back': Object.freeze({
    styles: Object.freeze([
      '/design-tokens.css',
      '/card-design/card-back.css',
    ]),
    artworkRole: 'template',
  }),
});

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function componentById(game, id) {
  return [
    ...(game.sharedComponents || []),
    ...(game.components || []),
  ].find(component => component.id === id) || null;
}

function sourcePayload(game, face) {
  const { collection, id } = face.source || {};

  if (collection === 'cards') {
    const card = (game.cards || []).find(item => item.id === id);
    if (!card) throw new Error(`Face ${face.id} cannot resolve playable source ${id}.`);
    return { type: 'playable', card: clone(card) };
  }

  if (collection === 'territories') {
    const territory = (game.territories || []).find(item => item.id === id);
    if (!territory) throw new Error(`Face ${face.id} cannot resolve Territory source ${id}.`);
    return { type: 'territory', territory: clone(territory) };
  }

  if (collection === 'leaders') {
    const leader = (game.leaders || []).find(item => `${item.faction}-${item.id}` === id);
    if (!leader) throw new Error(`Face ${face.id} cannot resolve Leader source ${id}.`);
    return { type: 'leader', leader: clone(leader) };
  }

  if (collection === 'components') {
    const component = componentById(game, id);
    if (!component) throw new Error(`Face ${face.id} cannot resolve component source ${id}.`);
    return componentPayload(game, face, component);
  }

  if (collection === 'standardBacks') {
    return { type: 'standard-back', faction: id };
  }

  throw new Error(`Face ${face.id} has unsupported source collection ${collection || '(missing)'}.`);
}

function proposalId(component) {
  return String(component.renderSource?.componentId || component.id.replace(/^diplomats-proposal-/, '')).trim();
}

function riteId(component) {
  return String(component.renderSource?.componentId || component.id.replace(/^mystics-rite-/, '')).trim();
}

function componentPayload(game, face, component) {
  if (face.template === 'proposal') {
    const id = proposalId(component);
    const proposal = (game.proposals || []).find(item => item.id === id);
    if (!proposal) throw new Error(`Face ${face.id} cannot resolve Proposal ${id}.`);
    return {
      type: 'proposal',
      mode: face.side === 'reverse' ? 'ratified' : 'proposal',
      component: clone(component),
      proposal: clone(proposal),
    };
  }

  if (face.template === 'rite') {
    const id = riteId(component);
    const rite = (game.mystics?.rites || []).find(item => item.id === id);
    if (!rite) throw new Error(`Face ${face.id} cannot resolve Rite ${id}.`);
    return {
      type: 'rite',
      mode: face.side === 'reverse' ? 'completed' : 'active',
      component: clone(component),
      rite: clone(rite),
      unlocks: face.side === 'reverse' ? clone(game.mystics?.unlocks || []) : [],
      completedArtwork: game.mystics?.completedArtwork || null,
    };
  }

  if (face.template === 'ritual') {
    const ritual = game.mystics?.ritual;
    if (!ritual?.id) throw new Error(`Face ${face.id} cannot resolve Ritual authority.`);
    return {
      type: 'ritual',
      mode: face.side === 'reverse' ? 'reverse' : 'front',
      component: clone(component),
      ritual: clone(ritual),
    };
  }

  if (face.template === 'reference') {
    const selectedFace = component.referenceFaces?.[face.side];
    if (!selectedFace) throw new Error(`Face ${face.id} has no canonical reference-face selector for ${face.side}.`);
    return {
      type: 'reference',
      component: clone(component),
      copyMode: component.copyMode || 'guide-derived',
      source: component.source || null,
      authoritySource: component.authoritySource || null,
      selector: clone(selectedFace),
      presentation: clone(component.presentation?.reference || null),
    };
  }

  if (face.template === 'tracker') {
    return {
      type: 'tracker',
      component: clone(component),
      trackedValue: clone(component.trackedValue || null),
      presentation: clone(component.presentation?.tracker || null),
    };
  }

  if (face.template === 'ledger') {
    return {
      type: 'ledger',
      component: clone(component),
      openingBalance: 2,
      exampleEntry: Object.freeze({ label: 'Income', delta: 1, balance: 3 }),
      blankRows: 11,
    };
  }

  if (face.template === 'deed') {
    return {
      type: 'deed',
      component: clone(component),
    };
  }

  throw new Error(`Face ${face.id} has no content resolver for template ${face.template}.`);
}

function territoryArtworkCandidates(territory) {
  const explicit = String(territory?.artwork || '').trim();
  if (explicit) return [`/${explicit.replace(/^\/+/, '')}`];

  const displayName = territory?.arena
    ? String(territory.name || '').replace(/^Arena:\s*/i, '')
    : territory?.name;
  const slugs = [...new Set([
    String(territory?.id || '').replace(/^territory-/, ''),
    slugify(displayName),
  ].filter(Boolean))];
  return slugs.flatMap(slug => ['png', 'webp', 'jpg', 'jpeg']
    .map(extension => `/images/artwork/cards/territories/${slug}.${extension}`));
}

function artDirectionSpec(game, id) {
  const direction = resolveArtDirection(game.visualPolicy, game.artDirection || {}, id);
  return {
    id,
    direction: clone(direction),
    explicit: hasExplicitArtDirection(game.artDirection || {}, id),
  };
}

function artworkSpec(game, face, content) {
  if (face.template === 'playable') {
    const card = content.card;
    const faction = slugify(card.allegiance);
    return {
      role: 'crop',
      source: {
        mode: 'first-existing',
        candidates: artworkCandidates(card, faction),
      },
      composition: artDirectionSpec(game, card.id),
    };
  }

  if (face.template === 'territory') {
    const territory = content.territory;
    return {
      role: 'crop',
      source: {
        mode: 'first-existing',
        candidates: territoryArtworkCandidates(territory),
      },
      composition: artDirectionSpec(game, territory.id),
    };
  }

  if (face.template === 'leader') {
    const leader = content.leader;
    const artId = `${leader.faction}-${leader.id}`;
    return {
      role: 'crop',
      source: { mode: 'exact', src: leader.image || null },
      composition: artDirectionSpec(game, artId),
    };
  }

  if (face.template === 'proposal') {
    const suffix = content.mode === 'ratified' ? '-ratified' : '';
    const artId = `proposal-${content.proposal.id}${suffix}`;
    return {
      role: 'crop',
      source: {
        mode: 'exact',
        src: content.mode === 'ratified'
          ? '/images/artwork/supplemental/diplomats/ratified-wax-seal.webp'
          : `/images/artwork/cards/diplomats/proposals/${content.proposal.id}.png`,
      },
      composition: artDirectionSpec(game, artId),
    };
  }

  if (face.template === 'rite') {
    const suffix = content.mode === 'completed' ? '-completed' : '';
    const artId = `rite-${content.rite.id}${suffix}`;
    return {
      role: 'crop',
      source: {
        mode: 'exact',
        src: content.mode === 'completed'
          ? (content.completedArtwork || null)
          : (content.rite.artwork || null),
      },
      composition: artDirectionSpec(game, artId),
    };
  }

  if (face.template === 'ritual') {
    const artId = `ritual-${content.ritual.id}`;
    if (content.mode === 'reverse') {
      return {
        role: 'full-face',
        source: { mode: 'exact', src: content.ritual.cardBack || null },
        composition: null,
      };
    }
    return {
      role: 'crop',
      source: { mode: 'exact', src: content.ritual.artwork || null },
      composition: artDirectionSpec(game, artId),
    };
  }

  if (face.template === 'standard-back') {
    return {
      role: 'template',
      source: {
        mode: 'generated',
        pattern: '/card-design/card-back-pattern.svg',
        wordmark: '/images/Gauntlet.svg',
      },
      composition: null,
    };
  }

  return null;
}

function readinessIssues(face, content, artwork) {
  const issues = [];

  if (artwork?.role === 'crop') {
    const source = artwork.source || {};
    const hasSource = source.mode === 'exact'
      ? Boolean(source.src)
      : Array.isArray(source.candidates) && source.candidates.length > 0;
    if (!hasSource) issues.push('artwork-source-missing');

    const composition = artwork.composition;
    if (!composition?.direction) {
      issues.push('artwork-composition-missing');
    }
  }

  if (face.template === 'tracker') {
    if (!content.trackedValue) issues.push('tracker-value-authority-missing');
    if (!content.presentation) issues.push('tracker-presentation-missing');
  }

  if (face.template === 'reference') {
    if (!content.source) issues.push('reference-source-missing');
    if (!content.selector) issues.push('reference-selector-missing');
  }

  return Object.freeze(issues);
}

function authorityProvenance(game) {
  return {
    gameplay: game.authorityUrl || '/game-data/current-game.json',
    visual: game.visualAuthorityUrl || game.authorityUrl || '/game-data/current-game.json',
    version: game.version || null,
    displayVersion: game.displayVersion || game.version || null,
  };
}

export function resolveFaceSpec(game, faceId) {
  const face = resolveFace(game, faceId);
  const template = FACE_TEMPLATE_CONTRACTS[face.template];
  if (!template) throw new Error(`Face ${face.id} has no template contract for ${face.template}.`);

  const content = sourcePayload(game, face);
  const artwork = artworkSpec(game, face, content);
  const issues = readinessIssues(face, content, artwork);

  return deepFreeze({
    schemaVersion: 1,
    id: face.id,
    template: face.template,
    orientation: face.orientation,
    surface: clone(face.surface),
    side: face.side,
    faction: face.faction,
    label: face.label,
    backPolicy: face.backPolicy,
    pairedFaceId: face.pairedFaceId || null,
    source: clone(face.source),
    dependencies: {
      styles: [...template.styles],
    },
    content,
    artwork,
    provenance: authorityProvenance(game),
    readiness: {
      productionReady: issues.length === 0,
      issues: [...issues],
    },
  });
}

export function resolveAllFaceSpecs(game) {
  return Object.freeze(listFaces(game).map(face => resolveFaceSpec(game, face.id)));
}

export function resolveFaceSpecs(game, faceIds) {
  const ids = [...faceIds];
  return Object.freeze(ids.map(id => resolveFaceSpec(game, id)));
}
