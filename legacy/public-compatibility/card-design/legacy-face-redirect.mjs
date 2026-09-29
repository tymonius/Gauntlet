import { loadCurrentGame } from '../game-data/current-game.mjs';
import { resolveFace } from './face-authority.mjs';

const REVERSE_SIDES = new Set(['reverse', 'back', 'treaty', 'completed']);
const LEGACY_COMPONENT_FAMILIES = Object.freeze({
  proposal: 'proposal-treaty-card',
  reference: 'reference-card',
  rite: 'rite-card',
  ritual: 'ritual-card',
  tracker: 'tracker',
});

function normalized(value) {
  return String(value || '').trim();
}

function componentCandidates(game) {
  return [
    ...(game.sharedComponents || []),
    ...(game.components || []),
  ];
}

function legacyComponentMatches(component, kind, id) {
  if (!component?.cardLike) return false;
  const renderId = normalized(component.renderSource?.componentId);
  const componentId = normalized(component.id);

  if (kind === 'supplemental') {
    return componentId === id || renderId === id;
  }

  const family = LEGACY_COMPONENT_FAMILIES[kind];
  if (!family || component.family !== family) return false;
  return componentId === id || renderId === id || componentId.endsWith(`-${id}`);
}

function componentFaceId(game, kind, id, side) {
  const component = componentCandidates(game).find(candidate => legacyComponentMatches(candidate, kind, id));
  if (!component) throw new Error(`Unknown legacy ${kind} component: ${id || '(missing)'}.`);

  const reverse = REVERSE_SIDES.has(side);
  if (reverse && component.backPolicy !== 'twoSided' && component.backPolicy !== 'specialBack') {
    throw new Error(`Legacy ${kind} component ${id} has no reverse face.`);
  }
  return `component:${component.id}:${reverse ? 'reverse' : 'front'}`;
}

export function legacyFaceId(game, route, params) {
  if (route === 'card') {
    const id = normalized(params.get('card'));
    if (!id) throw new Error('Legacy playable-card URL requires card.');
    return `card:${id}`;
  }

  if (route === 'territory') {
    const id = normalized(params.get('territory'));
    if (!id) throw new Error('Legacy Territory URL requires territory.');
    return `territory:${id}`;
  }

  if (route === 'back') {
    return `back:${normalized(params.get('faction')).toLowerCase() || 'intelligence'}`;
  }

  if (route === 'component') {
    const kind = normalized(params.get('kind')).toLowerCase();
    const id = normalized(params.get('id'));
    const side = normalized(params.get('side')).toLowerCase() || 'front';
    if (!kind || !id) throw new Error('Legacy component URL requires kind and id.');
    if (kind === 'leader') return `leader:${id}`;
    return componentFaceId(game, kind, id, side);
  }

  throw new Error(`Unknown legacy face route: ${route || '(missing)'}.`);
}

async function redirectLegacyFace() {
  const route = normalized(document.documentElement.dataset.legacyFaceRoute).toLowerCase();
  const status = document.getElementById('legacyRedirectStatus');

  try {
    const game = await loadCurrentGame();
    const faceId = legacyFaceId(game, route, new URLSearchParams(window.location.search));
    resolveFace(game, faceId);
    window.location.replace(`/card-design/face-render.html?id=${encodeURIComponent(faceId)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (status) status.textContent = message;
    document.body.dataset.renderReady = 'error';
    document.body.dataset.renderErrorMessage = message;
    console.error(error);
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  redirectLegacyFace();
}
