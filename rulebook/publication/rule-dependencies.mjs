import { createHash } from 'node:crypto';

function getPath(root, path) {
  let value = root;
  for (const segment of path || []) {
    if (value == null || !Object.prototype.hasOwnProperty.call(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

function selectValue(value, selector) {
  if (!selector) return value;
  if (!Array.isArray(value)) return undefined;
  const matches = value.filter(candidate => candidate?.[selector.field] === selector.equals);
  if (matches.length !== 1) return undefined;
  return matches[0];
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b))
        .map(key => [key, stableValue(value[key])]),
    );
  }
  return value;
}

export function resolveRegisteredRule(authority, rule) {
  return (rule?.sources || []).map(source => {
    const base = getPath(authority, source.path);
    const value = selectValue(base, source.select);
    if (value === undefined && !source.optional) {
      const selector = source.select
        ? ` where ${source.select.field}=${JSON.stringify(source.select.equals)}`
        : '';
      throw new Error(
        `Rule ${rule.id} cannot resolve authority path ${(source.path || []).join('.')}${selector}.`,
      );
    }
    return value ?? null;
  });
}

export function fingerprintRegisteredRule(authority, rule) {
  const resolved = resolveRegisteredRule(authority, rule);
  return createHash('sha256')
    .update(JSON.stringify(stableValue(resolved)))
    .digest('hex');
}

export function fingerprintRuleDependencies(authority, registryById, ruleIds) {
  const payload = [];
  for (const id of [...new Set(ruleIds || [])].sort((a, b) => a.localeCompare(b))) {
    const rule = registryById.get(id);
    if (!rule) throw new Error(`Unknown registered rule dependency: ${id}.`);
    payload.push([id, fingerprintRegisteredRule(authority, rule)]);
  }
  return createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}
