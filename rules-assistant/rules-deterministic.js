import { normalizeForSearch } from "./rules-intelligence.js";
import {
  canonicalSourcesForIds,
  findComponentDocument,
  resolveActiveContext
} from "./rules-packets.js";

function matches(text, pattern) {
  pattern.lastIndex = 0;
  return pattern.test(text);
}

function result({ id, answer, rulingStatus = "explicit", sourceIds = [], subject = null, topic = null, confidence = null, responseType = "ruling" }) {
  return {
    id,
    answer,
    rulingStatus,
    sourceIds,
    subject,
    topic,
    confidence: confidence || (rulingStatus === "explicit" ? "high" : rulingStatus === "inferred" ? "medium" : "low"),
    responseType
  };
}

function historyHasTopic(history, pattern) {
  return [...(history || [])].reverse().some((item) => pattern.test(String(item?.topic || item?.content || "")));
}

function impossibleChoiceQuestion(text) {
  return /\b(either|choose)\b[\s\S]*\bor\b/i.test(text)
    && /\b(no cards?|nothing)\b[\s\S]*\bhand\b|\bcannot\b[\s\S]*\bdiscard\b/i.test(text)
    && /\b(battle total|\+1|plus one)\b/i.test(text);
}

function genericComponentQuestion(question, subject) {
  if (!subject) return false;
  const normalizedQuestion = normalizeForSearch(question);
  const normalizedSubject = normalizeForSearch(subject);
  if (!normalizedQuestion.includes(normalizedSubject)) return false;
  return /\b(what does|how does|explain|what is)\b/i.test(question)
    && /\b(do|does|work|effect|card|ability|leader|territory|faction)\b/i.test(question);
}

function canonicalComponentAnswer(document) {
  const title = String(document.title || "Canonical component").replace(/^[^:]+:\s*/, "");
  const lines = String(document.body || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return `${title}:\n${lines.join("\n")}`;
}

function namedEntityNames(plan) {
  return (plan?.entities || [])
    .filter((entity) => entity?.documentId)
    .map((entity) => normalizeForSearch(entity.name));
}

function hasNamedEntityOutside(plan, allowed = []) {
  const allowedNames = new Set(allowed.map(normalizeForSearch));
  return namedEntityNames(plan).some((name) => !allowedNames.has(name));
}

export function resolveDeterministicRuling(corpus, { question, history = [], gameState = null, plan = null, packet = null } = {}) {
  const text = String(question || "").trim();
  if (!text) return null;
  const active = resolveActiveContext(corpus, text, history, plan);
  const subject = packet?.subject || active.subject;
  const topic = packet?.topic || active.topic;

  if (/^can i use this ability right now\??$/i.test(text) && !subject) {
    return result({
      id: "needs-context-ability",
      answer: "I need the ability's name or exact text, whose turn it is, the current phase or battle step, and any relevant state such as resources available or once-per-turn uses already spent. Without that information, I cannot determine whether it may be used now.",
      rulingStatus: "source_lookup",
      sourceIds: [],
      subject: null,
      topic: "timing eligibility",
      confidence: "low",
      responseType: "clarification"
    });
  }

  if (/^can i (?:deploy|play|use|set|choose|reveal|discard|return|move) (?:the|this|that|my) (?:stored|bound|set[- ]aside|face[- ]down|hidden) card(?: now| right now)?\??$/i.test(text) && !subject) {
    return result({
      id: "needs-context-unnamed-card",
      answer: "I need the card's name or exact text and the current timing or phase. 'Stored card' is not enough to identify which component holds it or when it may be used, so I cannot make a reliable ruling yet.",
      rulingStatus: "source_lookup",
      sourceIds: [],
      subject: null,
      topic: "missing card context",
      confidence: "low",
      responseType: "clarification"
    });
  }

  if (impossibleChoiceQuestion(text)) {
    return result({
      id: "impossible-choice-provisional",
      answer: "Provisional Arbiter Ruling: The opponent must choose an option they can actually perform. With no card in Hand, the discard option is unavailable, so they must choose the option that gives you +1 to your battle total. Use this ruling for the rest of this game; it has been logged for designer review.",
      rulingStatus: "provisional",
      sourceIds: ["rulebook:golden-rules", "rulebook:complete-rules-12", "rulebook:hand"],
      subject: "Choice legality",
      topic: "unperformable option",
      confidence: "low"
    });
  }

  if (/\b(tied|tie)\b/i.test(text) && /\b(first player|goes first|initial roll)\b/i.test(text)) {
    return result({
      id: "setup-first-player-tie",
      answer: "Roll again. The higher result goes first, and tied initial rolls are rerolled until one player has the higher result.",
      sourceIds: ["rulebook:complete-rules-2"],
      subject: "Setup",
      topic: "first player"
    });
  }

  if (/\bcleanup\b/i.test(text) && /\b(five|5) cards?\b/i.test(text) && /\bhand\b/i.test(text)) {
    return result({
      id: "cleanup-hand-limit",
      answer: "Discard two cards. During Cleanup, reduce your Hand to the normal limit of three cards.",
      sourceIds: ["rulebook:cleanup", "rulebook:hand"],
      subject: "Cleanup",
      topic: "Hand limit"
    });
  }

  if (/\bdraw (?:three|3) cards?\b/i.test(text) && /\bdraw pile\b/i.test(text) && /\bdiscard pile\b/i.test(text)) {
    return result({
      id: "partial-draw-refill",
      answer: "Draw the available card from your Draw Pile, shuffle the Discard Pile to form a new Draw Pile, and continue the same draw. If the two piles still cannot provide all three cards, draw as many as possible; do not shuffle back cards already drawn.",
      sourceIds: ["rulebook:draw"],
      subject: "Draw",
      topic: "incomplete draw"
    });
  }

  if (/\bbattle totals? (?:are )?tied|\btied battle totals?\b/i.test(text)
      && /\bdefender\b/i.test(text)
      && /\bdoes not control|doesn't control|not control\b/i.test(text)) {
    return result({
      id: "unbroken-battle-tie",
      answer: "Defender's Advantage does not break this tie because the defender does not control the contested Territory. Both players reroll; cards and effects already in use remain active.",
      sourceIds: ["rulebook:determine-the-winner"],
      subject: "Battle tie",
      topic: "reroll"
    });
  }

  if (/\bprevents? the pending battle|pending battle.*prevent/i.test(text)
      && /\bopening effects?\b/i.test(text)) {
    return result({
      id: "prevented-pending-battle",
      answer: "No battle is fought, so battle, victory, loss, retreat, and Aftermath triggers do not occur. Follow only the preventing effect's own remaining instructions, including any withdrawal movement it specifies.",
      sourceIds: ["rulebook:1-opening-effects", "rulebook:withdrawal-during-opening-effects"],
      subject: "Prevented battle",
      topic: "opening effects"
    });
  }

  if (/\bpurification\b/i.test(text) && /\breserve\b/i.test(text)) {
    return result({
      id: "purification-reserve-draw",
      answer: "No. Failing to form a Reserve does not trigger Purification. Purification checks only after the opponent's normal start-of-turn draw attempt draws no cards because both their Draw Pile and Discard Pile are empty.",
      sourceIds: ["rulebook:purification"],
      subject: "Purification",
      topic: "Reserve draw"
    });
  }

  if (/\brite of blood\b/i.test(text) && /\btransmutation\b/i.test(text)) {
    return result({
      id: "rite-of-blood-transmutation",
      answer: "Yes. Rite of Blood completes if you win without setting a Gambit or choosing a Tactic; using Transmutation does not prevent completion.",
      sourceIds: ["rulebook:rite-of-blood", "rulebook:transmutation"],
      subject: "Rite of Blood",
      topic: "completion with Transmutation"
    });
  }

  if (/\bpenance\b/i.test(text) && /\bhand\b/i.test(text) && /\b(empty|no cards?|nothing)\b/i.test(text)) {
    return result({
      id: "penance-empty-hand-provisional",
      answer: "Provisional Arbiter Ruling: With no card in Hand, the opponent cannot choose Penance's first option, so you gain 1 Conviction. Use this ruling for the rest of this game; it has been logged for designer review.",
      rulingStatus: "provisional",
      sourceIds: ["card:inquisition-penance", "rulebook:golden-rules", "rulebook:complete-rules-12"],
      subject: "Penance",
      topic: "unperformable option",
      confidence: "low"
    });
  }

  if (/\boverlay\b/i.test(text)
      && /\b(dormant|covered|lower)\b/i.test(text)
      && /\b(timer|expiration|removal condition)\b/i.test(text)) {
    return result({
      id: "dormant-overlay-timing",
      answer: "No. A dormant Overlay's expiration timer pauses while it is covered. Its printed removal condition remains active and can still remove it while it is dormant.",
      sourceIds: ["rulebook:complete-rules-13"],
      subject: "Dormant Overlay",
      topic: "expiration and removal"
    });
  }

  if (/\bdecoys\b/i.test(text) && /\bcapital punishment\b/i.test(text)) {
    return result({
      id: "decoys-capital-punishment",
      answer: "Yes. When Capital Punishment would make another banked Asset leave play, discard Decoys to keep the targeted Asset in play. Decoys goes to its owner's Discard Pile.",
      sourceIds: ["card:neutral-decoys", "card:neutral-capital-punishment", "rulebook:using-and-discarding-assets"],
      subject: "Decoys",
      topic: "Capital Punishment"
    });
  }

  if (/\brearguard\b/i.test(text) && /\brout\b/i.test(text)) {
    return result({
      id: "rearguard-rout-order",
      answer: "Discard Rearguard to prevent Rout's movement. No Command is spent, and Rout cannot be used again that turn. Rout is an Order, not a card, so it does not return to Hand.",
      sourceIds: ["card:military-rearguard", "rulebook:orders"],
      subject: "Rearguard",
      topic: "Rout"
    });
  }

  if (/\bbrothers in arms\b/i.test(text)
      && /\b(additional|second) tactic\b/i.test(text)
      && /\bhand\b/i.test(text)
      && /\b(where|go|destination|aftermath)\b/i.test(text)) {
    return result({
      id: "brothers-in-arms-destinations",
      answer: "Discard Brothers in Arms to its owner's Discard Pile. The ordinary Tactic chosen from Reserve goes to its owner's Discard Pile in the Aftermath. The additional Tactic chosen from Hand goes to its owner's Graveyard.",
      sourceIds: ["card:military-brothers-in-arms", "rulebook:clearing-battle-cards", "rulebook:using-and-discarding-assets"],
      subject: "Brothers in Arms",
      topic: "Aftermath destinations"
    });
  }

  if (/\b(attacker|defender)\b/i.test(text)
      && /\b(remain fixed|roles? remain|stop being the attacker|through the aftermath)\b/i.test(text)
      && /\baftermath\b/i.test(text)) {
    return result({
      id: "battle-roles-remain-fixed",
      answer: "Attacker and defender remain fixed through the entire Aftermath. The defender's retreat and the battle result do not change those roles.",
      sourceIds: ["rulebook:complete-rules-7", "rulebook:normal-result"],
      subject: "Battle roles",
      topic: "Aftermath"
    });
  }

  if (/\bfortifications\b/i.test(text)
      && /\b(two tactics|choose two|choose the second|opponent'?s choice)\b/i.test(text)) {
    return result({
      id: "fortifications-simultaneous-choice",
      answer: "No. Choose both Tactics during the same Choose Tactics stage. Fortifications changes how many Tactics you choose, not the timing, so you cannot wait to see the opponent's choice before choosing the second.",
      sourceIds: ["card:neutral-fortifications", "rulebook:5-choose-tactics"],
      subject: "Fortifications",
      topic: "choosing Tactics"
    });
  }

  if (/\bvalor\b/i.test(text) && /\b(withdraw|withdrawal|withdrew|withdrawn)\b/i.test(text) && /\bbattle\b/i.test(text)) {
    return result({
      id: "valor-withdrawal",
      answer: "No. Withdrawal from a battle ends it without a winner or loser, so you did not lose the battle and Valor does not trigger. Loss and retreat triggers do not occur.",
      sourceIds: ["rulebook:effect-caused-withdrawal-from-battle", "card:neutral-valor"],
      subject: "Valor",
      topic: "withdrawal"
    });
  }

  if (/\bcommandant\b/i.test(text) && /\brepel\b/i.test(text)
      && /\b(first battle|first time)\b/i.test(text) && /\b(win|won)\b/i.test(text)) {
    return result({
      id: "commandant-command-repel",
      answer: "Yes. The first time each turn you win a battle, you gain 1 Command even during the opponent's turn. That Command is available during the same Aftermath, so you may spend it on Repel after the opponent's normal retreat.",
      sourceIds: ["rulebook:complete-rules-13", "rulebook:commandant", "rulebook:orders-2"],
      subject: "Commandant",
      topic: "Command and Repel"
    });
  }

  if (/\b(active )?mission\b/i.test(text) && /\b(same turn|turn (?:i|it) (?:started|began)|began that turn)\b/i.test(text)
      && /\b(complete|completion)\b/i.test(text)) {
    return result({
      id: "mission-no-same-turn-completion",
      answer: "No. An Active Mission cannot complete during the turn it begins, even if you satisfy its requirement that turn. It may be completed during an Action Opportunity on a later turn if it remains satisfied.",
      sourceIds: ["rulebook:starting-a-mission", "rulebook:completing-a-mission"],
      subject: "Active Mission",
      topic: "same-turn completion"
    });
  }

  if (/\bsafe conduct\b/i.test(text) && /\bpolitical capital\b/i.test(text)) {
    return result({
      id: "safe-conduct-political-capital",
      answer: "No. Safe Conduct replaces the refused-Terms loss with withdrawal, returns your staked Influence, and ends the battle without a winner or loser. Because you do not lose the battle or lose the Stake, Political Capital does not trigger.",
      sourceIds: ["card:diplomats-safe-conduct", "rulebook:senator", "rulebook:refused-terms", "rulebook:influence"],
      subject: "Political Capital",
      topic: "Safe Conduct"
    });
  }

  if (/\brousing speech\b/i.test(text) && /\b(face[- ]?up|turns? .* face[- ]?up|existing face[- ]?down asset)\b/i.test(text)) {
    return result({
      id: "rousing-speech-existing-asset",
      answer: "No. Rousing Speech triggers when the opponent banks an Asset. Turning an already banked face-down Asset face up does not bank it again, so Rousing Speech does not trigger.",
      sourceIds: ["card:neutral-rousing-speech", "rulebook:assets"],
      subject: "Rousing Speech",
      topic: "banking an Asset"
    });
  }

  if (/\bresourcefulness\b/i.test(text)
      && /\b(copy|copied|copying)\b/i.test(text)
      && /\bwithout\b[\s\S]*\b(play(?:ing|ed)?|set(?:ting)?|choos(?:ing|e|en))\b/i.test(text)) {
    return result({
      id: "resourcefulness-copied-effect",
      answer: "No. Resourcefulness triggers only when a cost-1 card you played, set, or chose resolves its printed effect. Copying that effect without playing, setting, or choosing the card again does not trigger Resourcefulness.",
      sourceIds: ["card:neutral-resourcefulness", "rulebook:printed-card-effects"],
      subject: "Resourcefulness",
      topic: "copied effect"
    });
  }

  if (/\bfieldcraft\b/i.test(text) && /\b(changes? control|control of a territory|territory control)\b/i.test(text)) {
    return result({
      id: "fieldcraft-control-change",
      answer: "No. Fieldcraft may ignore a printed Territory effect that would affect you, your movement, or your battle. It expressly does not alter Territory control, Occupation, or capture, so it cannot ignore an effect that changes control.",
      sourceIds: ["rulebook:ranger", "rulebook:control"],
      subject: "Fieldcraft",
      topic: "Territory control"
    });
  }

  if (matches(text, /\b(how many cards.*start|draw to start|starting hand|opening hand|hand.*start)\b/i)) {
    return result({
      id: "setup-opening-hand",
      answer: "At setup, each player draws three cards to form their opening Hand.",
      sourceIds: ["rulebook:complete-rules-2", "rulebook:how-it-works-3"],
      subject: "Setup",
      topic: "opening Hand"
    });
  }

  if (matches(text, /\bwhere do gambits and tactics go|gambits? and tactics?.*(go|resolve|aftermath)|where.*gambits?.*tactics?\b/i)
      && !hasNamedEntityOutside(plan, [])) {
    return result({
      id: "battle-card-destinations",
      answer: "During the Aftermath, Gambits normally go to their owners' Graveyards. Tactics and cards remaining in Reserve normally go to their owners' Discard Piles. Follow a card if it explicitly sends itself somewhere else.",
      sourceIds: ["rulebook:clearing-battle-cards", "rulebook:gambit-area", "rulebook:tactic-area", "rulebook:reserve"],
      subject: "Battle card destinations",
      topic: "Aftermath"
    });
  }

  if (matches(text, /\bwhen.*occupied territory.*captur|when is an occupied territory captured|occupier.*capture\b/i)) {
    return result({
      id: "territory-capture",
      answer: "Winning an attack on an opposing Territory normally makes you its occupier; it does not capture the Territory immediately. If you are still the occupier at the start of your next turn, capture it during the Capture step by rotating it to face you. A specific effect may cause an earlier capture.",
      sourceIds: ["rulebook:occupation", "rulebook:capture", "rulebook:capture-2", "rulebook:counterattack"],
      subject: "Territory capture",
      topic: "Capture step"
    });
  }

  if (matches(text, /\b(defender'?s? advantage|defender advantage)\b/i)) {
    return result({
      id: "defenders-advantage",
      answer: "Defender's Advantage is a tie rule, not ordinary advantage. If battle totals are tied and the defender controls the contested Territory, the defender wins. It does not grant an additional die. It also applies during a Last Stand battle; the separate Last Stand +1 bonus still applies as well.",
      sourceIds: ["rulebook:determine-the-winner", "rulebook:last-stand-battle"],
      subject: "Defender's Advantage",
      topic: "tied battle total"
    });
  }

  if (matches(text, /\bhow many action opportunities|action opportunities.*normally|normal.*action opportunities\b/i)) {
    return result({
      id: "normal-action-opportunities",
      answer: "A normal turn has two Action Opportunities: one before movement and one after movement. You normally begin with only 1 Action, and you may spend at most 1 Action during each opportunity.",
      sourceIds: ["rulebook:actions-and-action-opportunities", "rulebook:actions-and-action-opportunities-2"],
      subject: "Action Opportunities",
      topic: "normal turn"
    });
  }

  if (matches(text, /\bonward\b/i) && matches(text, /\b(after|continue|battle)\b/i)) {
    return result({
      id: "onward-after-battle",
      answer: "No. Onward is used during your Movement step before a battle begins to move one additional position. If that movement starts a battle, the movement sequence ends and Onward cannot continue after the battle. Movement after the battle requires an effect that explicitly permits it, such as Rout when its conditions are met.",
      sourceIds: ["rulebook:orders", "rulebook:movement", "rulebook:movement-after-battle"],
      subject: "Onward",
      topic: "movement after battle"
    });
  }

  if (matches(text, /\bsurveillance\b/i) && matches(text, /\b(interference|same face[- ]?down|commitment)\b/i)) {
    return result({
      id: "surveillance-then-interference",
      answer: "Yes. After revealing a face-down opposing Gambit or Tactic through Surveillance, Intelligence may immediately spend 2 additional Intel per revealed card to Interfere with it. Surveillance costs 1 Intel per card revealed, so revealing and removing one face-down card costs 3 Intel total. The owner may replace it from the same source or pass; the replacement creates no new Surveillance or Interference opportunity.",
      sourceIds: ["rulebook:gambit-surveillance", "rulebook:tactic-surveillance", "rulebook:interference-after-surveillance"],
      subject: "Surveillance",
      topic: "face-down Interference"
    });
  }

  if (matches(text, /\binterference\b/i) && matches(text, /\b(already|set|chosen|commitment).*face[- ]?up|face[- ]?up.*(cost|interference|commitment)\b/i)) {
    return result({
      id: "direct-interference-face-up",
      answer: "Yes, if the opposing effect sets or chooses the card face up at the normal response timing. Direct Interference costs 2 Intel. It does not use Surveillance, but it does use that stage's Interference opportunity. A card that becomes face up after the response window has closed does not create a new Interference opportunity.",
      sourceIds: ["rulebook:direct-interference", "rulebook:multiple-and-additional-gambits-or-tactics"],
      subject: "Interference",
      topic: "face-up commitment"
    });
  }

  if (matches(text, /\bspecific instruction.*conflict|specific.*normal battle sequence|card.*conflicts?.*general|specific rule.*general\b/i)) {
    return result({
      id: "specific-over-general",
      answer: "Follow the card's specific instruction where it conflicts with the normal battle sequence. Apply it only at its stated timing and follow its instructions in order. Do not reopen an earlier timing window, repeat a completed step, or create a new response opportunity unless the card or another rule explicitly says to do so.",
      sourceIds: ["rulebook:golden-rules", "rulebook:complete-rules-12", "rulebook:replacements-and-revisions"],
      subject: "Specific-over-general rule",
      topic: "battle sequence conflict"
    });
  }

  if (matches(text, /\bbattle hands?\b/i)) {
    return result({
      id: "obsolete-battle-hand-term",
      answer: "'Battle Hand' is not a current v0.6.1 term. If you mean both players have set their Gambits, next set Hands aside, form three-card Reserves, and then reveal Gambits. If you mean both players have chosen their Tactics, reveal the Tactics next. Your ordinary advantage matters later when dice are rolled: roll one additional die per net advantage and keep the highest.",
      sourceIds: [
        "rulebook:complete-rules-6",
        "rulebook:2-set-gambits",
        "rulebook:3-form-reserves",
        "rulebook:4-reveal-gambits",
        "rulebook:5-choose-tactics",
        "rulebook:6-reveal-tactics",
        "rulebook:advantage-and-disadvantage"
      ],
      subject: "Battle sequence",
      topic: "obsolete terminology"
    });
  }

  if (/^how does surveillance work\??$/i.test(text)) {
    return result({
      id: "surveillance-overview",
      answer: "Surveillance gives Intelligence two independent once-per-battle opportunities. After the opponent sets a face-down Gambit, spend 1 Intel to reveal it. After the opponent chooses one or more face-down Tactics, spend 1 Intel for each opposing Tactic you reveal. Immediately after a Surveillance reveal, you may spend 2 additional Intel per revealed card to Interfere. A removed Gambit returns to Hand; a removed Tactic returns to Reserve. The owner may replace it from the same source or pass, and a replacement creates no new reveal or response opportunity. If an opposing effect sets or chooses a card face up, Direct Interference costs 2 Intel without using Surveillance. The separate Intelligence-mirror sequence applies only when both players are Intelligence.",
      sourceIds: [
        "rulebook:gambit-surveillance",
        "rulebook:tactic-surveillance",
        "rulebook:interference-after-surveillance",
        "rulebook:direct-interference",
        "rulebook:intelligence-mirrors"
      ],
      subject: "Surveillance",
      topic: "overview"
    });
  }

  if (matches(text, /\bwhat if.*already face[- ]?up|commitment.*already face[- ]?up\b/i) && /Surveillance|Interference/i.test(subject || "")) {
    return result({
      id: "surveillance-follow-up-face-up",
      answer: "If an opposing effect sets or chooses the card face up at the normal response timing, you may use Direct Interference for 2 Intel. This does not use Surveillance, but it does use that stage's Interference opportunity. If the card became face up by Surveillance, Interference costs 2 additional Intel after the 1-Intel reveal. A card that becomes face up after the response window has closed does not create a new Interference opportunity.",
      sourceIds: ["rulebook:direct-interference", "rulebook:interference-after-surveillance", "rulebook:multiple-and-additional-gambits-or-tactics"],
      subject: "Surveillance",
      topic: "face-up commitment"
    });
  }

  if (matches(text, /\bdoes that change the cost|change.*cost of interference|cost of interference\b/i)
      && (/Surveillance|Interference/i.test(subject || "") || historyHasTopic(history, /face-up commitment/i))) {
    return result({
      id: "interference-cost-follow-up",
      answer: "Being face up does not increase the Interference cost. If an opposing effect sets or chooses the card face up at the response timing, Direct Interference costs 2 Intel and no Surveillance cost is paid. If you first reveal a face-down card with Surveillance, pay 1 Intel to reveal it and then 2 additional Intel to Interfere, for 3 total. If the response window has already closed, Interference is unavailable.",
      sourceIds: ["rulebook:direct-interference", "rulebook:interference-after-surveillance"],
      subject: "Interference",
      topic: "face-up commitment cost"
    });
  }

  if ((/^when does a card go to the discard after being played\??$/i.test(text)
      || (/\b(action card|action effect|played for (?:its )?action)\b/i.test(text)
        && /\b(discard pile|where does|where do|destination|after resolving)\b/i.test(text)))
      && !hasNamedEntityOutside(plan, [])
      && !/gambit|tactic|reserve|cleanup|draw pile/i.test(text)) {
    return result({
      id: "action-card-destination",
      answer: "When you play a card from Hand for its Action effect, apply the effect and then put the card in your Discard Pile unless it becomes an Asset, becomes an Overlay, or its text sends it somewhere else. Battle cards use the Aftermath destinations instead: Gambits normally go to the Graveyard, while Tactics and unused Reserve cards go to the Discard Pile.",
      sourceIds: ["rulebook:action-effects", "rulebook:clearing-battle-cards", "rulebook:printed-card-effects"],
      subject: "Action card resolution",
      topic: "card destination"
    });
  }

  if (matches(text, /\b(fifth|five|5)\b.*\bproposal|proposal.*\b(fifth|five|5)\b/i)) {
    return result({
      id: "peace-treaty-timing",
      answer: "You do not win immediately. At the start of your next turn, after the Capture step and before the Draw step, you win through the Peace Treaty if six different Proposals are ratified.",
      sourceIds: ["rulebook:treaty-articles-and-peace-treaty"],
      subject: "Peace Treaty",
      topic: "victory timing"
    });
  }

  if (matches(text, /\btransmutation\b/i)
      && !hasNamedEntityOutside(plan, ["Transmutation", "Spirit Walker", "Alchemist"])
      && !/\brite of (?:blood|crossing|echoes)\b/i.test(text)) {
    return result({
      id: "transmutation",
      answer: "After you complete your second Rite, Transmutation is unlocked. Once per turn, before dice are rolled in a battle, you may put one card from your Hand in your Graveyard and add that card's value to your battle total. The card is not played, so none of its printed effects apply. Spirit Walker uses Transmutation the same way as any other Mystics Leader.",
      sourceIds: ["rulebook:progression", "rulebook:transmutation", "rulebook:spirit-walker"],
      subject: "Transmutation",
      topic: "use and timing"
    });
  }

  if (matches(text, /\bwhat does good faith do|good faith.*(do|work|effect)\b/i)) {
    return result({
      id: "good-faith",
      answer: "Good Faith is a cost-3 Diplomat Asset. Its Action banks it. When you offer Terms, before the opponent accepts or refuses, you may discard Good Faith to draw one card, then reveal one card from your Hand and set that revealed card aside. If the Terms are accepted, put the set-aside card in your Graveyard. If they are refused, return the set-aside card to your Hand before Gambits are set. Good Faith itself is discarded as the cost of using the Asset unless another effect changes that destination.",
      sourceIds: ["card:diplomats-good-faith", "rulebook:using-and-discarding-assets", "rulebook:offering-terms"],
      subject: "Good Faith",
      topic: "card overview"
    });
  }

  if (matches(text, /\bwhat does shock and awe do|shock and awe.*(do|work|effect)\b/i)) {
    return result({
      id: "shock-and-awe",
      answer: "Shock and Awe is a cost-5 Unique Military card. Its Action banks it. When attacking on an enemy-controlled Territory, its Battle effect lets you play an eligible Hand card face up as an additional Tactic after Tactics are revealed. If you lose, retreat one additional position. If you win, choose Breakthrough only if the opponent can retreat one additional position; after that retreat, advance one position, but this advance cannot start a battle. Or choose Consolidate to capture the contested Territory and set Command to 2. After either option, you cannot move again, capture another Territory, or use an Order from that victory. During opening effects while attacking on an enemy-controlled Territory, its banked Asset ability may put it in the Graveyard to apply the Battle effect.",
      sourceIds: ["card:military-shock-and-awe", "rulebook:conflicting-victory-benefits", "rulebook:additional-tactics"],
      subject: "Shock and Awe",
      topic: "card overview"
    });
  }

  if (matches(text, /\bwhat does it do in battle|what.*battle effect\b/i) && /Shock and Awe/i.test(subject || "")) {
    return result({
      id: "shock-and-awe-battle-follow-up",
      answer: "Shock and Awe's Battle effect applies when you are attacking on an enemy-controlled Territory. After Tactics are revealed, you may play an eligible card from your Hand face up as an additional Tactic. If you lose, retreat one additional position. If you win, choose Breakthrough or Consolidate under the card's printed restrictions.",
      sourceIds: ["card:military-shock-and-awe"],
      subject: "Shock and Awe",
      topic: "battle effect"
    });
  }

  if (matches(text, /\bwhat benefit does this give me|what benefit.*(this|it)|what does this give me\b/i)
      && /Ritual of Ascendance/i.test(subject || "")) {
    return result({
      id: "ritual-benefit-follow-up",
      answer: "The Ritual of Ascendance is an alternate victory condition: if you initiate and win the qualifying battle while all three Ritual cards remain bound, you immediately win the game. During that battle, Convergence also adds +1 to your battle total for each card bound to the Ritual—normally +3.",
      sourceIds: ["rulebook:convergence", "rulebook:completion", "rulebook:how-it-works-26"],
      subject: "Ritual of Ascendance",
      topic: "benefit"
    });
  }

  if (genericComponentQuestion(text, subject)) {
    const document = findComponentDocument(corpus, subject);
    if (document && /^(card|leader|territory|faction):/i.test(String(document.id || ""))) {
      return result({
        id: "canonical-component-text",
        answer: canonicalComponentAnswer(document),
        sourceIds: [document.id],
        subject,
        topic: "canonical component text"
      });
    }
  }

  return null;
}

export function materializeDeterministicSources(corpus, deterministic, excerptLength = 1600) {
  return canonicalSourcesForIds(corpus, deterministic?.sourceIds || [], excerptLength).map((source) => ({
    id: source.canonicalId,
    title: source.title,
    sourcePath: source.sourcePath,
    sourceUrl: source.sourceUrl,
    excerpt: source.excerpt
  }));
}
