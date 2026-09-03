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

function validateFocusValue(value, label) {
  if (value === undefined || value === null) return;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) {
    throw new Error(`${label} must be null or a finite 0..1 fraction.`);
  }
}

export function validateArtDirectionOverrides(overrides) {
  if (overrides === undefined || overrides === null) return true;
  if (typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new Error('artDirection must be an object keyed by canonical artwork id.');
  }

  for (const [id, value] of Object.entries(overrides)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`artDirection.${id} must be an object.`);
    }
    if (value.fit !== undefined && value.fit !== 'cover' && value.fit !== 'contain') {
      throw new Error(`artDirection.${id}.fit must be cover or contain.`);
    }
    if (value.smart !== undefined && value.smart !== true && value.smart !== false) {
      throw new Error(`artDirection.${id}.smart must be boolean.`);
    }
    if (value.zoom !== undefined) {
      const zoom = Number(value.zoom);
      if (!Number.isFinite(zoom) || zoom < 1 || zoom > 1.8) {
        throw new Error(`artDirection.${id}.zoom must be between 1 and 1.8.`);
      }
    }

    if (value.focus !== undefined) {
      if (!Array.isArray(value.focus) || value.focus.length !== 2) {
        throw new Error(`artDirection.${id}.focus must be a two-value 0..1 pair.`);
      }
      validateFocusValue(value.focus[0], `artDirection.${id}.focus[0]`);
      validateFocusValue(value.focus[1], `artDirection.${id}.focus[1]`);
    }
    validateFocusValue(value.focusX, `artDirection.${id}.focusX`);
    validateFocusValue(value.focusY, `artDirection.${id}.focusY`);
  }
  return true;
}

export function artDirectionDefault(policy) {
  validateVisualPolicy(policy);
  return Object.freeze(clone(policy.artDirectionDefault));
}

export function resolveArtDirection(policy, overrides, id) {
  validateArtDirectionOverrides(overrides);
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

