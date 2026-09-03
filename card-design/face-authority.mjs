import { productionSurface } from './production-surface.mjs';

const STANDARD_BACK_VARIANTS = Object.freeze([
  'military',
  'diplomats',
  'financiers',
  'intelligence',
  'mystics',
  'inquisition',
]);

export const FACE_TEMPLATES = Object.freeze({
  playable: Object.freeze({ orientation: 'portrait' }),
  territory: Object.freeze({ orientation: 'landscape' }),
  leader: Object.freeze({ orientation: 'portrait' }),
  reference: Object.freeze({ orientation: 'portrait' }),
  tracker: Object.freeze({ orientation: 'portrait' }),
  proposal: Object.freeze({ orientation: 'portrait' }),
  ledger: Object.freeze({ orientation: 'portrait' }),
  deed: Object.freeze({ orientation: 'landscape' }),
  rite: Object.freeze({ orientation: 'portrait' }),
  ritual: Object.freeze({ orientation: 'portrait' }),
  'standard-back': Object.freeze({ orientation: 'portrait' }),
});

const COMPONENT_TEMPLATE_BY_FAMILY = Object.freeze({
  'reference-card': 'reference',
  tracker: 'tracker',
  'proposal-treaty-card': 'proposal',
  ledger: 'ledger',
  'deed-card': 'deed',
  'rite-card': 'rite',
  'ritual-card': 'ritual',
});

function freezeFace(face) {
  return Object.freeze({
    ...face,
    surface: Object.freeze({ ...face.surface }),
    source: Object.freeze({ ...face.source }),
  });
}

function faceId(namespace, id, side = '') {
  const base = `${namespace}:${id}`;
  return side ? `${base}:${side}` : base;
}

function normalizeFaction(value) {
  return String(value || 'neutral')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'neutral';
}

function templateSurface(template) {
  const definition = FACE_TEMPLATES[template];
  if (!definition) throw new Error(`Unknown face template: ${template}.`);
  return productionSurface(definition.orientation);
}

function register(catalog, face) {
  if (!face?.id) throw new Error('Cannot register a face without an id.');
  if (catalog.has(face.id)) throw new Error(`Duplicate canonical face id: ${face.id}.`);
  catalog.set(face.id, freezeFace(face));
}

function addPlayableFaces(catalog, game) {
  for (const card of game.cards || []) {
    register(catalog, {
      id: faceId('card', card.id),
      template: 'playable',
      orientation: FACE_TEMPLATES.playable.orientation,
      surface: templateSurface('playable'),
      side: 'front',
      faction: normalizeFaction(card.allegiance),
      label: card.name,
      backPolicy: 'standardBack',
      source: { collection: 'cards', id: card.id },
    });
  }
}

function addTerritoryFaces(catalog, game) {
  for (const territory of game.territories || []) {
    register(catalog, {
      id: faceId('territory', territory.id),
      template: 'territory',
      orientation: FACE_TEMPLATES.territory.orientation,
      surface: templateSurface('territory'),
      side: 'front',
      faction: 'neutral',
      label: territory.name,
      backPolicy: 'standardBack',
      source: { collection: 'territories', id: territory.id },
    });
  }
}

function addLeaderFaces(catalog, game) {
  for (const leader of game.leaders || []) {
    const renderId = `${leader.faction}-${leader.id}`;
    register(catalog, {
      id: faceId('leader', renderId),
      template: 'leader',
      orientation: FACE_TEMPLATES.leader.orientation,
      surface: templateSurface('leader'),
      side: 'front',
      faction: leader.faction,
      label: leader.name,
      backPolicy: 'standardBack',
      source: { collection: 'leaders', id: renderId },
    });
  }
}

function componentFaces(component) {
  if (!component?.cardLike) return [];

  const template = COMPONENT_TEMPLATE_BY_FAMILY[component.family];
  if (!template) {
    throw new Error(`Card-like component ${component.id} has no canonical face template for family ${component.family || '(missing)'}.`);
  }

  const orientation = FACE_TEMPLATES[template].orientation;
  const common = {
    template,
    orientation,
    surface: templateSurface(template),
    faction: normalizeFaction(component.faction),
    label: component.name,
    source: { collection: 'components', id: component.id },
  };

  const frontId = faceId('component', component.id, 'front');
  const faces = [{
    ...common,
    id: frontId,
    side: 'front',
    backPolicy: component.backPolicy || 'standardBack',
  }];

  if (component.backPolicy === 'twoSided' || component.backPolicy === 'specialBack') {
    const reverseId = faceId('component', component.id, 'reverse');
    faces[0].pairedFaceId = reverseId;
    faces.push({
      ...common,
      id: reverseId,
      side: 'reverse',
      backPolicy: 'paired',
      pairedFaceId: frontId,
    });
  }

  return faces;
}

function addComponentFaces(catalog, game) {
  const components = [
    ...(game.sharedComponents || []),
    ...(game.components || []),
  ];
  for (const component of components) {
    for (const face of componentFaces(component)) register(catalog, face);
  }
}

function addStandardBackFaces(catalog) {
  for (const faction of STANDARD_BACK_VARIANTS) {
    register(catalog, {
      id: faceId('back', faction),
      template: 'standard-back',
      orientation: FACE_TEMPLATES['standard-back'].orientation,
      surface: templateSurface('standard-back'),
      side: 'back',
      faction,
      label: `${faction} Gauntlet card back`,
      backPolicy: 'none',
      source: { collection: 'standardBacks', id: faction },
    });
  }
}

export function buildFaceCatalog(game) {
  if (!game || typeof game !== 'object') throw new Error('Face catalog requires a resolved game authority object.');

  const catalog = new Map();
  addPlayableFaces(catalog, game);
  addTerritoryFaces(catalog, game);
  addLeaderFaces(catalog, game);
  addComponentFaces(catalog, game);
  addStandardBackFaces(catalog);

  return catalog;
}

export function listFaces(game) {
  return Object.freeze([...buildFaceCatalog(game).values()]);
}

export function resolveFace(game, id) {
  const face = buildFaceCatalog(game).get(String(id || '').trim());
  if (!face) throw new Error(`Unknown canonical face id: ${id || '(missing)'}.`);
  return face;
}

export const FACE_ID_EXAMPLES = Object.freeze({
  playable: 'card:rallying-cry',
  territory: 'territory:example',
  leader: 'leader:military-general',
  componentFront: 'component:financiers-deed:front',
  componentReverse: 'component:universal-reference:reverse',
  standardBack: 'back:intelligence',
});
