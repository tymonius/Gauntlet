const MAX_PRIMARY_LENGTH = 280;

const SUBJECT_PRESENTATIONS = [
  {
    subject: /^Setup$/i,
    answer: "Each player draws three cards to form their opening Hand.",
    details: "This occurs during setup after Player Tokens are placed and before determining the first player."
  },
  {
    subject: /^Battle card destinations$/i,
    answer: "During the Aftermath, Gambits go to their owners’ Graveyards; Tactics and unused Reserve cards go to their owners’ Discard Piles.",
    details: "Follow a card if it explicitly sends itself somewhere else."
  },
  {
    subject: /^Territory capture$/i,
    answer: "An occupied Territory is captured at the start of the occupier’s next turn, provided they are still occupying it.",
    details: "Winning the attack creates Occupation rather than immediate control. The current controller normally gets a turn to Counterattack before the Capture step. A specific effect may cause an earlier capture."
  },
  {
    subject: /^Defender's Advantage$/i,
    answer: "If battle totals are tied and the defender controls the contested Territory, the defender wins. Defender’s Advantage does not grant another die.",
    details: "It also applies in a Last Stand battle. The separate Last Stand +1 bonus still applies."
  },
  {
    subject: /^Action Opportunities$/i,
    answer: "A normal turn has two Action Opportunities: one before movement and one after movement. You normally have only 1 Action to spend between them.",
    details: "You may spend at most 1 Action during either opportunity."
  },
  {
    subject: /^Onward$/i,
    answer: "No. Onward must be used during your Movement step before a battle begins.",
    details: "If that movement starts a battle, the movement sequence ends. Moving afterward requires a separate effect that explicitly permits it, such as Rout when its conditions are met."
  },
  {
    subject: /^Specific-over-general rule$/i,
    answer: "Follow the card’s specific instruction where it conflicts with the normal battle sequence.",
    details: "Apply it only at its stated timing and in the order written. Do not reopen an earlier timing window or create a new response opportunity unless a rule explicitly says so."
  },
  {
    subject: /^Battle sequence$/i,
    answer: "“Battle Hand” is not a current v0.6.1 term. Specify whether you mean the Gambit stage or the Tactic stage.",
    details: "After both Gambits are set, players set Hands aside, form Reserves, and reveal Gambits. After both Tactics are chosen, reveal Tactics. Ordinary advantage matters later when dice are rolled."
  },
  {
    subject: /^Action card resolution$/i,
    answer: "After resolving a card’s Action effect, put it in your Discard Pile unless it becomes an Asset or Overlay, or its text sends it elsewhere.",
    details: "Battle cards use different Aftermath destinations: Gambits normally go to the Graveyard, while Tactics and unused Reserve cards go to the Discard Pile."
  },
  {
    subject: /^Peace Treaty$/i,
    answer: "You do not win immediately. At the start of your next turn, after Capture and before Draw, you win if six different Proposals are ratified.",
    details: "The five ratified Proposals must still be present at that victory check."
  },
  {
    subject: /^Transmutation$/i,
    answer: "Once per turn before dice are rolled in a battle, put one card from Hand in your Graveyard and add its value to your battle total.",
    details: "Transmutation unlocks after your second completed Rite. The card is not played, so none of its printed effects apply. Spirit Walker uses it normally."
  },
  {
    subject: /^Good Faith$/i,
    answer: "Bank Good Faith as an Asset. When offering Terms, you may discard it to draw a card and temporarily set aside one revealed card from your Hand.",
    details: "If the Terms are accepted, the set-aside card goes to your Graveyard. If refused, return it to your Hand before Gambits are set. Good Faith itself is discarded as the cost of using the Asset unless another effect changes that destination."
  },
  {
    subject: /^Shock and Awe$/i,
    topic: /^battle effect$/i,
    answer: "While attacking on an enemy-controlled Territory, Shock and Awe can add an eligible Hand card face up as an additional Tactic after Tactics are revealed.",
    details: "If you lose, retreat one additional position. If you win, choose Breakthrough or Consolidate under the card’s printed restrictions."
  },
  {
    subject: /^Shock and Awe$/i,
    answer: "Shock and Awe can be banked as an Asset, and its Battle effect gives an attacker on an enemy-controlled Territory an additional face-up Tactic plus a powerful victory choice.",
    details: "On a loss, retreat one additional position. On a win, choose legal Breakthrough or Consolidate. Breakthrough requires an additional retreat to be possible and its advance cannot start another battle. Consolidate captures the Territory and sets Command to 2. Either choice prevents further movement, another capture, or an Order from that victory."
  },
  {
    subject: /^Ritual of Ascendance$/i,
    answer: "If you initiate and win the qualifying battle while all three Ritual cards remain bound, you immediately win the game.",
    details: "Convergence also adds +1 to your battle total for each card bound to the Ritual, normally +3."
  },
  {
    subject: /^Choice legality$/i,
    answer: "Provisional Arbiter Ruling: With no card in Hand, the discard option is unavailable, so the opponent must choose the +1 option. Use this ruling for the rest of this game.",
    details: "The current rules say to complete as much as possible unless the missing part is a required cost, requirement, or target, but they do not expressly resolve this exact either-or choice. The ruling has been logged for designer review."
  }
];

export function presentRulesAnswer(message = {}) {
  const raw = clean(message.answer);
  if (!raw) return { answer: "", details: "" };
  if (message.rulingStatus === "welcome") return { answer: raw, details: "" };

  const subject = clean(message.subject);
  const topic = clean(message.topic);
  const fixed = SUBJECT_PRESENTATIONS.find((item) =>
    item.subject.test(subject) && (!item.topic || item.topic.test(topic))
  );
  if (fixed) return { answer: fixed.answer, details: fixed.details || "" };

  if (/^Surveillance$/i.test(subject)) return presentSurveillance(raw, topic);
  if (/^Interference$/i.test(subject)) return presentInterference(raw, topic);

  return splitLongAnswer(raw, message.rulingStatus);
}

function presentSurveillance(raw, topic) {
  if (/overview/i.test(topic)) {
    return {
      answer: "Surveillance gives Intelligence one chance per battle to reveal an opposing face-down Gambit and a separate chance to reveal opposing face-down Tactics, at 1 Intel per card.",
      details: "Immediately after a Surveillance reveal, you may spend 2 additional Intel per card to Interfere. Removed Gambits return to Hand; removed Tactics return to Reserve. The opponent may replace from the same source or pass, and the replacement creates no new Surveillance or Interference opportunity. Direct Interference handles cards placed face up."
    };
  }
  if (/face-up/i.test(topic)) {
    return {
      answer: "A card set or chosen face up at the normal response timing may be targeted by Direct Interference for 2 Intel; no Surveillance cost is paid.",
      details: "This uses that stage’s Interference opportunity. A card that becomes face up after the response window closes does not create a new opportunity. If Surveillance first revealed the card, the total is 1 Intel to reveal plus 2 to Interfere."
    };
  }
  if (/face-down/i.test(topic)) {
    return {
      answer: "Yes. After Surveillance reveals the face-down card, spend 2 additional Intel to Interfere with it—3 Intel total for one card.",
      details: "The card returns to its source. Its owner may replace it from that source or pass; the replacement creates no new Surveillance or Interference opportunity."
    };
  }
  return splitLongAnswer(raw);
}

function presentInterference(raw, topic) {
  if (/cost|face-up/i.test(topic)) {
    return {
      answer: "Direct Interference against a card set or chosen face up costs 2 Intel. Revealing a face-down card with Surveillance and then interfering costs 3 Intel total.",
      details: "Direct Interference does not use Surveillance, but it does use the relevant stage’s Interference opportunity. The response must still occur within the normal window."
    };
  }
  return splitLongAnswer(raw);
}

function splitLongAnswer(raw, rulingStatus = "") {
  const sentences = splitSentences(raw);
  if (sentences.length <= 2 && raw.length <= MAX_PRIMARY_LENGTH) {
    return { answer: raw, details: "" };
  }

  const primary = [];
  let length = 0;
  for (const sentence of sentences) {
    if (primary.length >= 2) break;
    if (primary.length && length + sentence.length + 1 > MAX_PRIMARY_LENGTH) break;
    primary.push(sentence);
    length += sentence.length + 1;
  }
  if (!primary.length) primary.push(raw.slice(0, MAX_PRIMARY_LENGTH).trimEnd());

  if (rulingStatus === "provisional") {
    const scope = sentences.find((sentence) => /rest of (this|the) (game|play session)/i.test(sentence));
    if (scope && !primary.includes(scope)) primary.push(scope);
  }

  const remaining = sentences.filter((sentence) => !primary.includes(sentence)).join(" ");
  return { answer: primary.join(" "), details: remaining };
}

function splitSentences(raw) {
  const placeholder = "\uE000";
  const protectedNumericPeriods = raw.replace(/(\d)\.(?=\d)/g, `$1${placeholder}`);
  const sentences = protectedNumericPeriods.match(/[^.!?]+[.!?]+(?:[”'\"])?|[^.!?]+$/g) || [protectedNumericPeriods];
  return sentences
    .map((sentence) => clean(sentence.replaceAll(placeholder, ".")))
    .filter(Boolean);
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

if (typeof document !== "undefined" && !document.querySelector("link[data-gauntlet-rules-answer-styles]")) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("./answer-presentation.css?v=20260803-1", import.meta.url).href;
  link.dataset.gauntletRulesAnswerStyles = "";
  document.head.append(link);
}
