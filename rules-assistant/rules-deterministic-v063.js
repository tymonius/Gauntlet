export const V063_DETERMINISTIC_CASE_COUNT = 19;

const RULEBOOK_PATH = "artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_Rulebook_Candidate.md";
const CANONICAL_PATH = "artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json";

export function resolveV063DeterministicRuling({ question } = {}) {
  const raw = String(question || "").trim();
  const q = normalize(raw);
  if (!q) return null;

  if (has(q, "setup") && (has(q, "order") || has(q, "sequence") || has(q, "first"))) {
    return ruling("Setup", "order",
      "Prepare faction components, shuffle the remaining Deck to form the Draw Pile, draw four, discard one face up and keep three, arrange Territories, form and reveal the Gauntlet, place Player Tokens, then determine first player.",
      "Opening selection happens before Territory arrangement, and initiative is determined only after both players complete both decisions.",
      "setup");
  }
  if ((has(q, "opening hand") || has(q, "draw four") || has(q, "mulligan")) && !has(q, "territor")) {
    return ruling("Opening Hand", "selection",
      "During setup, draw four cards, choose one to place face up in your Discard Pile, and keep the other three as your opening Hand.",
      "This procedure is mandatory, not an optional mulligan, and the opening discard exists before the first turn begins.",
      "setup");
  }
  if (has(q, "territor") && (has(q, "arrange") || has(q, "order")) && (has(q, "opening") || has(q, "hand") || has(q, "discard") || has(q, "initiative") || has(q, "first player"))) {
    return ruling("Territory arrangement", "setup timing",
      "Arrange your three Territories after you know your three-card opening Hand and face-up opening discard, but before the first-player roll.",
      "Your Hand and opening discard may inform Territory order. Initiative may not.",
      "setup");
  }
  if ((has(q, "start") || has(q, "setup")) && has(q, "token") && (has(q, "enter") || has(q, "movement") || has(q, "territor"))) {
    return ruling("Starting position", "setup placement",
      "Each Player Token starts on the Territory at that player's own end of the Gauntlet.",
      "Setup placement is not movement, does not count as entering the Territory, and does not trigger enter effects. Start-of-turn and continuous effects may still apply normally when their requirements are satisfied.",
      "setup");
  }
  if ((has(q, "run the gauntlet") || has(q, "win") || has(q, "victory")) && (has(q, "two") || has(q, "ways") || has(q, "route") || has(q, "last stand") || has(q, "final territor"))) {
    return ruling("Run the Gauntlet", "victory routes",
      "There are two equal normal ways to run the Gauntlet: capture the Territory at your opponent's end, or win your opponent's Last Stand. Either wins immediately.",
      "Faction-specific alternate victories remain separate unless their rules say otherwise.",
      "victory");
  }
  if (has(q, "final territor") && (has(q, "capture") || has(q, "fortify") || has(q, "immediate")) && (has(q, "win") || has(q, "victory") || has(q, "game"))) {
    return ruling("Final-Territory capture", "immediate victory",
      "Yes. Any legal capture of the Territory at the opponent's end immediately runs the Gauntlet and wins the game.",
      "That includes the normal Capture step and a legal Leader, faction, card, Territory, or other immediate-capture effect. The capture is not delayed merely because it can win.",
      "victory");
  }
  if (has(q, "last stand") && (has(q, "capture") || has(q, "control") || has(q, "movement") || has(q, "advance") || has(q, "immediate"))) {
    return ruling("Last Stand", "access",
      "You do not need to control or capture the final Territory before forcing a Last Stand. You do need a separate legal movement sequence after the battle that forced the opponent beyond the Gauntlet.",
      "If you are on the opponent's final Territory and the opponent is beyond their own end, use that new movement sequence to Advance beyond the Gauntlet and initiate the Last Stand. Unused movement from the battle-creating sequence cannot carry forward.",
      "victory");
  }
  if ((has(q, "deck") || has(q, "draw pile")) && (has(q, "mean") || has(q, "difference") || has(q, "playable deck") || has(q, "term"))) {
    return ruling("Deck terminology", "Deck / Draw Pile",
      "Deck is the constructed set of ordinary cards selected under Deck-construction rules. Draw Pile is the shuffled in-play pile formed from that Deck during setup after applicable faction modifications.",
      "The player-facing term Playable Deck is retired in v0.6.3.",
      "card-rules");
  }
  if ((has(q, "asset") || has(q, "bank")) && (has(q, "inherent") || has(q, "action") || has(q, "how do i bank") || has(q, "bank action"))) {
    return ruling("Asset", "inherent Bank Action",
      "A card with an Asset effect normally has an inherent Bank Action: as an Action, play it from your Hand and bank it.",
      "If the card prints a special banking procedure, use that procedure instead. Asset is the only ordinary banked-card effect heading in v0.6.3.",
      "card-rules");
  }
  if ((has(q, "remove") || has(q, "removed")) && has(q, "asset")) {
    return ruling("Asset Removal", "Remove / Removed",
      "Removed means an Asset was involuntarily lost because an opposing or mandatory effect caused it to leave play.",
      "Voluntarily using or discarding your own Asset and its normal self-expiration are not Removal. Forced loss from a reduced Asset limit is Removal. The word Removed does not itself determine the card's destination.",
      "card-rules");
  }
  if ((has(q, "gambit/tactic") || has(q, "battle effect") || has(q, "activate")) && (has(q, "heading") || has(q, "mean") || has(q, "retired") || has(q, "card"))) {
    return ruling("Card effect headings", "Gambit/Tactic",
      "Gambit/Tactic means the same printed effect is available when the card is committed as either a Gambit or a Tactic.",
      "Battle and Activate are retired card-effect headings in v0.6.3. Asset is the banked-card heading; ordinary role headings are Action, Asset, Gambit, Tactic, and Gambit/Tactic.",
      "card-rules");
  }
  if (has(q, "smuggler's pass") || has(q, "smugglers pass") || (has(q, "smuggler's run") && (has(q, "rename") || has(q, "name")))) {
    return ruling("Smuggler's Run", "v0.6.3 title rename",
      "Smuggler's Run is the v0.6.3 name of the Territory formerly called Smuggler's Pass.",
      "The rename does not change the Territory's mechanics. Smuggler's Pass remains only the historical v0.6.2 title.",
      "card-rules");
  }
  if ((has(q, "reserves") && has(q, "card")) || (has(q, "second line") && (has(q, "rename") || has(q, "name") || has(q, "reserves")))) {
    return ruling("Second Line", "v0.6.3 title rename",
      "Second Line is the v0.6.3 name of the neutral card formerly called Reserves.",
      "The card's mechanics are unchanged by the rename, and the rules term Reserve is still Reserve.",
      "card-rules");
  }
  if (has(q, "margin loan") && (has(q, "stay") || has(q, "remain") || has(q, "banked") || has(q, "next turn") || has(q, "repay") || has(q, "default") || has(q, "draw"))) {
    return ruling("Margin Loan", "persistent loan",
      "Margin Loan may remain banked beyond your next turn. After income, you may Repay or Default; if you do neither, it remains banked.",
      "While Margin Loan remains banked, you may not draw at the start of your turn. Repaying or Defaulting removes the banked Margin Loan under its printed instructions.",
      "card-rules");
  }
  if (has(q, "additional tactic") || (has(q, "+1 tactic") && (has(q, "source") || has(q, "reserve")))) {
    return ruling("Additional Tactics", "default source",
      "Reserve is the default source for an additional Tactic unless the effect names another source.",
      "The shared additional-Tactic rule also governs eligibility, face state, remaining timing, non-reopening of earlier windows, and normal destination unless the effect says otherwise.",
      "card-rules");
  }
  if (has(q, "bound") && (has(q, "host") || has(q, "leaves play") || has(q, "discard") || has(q, "cleanup"))) {
    return ruling("Bind", "default cleanup",
      "Unless an effect gives another instruction, when the host card leaves play, cards bound to it go to their owners' Discard Piles.",
      "If a bound-card limit is reduced below the current number, choose and discard excess bound cards immediately until the limit is satisfied.",
      "card-rules");
  }
  if ((has(q, "reveal") || has(q, "negate") || has(q, "replace")) && (has(q, "priority") || has(q, "interference") || has(q, "same stage") || has(q, "before ordinary"))) {
    return ruling("Reveal-stage interference", "priority",
      "At a Gambit or Tactic reveal stage, interference that reveals, negates, returns, discards, replaces, or otherwise prevents another card from applying normally resolves before ordinary effects at that stage.",
      "If multiple interference effects apply, use the normal shared-timing rule among them.",
      "card-rules");
  }
  if ((has(q, "repeat") || has(q, "apply another")) && (has(q, "effect") || has(q, "card"))) {
    return ruling("Applying and repeating another effect", "copied/repeated effects",
      "Applying or repeating another effect creates a new application at the current timing; the source card itself does not move unless an instruction says it does.",
      "The copied/repeated effect must still have legal targets and satisfy its printed conditions. Make its choices and pay its costs again. Repeat chains are bounded by the shared recursion rule.",
      "card-rules");
  }
  if (has(q, "without a winner") || (has(q, "battle ends") && has(q, "no winner"))) {
    return ruling("Battle ends without a winner", "consequences",
      "If a battle ends without a winner, neither player won or lost that battle.",
      "Effects already applied remain applied; unresolved win/loss-dependent effects do not apply; remaining non-result Aftermath and normal cleanup continue when applicable.",
      "card-rules");
  }

  return null;
}

export function materializeV063DeterministicSources(corpus, deterministic) {
  if (!deterministic) return [];
  const documents = Array.isArray(corpus?.documents) ? corpus.documents : [];
  const preferredKind = deterministic.sourceGroup === "setup" || deterministic.sourceGroup === "victory" ? "rulebook" : null;
  const candidates = documents.filter((document) => !preferredKind || document.kind === preferredKind);
  const terms = normalize(`${deterministic.subject} ${deterministic.topic}`).split(" ").filter((term) => term.length > 3);
  const ranked = candidates
    .map((document) => ({ document, score: terms.reduce((score, term) => score + (normalize(`${document.title} ${document.text}`).includes(term) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score);
  const selected = (ranked.find((item) => item.score > 0) || ranked[0])?.document;
  if (!selected) return [fallbackSource(deterministic.sourceGroup)];
  return [{
    id: selected.id,
    title: selected.title,
    sourcePath: selected.sourcePath,
    sourceUrl: selected.sourceUrl,
    excerpt: excerptFor(selected.text, terms)
  }];
}

function ruling(subject, topic, answer, details, sourceGroup) {
  return {
    subject,
    topic,
    answer: `${answer}${details ? ` ${details}` : ""}`,
    rulingStatus: "explicit",
    confidence: "high",
    responseType: "written_rule",
    sourceGroup
  };
}

function fallbackSource(group) {
  const rulebook = group === "setup" || group === "victory";
  return {
    id: rulebook ? "v063-rulebook" : "v063-canonical-data",
    title: rulebook ? "Gauntlet v0.6.3 Rulebook candidate" : "Gauntlet v0.6.3 canonical data candidate",
    sourcePath: rulebook ? RULEBOOK_PATH : CANONICAL_PATH,
    sourceUrl: rulebook ? "/v0.6.3/rulebook/" : "/v0.6.3/reference/",
    excerpt: "v0.6.3 development candidate source"
  };
}

function excerptFor(text, terms) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  const lower = value.toLowerCase();
  const index = terms.map((term) => lower.indexOf(term)).find((value) => value >= 0) ?? 0;
  return value.slice(Math.max(0, index - 120), Math.min(value.length, index + 520)).trim();
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9+/' -]+/g, " ").replace(/\s+/g, " ").trim();
}
function has(q, term) { return q.includes(term); }
