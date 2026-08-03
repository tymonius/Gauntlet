import { normalizeForSearch } from "./rules-intelligence.js";

const PACKET_DEFINITIONS = [
  {
    id: "surveillance",
    subject: "Surveillance",
    aliases: ["surveillance", "interference", "direct interference"],
    sourceIds: [
      "rulebook:gambit-surveillance",
      "rulebook:tactic-surveillance",
      "rulebook:interference-after-surveillance",
      "rulebook:direct-interference",
      "rulebook:intelligence-mirrors"
    ],
    scopeNotes: [
      "Intelligence mirrors is a specialized subsection and applies only when both players are Intelligence.",
      "Revision is permitted after the opponent makes a replacement, not merely after the opponent passes.",
      "A face-up card may be targeted by Direct Interference only at the normal response timing."
    ],
    requiredClaims: [
      "Gambit Surveillance and Tactic Surveillance are separate once-per-battle opportunities.",
      "Surveillance costs 1 Intel per face-down card revealed; Interference costs 2 additional Intel per removed card.",
      "Direct Interference costs 2 Intel and does not require Surveillance."
    ],
    forbiddenClaims: [
      "Do not present the Intelligence-mirror sequence as the universal battle sequence.",
      "Do not say a pass permits the Intelligence player to revise a prior choice.",
      "Do not say a face-up commitment costs more than 2 Intel to Interfere with directly."
    ]
  },
  {
    id: "transmutation",
    subject: "Transmutation",
    aliases: ["transmutation"],
    sourceIds: [
      "rulebook:progression",
      "rulebook:transmutation",
      "rulebook:spirit-walker",
      "rulebook:alchemist"
    ],
    scopeNotes: ["Transmutation is a shared Mystics ability, not an Alchemist-only ability."],
    requiredClaims: [
      "Transmutation unlocks after the second Rite is completed.",
      "It may be used once per turn before dice are rolled in a battle involving the Mystic.",
      "The card placed in the Graveyard is not played and its printed effects do not apply."
    ],
    forbiddenClaims: ["Do not require the Alchemist Leader to use Transmutation."]
  },
  {
    id: "peace-treaty",
    subject: "Peace Treaty",
    aliases: ["peace treaty", "fifth proposal", "five proposals", "5 proposals"],
    sourceIds: [
      "rulebook:treaty-articles-and-peace-treaty",
      "rulebook:accepted-terms",
      "rulebook:refused-terms"
    ],
    scopeNotes: ["Ratifying the fifth Proposal does not itself trigger immediate victory."],
    requiredClaims: ["Peace Treaty victory is checked after Capture and before Draw at the start of the Diplomat's turn."],
    forbiddenClaims: ["Do not say the Diplomat wins immediately upon ratifying the fifth Proposal."]
  },
  {
    id: "onward",
    subject: "Onward",
    aliases: ["onward"],
    sourceIds: ["rulebook:orders", "rulebook:movement", "rulebook:movement-after-battle"],
    scopeNotes: ["Onward occurs before a battle; Rout is the General Order that may move after a won battle."],
    requiredClaims: ["A battle ends the movement sequence that started it."],
    forbiddenClaims: ["Do not let unused Onward movement continue after a battle."]
  },
  {
    id: "shock-and-awe",
    subject: "Shock and Awe",
    aliases: ["shock and awe"],
    sourceIds: ["card:military-shock-and-awe", "rulebook:conflicting-victory-benefits", "rulebook:additional-tactics"],
    scopeNotes: [
      "Breakthrough may be chosen only if the opponent can retreat one additional position.",
      "The Breakthrough advance cannot start a battle.",
      "After either victory option, the listed movement, capture, and Order prohibitions remain binding."
    ],
    requiredClaims: ["Preserve every condition and restriction printed under Breakthrough and Consolidate."],
    forbiddenClaims: ["Do not omit the Breakthrough eligibility condition or allow its advance to start a battle."]
  },
  {
    id: "good-faith",
    subject: "Good Faith",
    aliases: ["good faith"],
    sourceIds: ["card:diplomats-good-faith", "rulebook:using-and-discarding-assets", "rulebook:offering-terms"],
    scopeNotes: ["In Accepted and Refused, 'that card' means the card revealed and set aside by Good Faith's Use effect."],
    requiredClaims: ["Good Faith itself is discarded as the cost of using its banked Asset ability."],
    forbiddenClaims: ["Do not interpret 'that card' in Accepted or Refused as Good Faith itself."]
  },
  {
    id: "ritual-of-ascendance",
    subject: "Ritual of Ascendance",
    aliases: ["ritual of ascendance", "the ritual"],
    sourceIds: [
      "rulebook:beginning-the-ritual",
      "rulebook:convergence",
      "rulebook:completion",
      "rulebook:interruption",
      "rulebook:how-it-works-26"
    ],
    scopeNotes: ["The Mystic must initiate the final battle."],
    requiredClaims: [
      "Convergence gives +1 per card bound to the Ritual during a battle the Mystic initiated.",
      "Winning the qualifying battle immediately wins the game."
    ],
    forbiddenClaims: ["Do not treat withdrawal as a Ritual win or interruption."]
  },
  {
    id: "territory-capture",
    subject: "Territory capture",
    aliases: ["occupied territory", "occupation", "capture a territory", "territory captured"],
    sourceIds: ["rulebook:occupation", "rulebook:capture", "rulebook:capture-2", "rulebook:counterattack"],
    scopeNotes: ["Winning an attack normally creates Occupation, not immediate capture."],
    requiredClaims: ["An occupier captures at the start of their next turn during Capture if still occupying."],
    forbiddenClaims: ["Do not say an ordinary attack victory immediately captures the Territory."]
  },
  {
    id: "battle-sequence",
    subject: "Battle sequence",
    aliases: ["battle sequence", "battle hand", "battle hands"],
    sourceIds: [
      "rulebook:complete-rules-6",
      "rulebook:2-set-gambits",
      "rulebook:3-form-reserves",
      "rulebook:4-reveal-gambits",
      "rulebook:5-choose-tactics",
      "rulebook:6-reveal-tactics",
      "rulebook:advantage-and-disadvantage"
    ],
    scopeNotes: ["Battle Hand is obsolete terminology in v0.6.1; distinguish Gambits from Tactics."],
    requiredClaims: ["Ordinary advantage affects the later die roll, not commitment order."],
    forbiddenClaims: ["Do not invent a single current step named Battle Hand commitment."]
  },
  {
    id: "action-resolution",
    subject: "Action card resolution",
    aliases: ["action card", "card go to the discard", "card goes to the discard"],
    sourceIds: ["rulebook:action-effects", "rulebook:printed-card-effects", "rulebook:clearing-battle-cards"],
    scopeNotes: ["Action-card destinations and battle-card destinations are different procedures."],
    requiredClaims: ["An Action card normally goes to the Discard Pile after its effect unless it becomes an Asset or Overlay or says otherwise."],
    forbiddenClaims: ["Do not apply Gambit or Tactic Aftermath destinations to a card played for its Action effect."]
  }
];

PACKET_DEFINITIONS.push(
  {
    id: "withdrawal",
    subject: "Withdrawal",
    aliases: ["withdrawal", "withdrew from a battle", "withdraw from a battle", "valor"],
    sourceIds: [
      "rulebook:effect-caused-withdrawal-from-battle",
      "rulebook:retreat",
      "card:neutral-valor"
    ],
    scopeNotes: ["Withdrawal from a battle ends it without a winner or loser; it is not a battle loss or retreat."],
    requiredClaims: ["Win, loss, and retreat triggers do not occur after withdrawal from a battle."],
    forbiddenClaims: ["Do not say ordinary withdrawal from a battle triggers Valor or any other loss trigger."]
  },
  {
    id: "commandant-repel",
    subject: "Commandant",
    aliases: ["commandant", "repel"],
    sourceIds: ["rulebook:complete-rules-13", "rulebook:commandant", "rulebook:orders-2"],
    scopeNotes: ["The first battle victory each turn grants Command even during the opponent's turn."],
    requiredClaims: ["Command gained from that victory is available for Repel during the same Aftermath."],
    forbiddenClaims: ["Do not limit Command gain to the Military player's own turn."]
  },
  {
    id: "active-mission",
    subject: "Active Mission",
    aliases: ["active mission", "started the mission", "began the mission"],
    sourceIds: ["rulebook:starting-a-mission", "rulebook:completing-a-mission"],
    scopeNotes: ["An Active Mission cannot complete during the turn it begins."],
    requiredClaims: ["A satisfied Mission must wait until a later turn before it can be completed."],
    forbiddenClaims: ["Do not permit same-turn Mission completion."]
  },
  {
    id: "political-capital",
    subject: "Political Capital",
    aliases: ["political capital"],
    sourceIds: ["rulebook:senator", "card:diplomats-safe-conduct", "rulebook:refused-terms", "rulebook:influence"],
    scopeNotes: ["Safe Conduct replaces the refused-Terms loss with withdrawal and returns the Stake."],
    requiredClaims: ["Political Capital does not trigger because no staked Influence would be lost after losing a battle."],
    forbiddenClaims: ["Do not condition the answer on missing Political Capital text when the Senator source is supplied."]
  },
  {
    id: "fieldcraft",
    subject: "Fieldcraft",
    aliases: ["fieldcraft"],
    sourceIds: ["rulebook:ranger", "rulebook:control"],
    scopeNotes: ["Fieldcraft ignores printed Territory effects only."],
    requiredClaims: ["Fieldcraft does not alter Territory control, Occupation, or capture."],
    forbiddenClaims: ["Do not let Fieldcraft ignore an effect that changes control merely because a Territory is involved."]
  },
  {
    id: "fortifications",
    subject: "Fortifications",
    aliases: ["fortifications"],
    sourceIds: ["card:neutral-fortifications", "rulebook:5-choose-tactics"],
    scopeNotes: ["Fortifications changes the number of Tactics chosen, not the timing of choosing them."],
    requiredClaims: ["Choose both Tactics during the same Choose Tactics stage before seeing the opponent's revealed choice."],
    forbiddenClaims: ["Do not allow the second Tactic to be chosen after seeing the opponent's choice."]
  },
  {
    id: "rousing-speech",
    subject: "Rousing Speech",
    aliases: ["rousing speech"],
    sourceIds: ["card:neutral-rousing-speech", "rulebook:assets"],
    scopeNotes: ["Turning an existing banked Asset face up is not banking it again."],
    requiredClaims: ["Rousing Speech does not trigger from merely turning a face-down Asset face up."],
    forbiddenClaims: ["Do not treat a reveal or face-up change as a new banking event."]
  },
  {
    id: "battle-roles",
    subject: "Battle roles",
    aliases: ["attacker and defender remain", "roles remain fixed", "stop being the attacker"],
    sourceIds: ["rulebook:complete-rules-7", "rulebook:normal-result"],
    scopeNotes: ["Attacker and defender remain fixed through the Aftermath."],
    requiredClaims: ["A retreat or victory does not switch or end those roles before the Aftermath finishes."],
    forbiddenClaims: ["Do not say the winner stops being the attacker after the defender retreats."]
  },
  {
    id: "resourcefulness",
    subject: "Resourcefulness",
    aliases: ["resourcefulness"],
    sourceIds: ["card:neutral-resourcefulness", "rulebook:printed-card-effects"],
    scopeNotes: [
      "Resourcefulness checks whether the cost-1 card itself was played, set, or chosen and then resolved its printed effect.",
      "Copying an effect does not play, set, or choose the source card again."
    ],
    requiredClaims: [
      "A copied effect does not trigger Resourcefulness unless the cost-1 card itself was played, set, or chosen for that resolution."
    ],
    forbiddenClaims: [
      "Do not treat copying a cost-1 card's effect as playing, setting, or choosing that card."
    ]
  }
);

const FOLLOW_UP_PATTERN = /\b(it|its|this|that|these|those|they|them|benefit|in battle|right now|already face up|change the cost|do so)\b/i;

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function stripPrefix(value) {
  return String(value || "").replace(/^[^:]{1,40}:\s*/, "").trim();
}

function documentKey(document) {
  return `${document?.sourcePath || ""}\u0000${document?.title || ""}\u0000${document?.body || ""}`;
}

function findPacketDefinition(text) {
  const normalized = normalizeForSearch(text);
  if (!normalized) return null;
  return PACKET_DEFINITIONS.find((packet) => packet.aliases.some((alias) =>
    normalized.includes(normalizeForSearch(alias))
  )) || null;
}

function inferGoverningSourceIds(document) {
  const text = `${document?.title || ""}\n${document?.body || ""}`;
  const ids = [];
  if (/\bAction:/i.test(text)) ids.push("rulebook:action-effects");
  if (/\b(Gambit|Tactic|Battle):/i.test(text)) {
    ids.push("rulebook:printed-card-effects", "rulebook:complete-rules-6", "rulebook:clearing-battle-cards");
  }
  if (/\b(Card Form:\s*Asset|Asset:|Use:|Bank this card)\b/i.test(text)) {
    ids.push("rulebook:assets", "rulebook:using-and-discarding-assets");
  }
  if (/\bOverlay\b/i.test(text)) ids.push("rulebook:complete-rules-13");
  if (/\bbind|bound\b/i.test(text)) ids.push("rulebook:bound-cards", "rulebook:bound-cards-2");
  if (/\bProposal|Terms|Accepted:|Refused:/i.test(text)) {
    ids.push("rulebook:offering-terms", "rulebook:accepted-terms", "rulebook:refused-terms");
  }
  if (/\bRite|Ritual/i.test(text)) ids.push("rulebook:progression", "rulebook:beginning-a-rite");
  if (/\bMission|Special Operation/i.test(text)) {
    ids.push("rulebook:starting-a-mission", "rulebook:completing-a-mission", "rulebook:starting-a-special-operation");
  }
  return unique(ids);
}

function subjectFromHistory(history) {
  for (const item of [...(history || [])].reverse()) {
    const subject = String(item?.subject || item?.activeSubject || "").trim();
    if (subject) {
      return {
        subject,
        topic: String(item?.topic || item?.activeTopic || "").trim() || null,
        documentId: item?.subjectDocumentId || null
      };
    }
  }
  return null;
}

function exactEntityFromPlan(plan) {
  const entities = Array.isArray(plan?.entities) ? plan.entities : [];
  const exact = entities.find((entity) => entity?.documentId) || entities[0];
  if (!exact?.name) return null;
  return {
    subject: String(exact.name),
    topic: null,
    documentId: exact.documentId || null
  };
}

function deriveTopic(question, priorTopic = null) {
  const text = String(question || "");
  if (/face[- ]?up|already face up/i.test(text)) return "face-up commitment";
  if (/cost|how much/i.test(text)) return priorTopic || "cost";
  if (/in battle|battle effect/i.test(text)) return "battle effect";
  if (/benefit|what does it give/i.test(text)) return "benefit";
  if (/right now|can i use/i.test(text)) return "timing eligibility";
  return priorTopic || null;
}

export function resolveActiveContext(corpus, question, history = [], plan = null) {
  const currentPacket = findPacketDefinition(question);
  const historyContext = subjectFromHistory(history);
  const followUp = FOLLOW_UP_PATTERN.test(String(question || ""));
  let current = currentPacket
    ? { subject: currentPacket.subject, topic: null, documentId: currentPacket.sourceIds[0] || null }
    : exactEntityFromPlan(plan);

  if (followUp && historyContext) {
    if (!current || currentPacket?.id === "surveillance") {
      current = {
        subject: current?.subject || historyContext.subject,
        topic: historyContext.topic,
        documentId: current?.documentId || historyContext.documentId
      };
    } else if (!current.topic) {
      current.topic = historyContext.topic;
    }
  }

  if (!current && historyContext && followUp) current = historyContext;
  if (!current) return { subject: null, topic: null, documentId: null };
  return {
    ...current,
    topic: deriveTopic(question, current.topic)
  };
}

export function buildRulePacket(corpus, { question, history = [], plan = null } = {}) {
  const context = resolveActiveContext(corpus, question, history, plan);
  const definition = findPacketDefinition(context.subject || question);
  if (definition) {
    return {
      id: definition.id,
      subject: definition.subject,
      topic: context.topic,
      sourceIds: unique(definition.sourceIds),
      scopeNotes: [...definition.scopeNotes],
      requiredClaims: [...definition.requiredClaims],
      forbiddenClaims: [...definition.forbiddenClaims]
    };
  }

  const documents = Array.isArray(corpus?.documents) ? corpus.documents : [];
  const entity = (plan?.entities || []).find((item) => item?.documentId);
  const document = entity?.documentId
    ? documents.find((item) => item.id === entity.documentId)
    : null;
  if (!document) {
    return {
      id: null,
      subject: context.subject,
      topic: context.topic,
      sourceIds: [],
      scopeNotes: [],
      requiredClaims: [],
      forbiddenClaims: []
    };
  }

  return {
    id: `entity:${normalizeForSearch(entity.name)}`,
    subject: entity.name,
    topic: context.topic,
    sourceIds: unique([document.id, ...inferGoverningSourceIds(document)]),
    scopeNotes: ["Use the exact component text before any general rule."],
    requiredClaims: [],
    forbiddenClaims: ["Do not add an exception, timing window, or destination not stated by the component or governing rules."]
  };
}

export function canonicalSourcesForIds(corpus, sourceIds, excerptLength = 1400) {
  const documents = Array.isArray(corpus?.documents) ? corpus.documents : [];
  const byId = new Map(documents.map((document) => [document.id, document]));
  return unique(sourceIds).map((id) => byId.get(id)).filter(Boolean).map((document) => {
    const body = String(document.body || "").trim();
    const excerpt = body.length > excerptLength
      ? `${body.slice(0, excerptLength - 1).trimEnd()}…`
      : body;
    return {
      id: document.id,
      canonicalId: document.id,
      title: document.title,
      heading: document.heading,
      kind: document.kind,
      sourcePath: document.sourcePath,
      sourceUrl: document.sourceUrl,
      body,
      excerpt,
      retrievalReason: "rule-packet",
      retrievalScore: 1000
    };
  });
}

export function prioritizeRulePacketSources(retrieval, corpus, packet, options = {}) {
  const limit = Math.max(6, Math.min(Number(options.limit) || 10, 14));
  const excerptLength = Math.max(500, Math.min(Number(options.excerptLength) || 1200, 1800));
  const packetSources = canonicalSourcesForIds(corpus, packet?.sourceIds || [], excerptLength);
  const merged = new Map();
  for (const source of [...packetSources, ...(retrieval?.sources || [])]) {
    const key = source.canonicalId || documentKey(source);
    if (!merged.has(key)) merged.set(key, source);
  }
  const sources = [...merged.values()].slice(0, limit).map((source, index) => ({
    ...source,
    id: source.canonicalId || source.id || `S${index + 1}`
  }));
  return {
    ...retrieval,
    sources,
    packetSourceIds: packetSources.map((source) => source.canonicalId)
  };
}

export function findComponentDocument(corpus, subject) {
  const normalizedSubject = normalizeForSearch(subject);
  if (!normalizedSubject) return null;
  const documents = Array.isArray(corpus?.documents) ? corpus.documents : [];
  return documents.find((document) => {
    const heading = normalizeForSearch(stripPrefix(document.heading || document.title));
    return heading === normalizedSubject;
  }) || null;
}
