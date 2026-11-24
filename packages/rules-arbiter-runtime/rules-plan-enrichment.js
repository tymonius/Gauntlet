const ENTITY_MECHANIC_PATTERNS = new Map([
  ["setup", /\b(setup|starting|opening|begin the game)\b/i],
  ["draw", /\b(draw|draw pile|deck)\b/i],
  ["hand", /\bhand|gambit\b/i],
  ["reserve", /\breserve|tactic|battle hand\b/i],
  ["action", /\baction|action opportunity\b/i],
  ["battle", /\bbattle|combat|advantage|dice|roll\b/i],
  ["timing", /\bbefore|after|during|when|while|once per turn|first time|reveal|resolve|resolution\b/i],
  ["movement", /\bmove|movement|advance|withdraw|retreat|rout|onward\b/i],
  ["territory", /\bterritory|capture|occupy|control\b/i],
  ["zones", /\bdiscard pile|graveyard|asset bank|overlay|hand|reserve|draw pile\b/i],
  ["asset", /\basset|banked|overlay\b/i],
  ["cost", /\bcost|pay|spend|value|resource|intel|treasury\b/i],
  ["copy", /\bcopy|copied|repeat|again|replacement|replace\b/i],
  ["interrupt", /\binterrupt|interruption|prevent|cancel|negate\b/i],
  ["victory", /\bwin|victory|last stand|peace treaty|ritual of ascendance\b/i]
]);

function normalized(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function unique(values, limit = 30) {
  const result = [];
  const seen = new Set();
  for (const value of values || []) {
    const text = String(value || "").trim();
    const key = normalized(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

export function enrichPlanFromEntityDocuments(corpus, plan) {
  if (!plan || typeof plan !== "object") return plan;
  const entityIds = new Set((plan.entities || []).map((entity) => entity?.documentId).filter(Boolean));
  const entityNames = (plan.entities || []).map((entity) => entity?.name).filter(Boolean);
  if (!entityIds.size) return plan;

  const entityText = (corpus?.documents || [])
    .filter((document) => entityIds.has(document.id))
    .map((document) => `${document.title || ""} ${document.body || ""}`)
    .join(" ");
  const inferredMechanics = [];
  for (const [mechanic, pattern] of ENTITY_MECHANIC_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(entityText)) inferredMechanics.push(mechanic);
  }
  const mechanics = unique([...(plan.mechanics || []), ...inferredMechanics], 20);
  const retrievalQueries = unique([
    ...(plan.retrievalQueries || []),
    entityNames.length && inferredMechanics.length
      ? `${entityNames.join(" ")} ${inferredMechanics.join(" ")} governing procedure`
      : ""
  ], 30);
  return { ...plan, mechanics, retrievalQueries };
}
