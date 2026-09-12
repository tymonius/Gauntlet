function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function validateVisualPolicy(policy) {
  const visualPolicy = policy && typeof policy === 'object' ? policy : {};
  const direction = visualPolicy.artDirectionDefault;
  if (!direction || typeof direction !== 'object' || Array.isArray(direction)) {
    throw new Error('Visual authority is missing visualPolicy.artDirectionDefault.');
  }
  if (direction.fit !== 'cover' && direction.fit !== 'contain') {
    throw new Error('visualPolicy.artDirectionDefault.fit must be cover or contain.');
  }
  const zoom = Number(direction.zoom);
  if (!Number.isFinite(zoom) || zoom < 1 || zoom > 1.8) {
    throw new Error('visualPolicy.artDirectionDefault.zoom must be between 1 and 1.8.');
  }
  if (direction.smart !== true && direction.smart !== false) {
    throw new Error('visualPolicy.artDirectionDefault.smart must be boolean.');
  }
  return true;
}

export function artDirectionDefault(policy) {
  validateVisualPolicy(policy);
  return Object.freeze(clone(policy.artDirectionDefault));
}

export function resolveArtDirection(policy, overrides, id) {
  const base = artDirectionDefault(policy);
  const override = id && overrides && typeof overrides === 'object'
    ? overrides[id]
    : null;
  return Object.freeze({
    ...base,
    ...(override && typeof override === 'object' ? clone(override) : {}),
  });
}

export function hasExplicitArtDirection(overrides, id) {
  return Boolean(id)
    && Boolean(overrides)
    && typeof overrides === 'object'
    && Object.prototype.hasOwnProperty.call(overrides, id);
}

