export function parseRequestedCaseIds(value) {
  const tokens = String(value || "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const seen = new Set();
  return tokens.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function selectBenchmarkCases(
  cases,
  {
    limit = null,
    smokeCaseIds = [],
    requestedCaseIds = []
  } = {}
) {
  const allCases = Array.isArray(cases) ? cases : [];
  const byId = new Map(allCases.map((item) => [item.id, item]));

  if (requestedCaseIds.length) {
    const selected = [];
    const seen = new Set();
    const missing = [];

    for (const id of requestedCaseIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const item = byId.get(id);
      if (!item) {
        missing.push(id);
        continue;
      }
      selected.push(item);
    }

    if (missing.length) {
      throw new Error("Unknown Rules Arbiter QA case id(s): " + missing.join(", "));
    }
    return selected;
  }

  if (!limit) return allCases;

  const selected = [];
  const seen = new Set();

  for (const id of Array.isArray(smokeCaseIds) ? smokeCaseIds : []) {
    const item = byId.get(id);
    if (!item || seen.has(id)) continue;
    selected.push(item);
    seen.add(id);
    if (selected.length >= limit) return selected;
  }

  for (const item of allCases) {
    if (seen.has(item.id)) continue;
    selected.push(item);
    seen.add(item.id);
    if (selected.length >= limit) break;
  }

  return selected;
}
