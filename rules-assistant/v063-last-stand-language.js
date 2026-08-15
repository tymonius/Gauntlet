import { applyV063PlayerFacingRulebookCorrections } from '../rulebook/player-facing/corrections.js';

// PR #171 established that the defender makes a Last Stand; the resulting
// contest is a Last Stand battle. Players win or lose the battle, not the
// Last Stand. Keep this transform explicit and idempotent so certified source
// bytes can remain immutable while current/public v0.6.3 wording stays correct.

export const V063_LAST_STAND_REPLACEMENTS = Object.freeze([
  ["force the opponent into a Last Stand and win it", "force the opponent to make a Last Stand and win the resulting battle"],
  ["forcing the opponent into a Last Stand and winning it", "forcing the opponent to make a Last Stand and winning the resulting battle"],
  ["Winning the opponent's Last Stand", "Forcing the opponent to make a Last Stand and winning the resulting battle"],
  ["Winning your opponent's Last Stand", "Forcing your opponent to make a Last Stand and winning the resulting battle"],
  ["winning that opponent's Last Stand", "forcing that opponent to make a Last Stand and winning the resulting battle"],
  ["winning your opponent's Last Stand", "forcing your opponent to make a Last Stand and winning the resulting battle"],
  ["winning the opponent's Last Stand", "forcing the opponent to make a Last Stand and winning the resulting battle"],
  ["winning the opponent’s Last Stand", "forcing the opponent to make a Last Stand and winning the resulting battle"],
  ["winning your opponent’s Last Stand", "forcing your opponent to make a Last Stand and winning the resulting battle"],
  ["win your opponent's Last Stand", "force your opponent to make a Last Stand and win the resulting battle"],
  ["win the opponent's Last Stand", "force the opponent to make a Last Stand and win the resulting battle"],
  ["wins the opponent's Last Stand", "forces the opponent to make a Last Stand and wins the resulting battle"],
  ["loses the opponent's Last Stand", "loses the resulting Last Stand battle"],
  ["win your opponent’s Last Stand", "force your opponent to make a Last Stand and win the resulting battle"],
  ["win the opponent’s Last Stand", "force the opponent to make a Last Stand and win the resulting battle"],
  ["wins the opponent’s Last Stand", "forces the opponent to make a Last Stand and wins the resulting battle"],
  ["loses the opponent’s Last Stand", "loses the resulting Last Stand battle"],
  ["win their Last Stand", "force them to make a Last Stand and win the resulting battle"],
  ["wins their Last Stand", "forces them to make a Last Stand and wins the resulting battle"],
  ["Forcing and Winning a Last Stand", "Forcing the Opponent to Make a Last Stand"],
  ["Winning a Last Stand", "Winning a Last Stand Battle"],
  ["Control of that Territory is not required to initiate a Last Stand.", "Control of that Territory is not required to force the opponent to make a Last Stand."],
  ["The final Territory does not need to be controlled or already captured before that Last Stand can be initiated.", "The final Territory does not need to be controlled or already captured before the opponent can be forced to make a Last Stand."],
  ["initiates the opponent's Last Stand", "forces the opponent to make a Last Stand"],
  ["initiate the opponent's Last Stand", "force the opponent to make a Last Stand"],
  ["initiating the opponent's Last Stand", "forcing the opponent to make a Last Stand"],
  ["initiate the opponent’s Last Stand", "force the opponent to make a Last Stand"],
  ["initiates the opponent’s Last Stand", "forces the opponent to make a Last Stand"],
  ["initiating the opponent’s Last Stand", "forcing the opponent to make a Last Stand"],
  ["initiate an immediate Last Stand", "immediately force the opponent to make a Last Stand"],
  ["initiating an immediate Last Stand", "immediately forcing the opponent to make a Last Stand"],
  ["initiate a legal Last Stand", "force the opponent to make a Last Stand"],
  ["initiating a legal Last Stand", "forcing the opponent to make a Last Stand"],
  ["initiate a Last Stand", "force the opponent to make a Last Stand"],
  ["initiating a Last Stand", "forcing the opponent to make a Last Stand"],
  ["initiate the Last Stand", "force the opponent to make a Last Stand"],
  ["initiating the Last Stand", "forcing the opponent to make a Last Stand"],
  ["initiate Last Stand", "force the opponent to make a Last Stand"],
  ["initiating Last Stand", "forcing the opponent to make a Last Stand"],
  ["force a Last Stand immediately", "force the opponent to make a Last Stand immediately"],
  ["forcing a Last Stand immediately", "forcing the opponent to make a Last Stand immediately"],
  ["Conduct the Last Stand", "Conduct the resulting battle"],
  ["conduct the Last Stand", "conduct the resulting battle"],
  ["wins the Last Stand", "wins this battle"],
  ["win the Last Stand", "win this battle"],
  ["loses the Last Stand", "loses this battle"],
  ["lose the Last Stand", "lose this battle"],
  ["losing the Last Stand", "losing this battle"],
  ["directly into the Last Stand", "directly into a Last Stand battle"],
  ["carry into the Last Stand", "carry into a Last Stand battle"],
  ["Last Stand route", "Last Stand battle route"],
  ["Last Stand bonuses", "Last Stand battle bonuses"],
  ["during their Last Stand", "during a Last Stand battle"],
  [
    "A battle beyond the opponent's end. It is an independent Run-the-Gauntlet battle route and requires a separate legal movement sequence, not prior capture or control of the final Territory.",
    "A final stand the defender makes beyond their end of the Gauntlet. The resulting contest is a Last Stand battle. It is an independent Run-the-Gauntlet battle route and requires a separate legal movement sequence, not prior capture or control of the final Territory."
  ],
  [
    "A battle beyond the opponent's end. It is an independent Run-the-Gauntlet route and requires a separate legal movement sequence, not prior capture or control of the final Territory.",
    "A final stand the defender makes beyond their end of the Gauntlet. The resulting contest is a Last Stand battle. It is an independent Run-the-Gauntlet battle route and requires a separate legal movement sequence, not prior capture or control of the final Territory."
  ],
]);

function replaceLiteral(source, from, to) {
  return source.includes(from) ? source.split(from).join(to) : source;
}

export function normalizeV063LastStandText(value) {
  let text = String(value ?? '');
  for (const [from, to] of V063_LAST_STAND_REPLACEMENTS) {
    text = replaceLiteral(text, from, to);
  }
  return applyV063PlayerFacingRulebookCorrections(text);
}

export function normalizeV063LastStandValue(value) {
  if (typeof value === 'string') return normalizeV063LastStandText(value);
  if (Array.isArray(value)) return value.map(normalizeV063LastStandValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeV063LastStandValue(child)]));
  }
  return value;
}

const RETIRED_PATTERNS = Object.freeze([
  ['winning/losing a Last Stand instead of its battle', /\b(?:win|wins|winning|lose|loses|losing)\s+(?:(?:your|their|that|the)\s+)?(?:opponent(?:['’]s)?\s+)?Last Stand\b/gi],
  ['initiating a Last Stand instead of forcing the defender to make one', /\binitiat(?:e|es|ed|ing)\b[^\n.!?]{0,48}\bLast Stand\b/gi],
  ['passively initiating a Last Stand instead of the defender making one', /\bLast Stand\b[^\n.!?]{0,48}\binitiat(?:e|es|ed|ing)\b/gi],
  ['forcing the defender into a Last Stand', /\bforc(?:e|es|ed|ing)\s+(?:the\s+)?opponent\s+into\s+a\s+Last Stand\b/gi],
  ['conducting the Last Stand as though it were the battle', /\bconduct\s+the\s+Last Stand\b/gi],
  ['defining Last Stand itself as a battle', /\*\*Last Stand:\*\*\s+A battle\b/gi],
  ['calling the route a Last Stand route rather than a battle route', /\bLast Stand route\b/gi],
]);

export function findV063LastStandTerminologyViolations(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const violations = [];
  for (const [label, pattern] of RETIRED_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      violations.push({ label, match: match[0], index: match.index ?? -1 });
    }
  }
  return violations;
}
