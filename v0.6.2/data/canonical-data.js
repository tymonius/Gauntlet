export const V062_VERSION = "v0.6.2-candidate";
export const V062_TITLE = "Second Playtest Revision Candidate";

export const NEW_CARD_NAMES = Object.freeze([
  "Landslide",
  "Détente",
  "Compound Interest",
  "Extraordinary Rendition",
  "Nature's Altar",
  "Martyrdom"
]);

const PRIMARY_SOURCE = "docs/Gauntlet_v0.6.2_Faction_and_Component_Candidate.md";
const COMPATIBILITY_SOURCE = "docs/Gauntlet_v0.6.2_Faction_Component_Compatibility_Audit.md";
const SHARED_SOURCE = "docs/Gauntlet_v0.6.2_Shared_Rules_Candidate.md";
const STARTER_SOURCE = "docs/Gauntlet_v0.6.2_Starter_Decks_Candidate.json";

export async function loadV062CanonicalData(baseUrl = "../../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json") {
  const response = await fetch(baseUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load v0.6.1 canonical base: ${response.status}`);
  return buildV062CanonicalData(await response.json());
}

export function buildV062CanonicalData(baseData) {
  const data = JSON.parse(JSON.stringify(baseData));
  data.version = V062_VERSION;
  data.name = V062_TITLE;
  data.date = "2026-08-04";
  data.status = "Development candidate — not the published v0.6.1 release";
  data.inherits_from = "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json";

  data.turn = {
    sequence: ["capture", "draw", "opening", "movement", "denouement", "cleanup"],
    normal_actions: 1,
    action_phases: ["Opening", "Denouement"],
    maximum_actions_per_phase: 1,
    movement_choices: ["Advance", "Hold", "Fall Back"]
  };

  data.battlefield.capture = "During Capture, if your token is on or beyond the next opposing Territory immediately beyond your Front Line, add that Territory to your Front Line. Normal Capture advances the Front Line by at most one Territory per turn.";
  data.battlefield.front_line = "The unbroken sequence of Territories a player controls from their own end. Control cannot skip an opposing Territory, although a Player Token may move beyond its Front Line.";
  data.battlefield.last_stand = {
    defensive_edge: true,
    defender_bonus: 1,
    text: "The defender normally has Defensive Edge and separately adds +1 to their battle total."
  };

  data.battle.sequence = [
    "onset",
    "set_gambits",
    "form_reserves",
    "reveal_gambits",
    "choose_tactics",
    "reveal_tactics",
    "outcome",
    "aftermath"
  ];
  delete data.battle.defender_advantage;
  data.battle.pending_sequence = ["pending_battle", "terms", "onset", "gambits"];
  data.battle.defensive_edge = "When the defender has Defensive Edge, the defender wins tied battle totals. The defender normally has it while controlling the contested Territory or making a Last Stand, unless an effect removes it.";
  data.battle.tiebreak_roll = "Each player rolls one die. Do not apply advantage, disadvantage, card effects, numerical modifiers, or previous battle totals. Higher roll wins; reroll further ties.";
  data.battle.withdrawal = "Withdrawal ends or prevents a pending or active battle without a winner. Before Onset there is no battle or Aftermath. After Onset, complete remaining non-result Aftermath steps and clear committed cards normally.";
  data.battle.retreat = "A losing player retreats. Retreat follows a battle result and applies normal win, loss, Occupation, and result effects.";

  for (const faction of data.factions) {
    faction.card_count = 13;
    faction.source_candidate = PRIMARY_SOURCE;
  }

  data.faction_rules = {
    military: {
      resource: "Command, maximum 2",
      faction_actions: [],
      faction_abilities: ["Onward", "Rally", "Rout", "Entrench", "Repel", "Fortify"],
      fortify: "During the Aftermath of a battle you won while occupying an enemy-controlled Territory, spend 2 Command to advance your Front Line by one Territory, if able."
    },
    diplomats: {
      starting_influence: 1,
      peace_treaty_threshold: 5,
      terms_timing: "Pending battle before Onset",
      leverage_costs: { "1": 1, "2": 3, "3": 6, "4": 10 },
      accepted_reward: "Ratify an unratified Proposal and gain 1 Influence.",
      imposed_reward: "After winning following refused Terms, ratify an unratified Proposal and gain 2 Influence."
    },
    financiers: {
      starting_capital: 2,
      faction_action_phase: "Denouement",
      financial_capacity: "After Capture and before Draw, if Treasury value exceeds Territories controlled, the Financier may take one Action during both Opening and Denouement that turn, provided at least one is a Financier Faction Action."
    },
    intelligence: {
      faction_action_phase: "Denouement",
      faction_actions: ["Start a Mission", "Complete a Mission", "Abort a Mission", "Start a Special Operation", "Complete a Special Operation"],
      mission_control_type: "Faction Ability"
    },
    mystics: {
      faction_action_phase: "Denouement",
      faction_actions: ["Begin a Rite", "Begin the Ritual of Ascendance"],
      guardians_protection_values: { first_rite: 1, second_rite: 2, third_rite: 3, ritual: 4 }
    },
    inquisition: {
      purge_phases: ["Opening", "Denouement"],
      purge_once_per_turn: true,
      purge_two_phase_permission: true,
      final_judgment_type: "Faction Ability"
    }
  };

  data.proposals = proposalData();

  for (const card of data.cards) {
    delete card.complexity;
    migrateRetiredLanguage(card);
  }
  for (const territory of data.territories) {
    delete territory.complexity;
    migrateRetiredLanguage(territory);
  }

  const invasion = card(data, "Invasion");
  invasion.id = "military-invasion";
  invasion.allegiance = "Military";
  invasion.cost = 4;
  invasion.card_form = null;
  invasion.unique = false;
  invasion.unique_rule = null;
  invasion.source = PRIMARY_SOURCE;
  replaceAllEffects(invasion, [
    ["Action", "During your Movement this turn, you may advance up to two additional Positions, one at a time. This additional movement may only be used to advance and may create a pending battle."],
    ["Battle", "If you are the attacker, form your Reserve with one additional card and you may choose one additional Tactic."]
  ]);
  invasion.action_phase = "Opening";
  invasion.rules_notes = [
    "Unused additional movement is lost when a pending battle is created.",
    "Accepted Terms do not restore unused movement.",
    "Reserve and Tactic-limit increases stack unless a specific effect prohibits it."
  ];

  setEffect(card(data, "Battlefield Promotion"), "Action", "Play only during Denouement if you won a battle this turn. Return one Tactic you chose during that battle from your Discard Pile to your Hand.");
  replaceCardText(card(data, "Encampment"), "revealed Territory", "Territory");
  setEffect(card(data, "Give Chase"), "Action", "Play only during Denouement if you won a battle you initiated this turn. Advance one Position. This movement may create a pending battle. If it does, you cannot set a Gambit or use Orders during that battle. Form your Reserve with one fewer card for each earlier battle after the first that you fought this turn. This may reduce your Reserve to zero cards. Put Give Chase in your Graveyard after this movement.");
  replaceCardText(card(data, "Hold the Line"), "opening effects", "Onset");
  replaceCardText(card(data, "Hold the Line"), "capture the contested Territory", "advance their Front Line by one Territory, if able");
  const shock = card(data, "Shock and Awe");
  setEffect(shock, "Asset", "During Onset when attacking on an enemy-controlled Territory, you may put this card in your Graveyard to apply its Battle effect.");
  setEffect(shock, "Battle", "When attacking on an enemy-controlled Territory, after Tactics are revealed, you may play an eligible card from your Hand face up as an additional Tactic. If you lose, retreat one additional Position. If you win, choose one:\nBreakthrough — Choose only if the opponent can retreat one additional Position. After their normal retreat, they do so, then you advance one Position. This cannot create a pending battle.\nConsolidate — Advance your Front Line by one Territory, if able, then set your Command to 2.\nAfter either option, you cannot move again, advance your Front Line again, or use an Order from that victory. In the Aftermath, put any card played this way and this card, if still in play, in your Graveyard.");

  setEffect(card(data, "Good Faith"), "Accepted", "Put that card in your Graveyard, then gain 1 Influence.");
  const gunboat = card(data, "Gunboat Diplomacy");
  replaceAllEffects(gunboat, [
    ["Terms", "When you offer Terms, before the opponent accepts or refuses, you may reveal Gunboat Diplomacy from your Hand."],
    ["Accepted", "Put Gunboat Diplomacy in your Discard Pile."],
    ["Refused", "Set Gunboat Diplomacy face up as an additional Gambit in the resulting battle. It does not count against your Gambit limit."],
    ["Battle", "Add +2 to your battle total."]
  ]);
  gunboat.rules_notes = ["Normal role destinations apply: a refusal-set Gambit goes to the Graveyard; a normally chosen Tactic goes to the Discard Pile."];
  appendRule(card(data, "Safe Conduct"), "When used after Onset, Safe Conduct causes withdrawal rather than a loss. Complete remaining non-result Aftermath steps, clear committed cards normally, and apply Occupation if only the defender withdraws.");

  const foreclosure = card(data, "Foreclosure");
  setEffect(foreclosure, "Action", "During Denouement, choose the next opposing Territory immediately beyond your Front Line if its Deed is yours and it is unoccupied. Advance your Front Line by one Territory.");
  setEffect(foreclosure, "Battle", "During the Aftermath, if you initiated the battle on a Territory whose Deed you owned when the battle began and you won, advance your Front Line by one Territory, if able, instead of becoming the occupier.");
  setEffect(card(data, "Tariffs"), "Action", "Bank this card. Draw two cards. After this Action resolves, you may take one additional Action during this phase.");
  setEffect(card(data, "Divestment"), "Action", "Make one Deed you own unowned. Gain Capital equal to the number of Deeds you owned before doing so. After this Action resolves, you may take one additional Action during this phase.");
  setEffect(card(data, "Margin Loan"), "Action", "Choose one other card in your Hand or Treasury and place it beneath this card as collateral. Bank this card. Gain Capital equal to the collateral card's value plus 2. After this Action resolves, you may take one additional Action during this phase.");

  setEffect(card(data, "Fog of War"), "Action", "Place Fog of War as an Overlay on a Territory. Remove it after the next battle fought there. During that battle, the controller of this Territory sets their Gambit and chooses their Tactics after the opponent's corresponding choice, regardless of who initiated the battle.");
  setEffect(card(data, "Reconnaissance"), "Use", "During Onset in a battle you initiated, you may discard this card to reveal the opponent's Hand. You may then withdraw or continue the attack.");
  setEffect(card(data, "Sleeper Network"), "Use", "During Opening or Denouement, as an Action, put this card in your Graveyard and reveal its bound cards. Play each whose Action effect can apply now, one at a time and in any order, without taking additional Actions. Discard the rest.");

  for (const mystic of data.cards.filter(entry => entry.allegiance === "Mystics")) mystic.trait = "Arcane";
  setEffect(card(data, "Black Covenant"), "Tactic", "Gain advantage. Then you may play one card from your Hand with a Tactic or Battle effect face up as an additional Tactic. In the Aftermath, put this card and that card in your Graveyard.");

  setEffect(card(data, "Counterintelligence"), "Asset", "Opposing effects cannot reveal your Hand, Reserve, or face-down Gambits or Tactics. This does not prevent reveals required by the rules.");
  setEffect(card(data, "Forced March"), "Action", "During Opening, during your Movement this turn, you may move one additional Position. This additional movement cannot create a pending battle.");
  setEffect(card(data, "Advance Guard"), "Action", "During Opening, during your Movement this turn, you may move one additional Position. If that additional movement creates a pending battle, you cannot set a Gambit in that battle.");
  replaceCardText(card(data, "Entrenchment"), "their movement ends and they cannot use their Action Opportunity after movement", "their movement ends and they cannot play a card for its Action effect during Denouement");
  setEffect(card(data, "Palisade Wall"), "Use", "During Onset while you are the defender, you may discard this card. If you do, the opponent's banked Assets are inactive during that battle.");
  setEffect(card(data, "Reinforcements"), "Use", "During Opening or Denouement, you may discard this card. If you do, you may take one additional Action during that phase.");
  setEffect(card(data, "Strategic Withdrawal"), "Action", "Return one banked Asset you control to your Hand. If you do, gain one additional Position of movement this turn. If you play Strategic Withdrawal during Denouement after your normal Movement has ended, begin a new Movement sequence with up to one Position of movement.");
  setEffect(card(data, "Insurrection"), "Action", "Discard your Hand. Each player shuffles their Discard Pile into their Draw Pile. Draw three cards. After this Action resolves, you may take one additional Action during this phase.");
  setEffect(card(data, "Liberation"), "Asset", "After you win a Counterattack, draw one card. During your Denouement that turn, you may take one additional Action, even if you take another Action during that phase.");
  const assimilation = card(data, "Assimilation");
  setEffect(assimilation, "Use", "During the Aftermath of a battle you initiated and won on a Territory the opponent controls, you may put this card in your Graveyard. If you do, advance your Front Line by one Territory, if able, instead of becoming the occupier.");
  setEffect(assimilation, "Battle", "During the Aftermath, if you win as the attacker on a Territory the opponent controls, advance your Front Line by one Territory, if able, instead of becoming the occupier. Put this card in your Graveyard after the Front Line advance.");
  const siege = card(data, "Protracted Siege");
  replaceAllEffects(siege, [
    ["Action", "Bank this card."],
    ["Use", "When an opponent would add a Territory you control to their Front Line during Capture, you may place this card on that Territory as an Overlay. If you do, prevent that Front Line advance."],
    ["Battle", "During the Aftermath, if you lose while defending a Territory you control, place this card on the contested Territory as an Overlay. The next time the opponent would add this Territory to their Front Line during Capture, prevent that Front Line advance."],
    ["Overlay", "After Protracted Siege prevents one Front Line advance, or if the opposing Player Token leaves this Territory first, put Protracted Siege in its owner's Graveyard."]
  ]);
  setEffect(card(data, "Manifest Destiny"), "Battle", "During the Aftermath, if you win as the attacker and inserting Manifest Destiny between the contested Territory and the Position from which you attacked would place it immediately beyond your Front Line, insert it there. It becomes a blank Territory under your control.");

  addOrReplaceCard(data, newCard("neutral-landslide", "Landslide", "Neutral", 4, {
    card_form: "Territory Overlay",
    effects: [
      ["Action", "Place Landslide as an Overlay on any Territory that does not already have a Landslide."],
      ["Battle", "During the Aftermath, if you lose and retreat from a Territory, after retreating you may place Landslide as an Overlay on the contested Territory."],
      ["Overlay", "When a player retreats onto this Territory, they retreat one additional Position, if able. Then put Landslide in its owner's Discard Pile."]
    ],
    rules_notes: ["Maximum one Landslide may be on each Territory.", "Landslide triggers only from retreat, not Fall Back or withdrawal, and may chain across consecutive Territories."]
  }));
  addOrReplaceCard(data, newCard("diplomats-detente", "Détente", "Diplomats", 3, {
    card_form: "Asset",
    effects: [["Action", "Bank this card. You may have only one banked Détente."], ["Asset", "The first time each turn an opponent accepts one of your Proposals that was already ratified when you offered it, gain 1 Influence."]],
    rules_notes: ["Détente does not trigger when the accepted Proposal becomes ratified during those Terms."]
  }));
  addOrReplaceCard(data, newCard("financiers-compound-interest", "Compound Interest", "Financiers", 4, {
    card_form: "Asset",
    effects: [["Action", "Bank this card. You may have only one banked Compound Interest."], ["Asset", "After your normal Draw, if your Treasury contains at least one card, you may reveal the top card of your Draw Pile. Place it face up in your Treasury or put it in your Discard Pile."]]
  }));
  addOrReplaceCard(data, newCard("intelligence-extraordinary-rendition", "Extraordinary Rendition", "Intelligence", 4, {
    card_form: "Asset",
    effects: [["Action", "Bank this card. When you do, reveal the opponent's Hand, choose one card there, and bind it face up beneath Extraordinary Rendition. You may have only one banked Extraordinary Rendition."], ["Asset", "The bound card cannot be played, moved, or affected except by Extraordinary Rendition. Whenever you discard one or more Assets you control, discard Extraordinary Rendition before any others, if able. When Extraordinary Rendition leaves play, put the bound card in its owner's Discard Pile."]],
    rules_notes: ["The first-discard requirement applies to voluntary Asset discard, required Asset loss, and Asset replacement."]
  }));
  addOrReplaceCard(data, newCard("mystics-nature-s-altar", "Nature's Altar", "Mystics", 4, {
    trait: "Arcane",
    card_form: "Territory Overlay",
    effects: [["Action", "Place Nature's Altar as an Overlay on your current Territory or an adjacent Territory."], ["Battle", "During the Aftermath, if you win, you may place Nature's Altar as an Overlay on the contested Territory."], ["Overlay", "During your Opening, if your Player Token is on this Territory, you may take the Begin a Rite Faction Action. A Rite begun this way may complete during that turn if you control this Territory when its completion condition and timing are satisfied. This does not change the Rite's beginning cost, requirements, or completion condition."]]
  }));
  addOrReplaceCard(data, newCard("inquisition-martyrdom", "Martyrdom", "Inquisition", 5, {
    unique: true,
    unique_rule: "Maximum one copy per Playable Deck",
    effects: [["Aftermath", "When you lose a battle while Martyrdom is in your Hand, during the Aftermath before battle cards are cleared, you may play it without taking an Action. If you do, cards remaining in the opponent's Reserve go to their Graveyard instead of their Discard Pile during this Aftermath. After battle cards are cleared, set your Conviction to 4 and put Martyrdom in your Graveyard. Martyrdom does not prevent the loss, retreat, Occupation, or other normal consequences of the battle result."]]
  }));

  patchTerritory(data, "Quicksand", "If a player begins their Movement on Quicksand, they cannot voluntarily Fall Back or move more than one Position that turn. Forced displacement is unaffected.");
  patchTerritory(data, "Difficult Terrain", "When a player enters Difficult Terrain, their movement ends. A player who begins their turn there or enters it during their turn cannot play a card for its Action effect during Denouement that turn.");
  patchTerritory(data, "Refuge", "After a player voluntarily Falls Back onto Refuge, they draw one card.");
  patchTerritory(data, "Command Tent", "If a player begins their turn occupying and controlling Command Tent, they may take one Action during both Opening and Denouement that turn. If they do, both Actions may be used only to play cards for their Action effects.");
  patchTerritory(data, "Smuggler's Pass", "During Opening or Denouement, as an Action, while occupying and controlling Smuggler's Pass, a player may stash one card from their Hand face down beneath it. The stashed card does not count toward the Hand limit.\nWhile that player occupies and controls Smuggler's Pass, they may play the stashed card for its Action effect or set it as a Gambit as though it were in their Hand, if eligible. It counts as a card played or set from Hand.\nAt the start of the stashing player's turn, if they control Smuggler's Pass, they may return the stashed card to their Hand. If they lose control of Smuggler's Pass, put the stashed card in its owner's Discard Pile. Only one card may be stashed here.");
  for (const arena of data.territories.filter(entry => entry.arena)) {
    arena.text = arena.text.replace(/During battles on ([^,]+), Defensive Edge does not apply\. If battle totals are tied, reroll the battle dice\./, "During battles on $1, Defensive Edge does not apply. If battle totals remain tied, make a Tiebreak Roll.");
    arena.text = arena.text.replace(/During battles on ([^,]+), Defender's Advantage does not apply\. If battle totals are tied, reroll the battle dice\./, "During battles on $1, Defensive Edge does not apply. If battle totals remain tied, make a Tiebreak Roll.");
    syncTerritoryEffects(arena);
  }

  data.cards.sort((a, b) => a.name.localeCompare(b.name));
  data.card_pool_summary = summarizePools(data.cards);
  data.starter_decks = {
    version: V062_VERSION,
    source: STARTER_SOURCE,
    count: 12,
    construction: "Each approved starter contains exactly 30 cards with total deckbuilding value 60."
  };
  data.governing_sources = {
    shared_rules: SHARED_SOURCE,
    faction_components: PRIMARY_SOURCE,
    compatibility_audit: COMPATIBILITY_SOURCE,
    starter_decks: STARTER_SOURCE,
    inherited_base: "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json"
  };
  return data;
}

function proposalData() {
  return [
    proposal("De-escalation", 0, "None", "Both players withdraw. The accepting player draws one card.", "The Diplomat draws one card."),
    proposal("Orderly Withdrawal", 0, "The Diplomat must be the attacker.", "The Diplomat withdraws. The accepting player remains at the contested Position, then draws one card.", "Add +1 to the Diplomat's battle total."),
    proposal("Capitulation", 0, "The Diplomat must be the defender.", "The Diplomat withdraws. The accepting player remains at the contested Position and becomes the occupier when applicable, then draws one card.", "If the Diplomat loses, the Diplomat draws two cards."),
    proposal("Open Channels", 1, "The Diplomat must have a card in Hand.", "Both players reveal their Hands, then both players withdraw. The accepting player draws one card.", "The refusing player reveals their Hand. When the Diplomat forms their Reserve, the Diplomat draws one additional card."),
    proposal("Mutual Disarmament", 1, "Both players must have a card in Hand.", "Each player discards one card from Hand. The accepting player draws one card, then both players withdraw.", "The Diplomat may discard one card from Hand. If they do, the Diplomat draws one additional card when forming their Reserve."),
    proposal("Prisoner Exchange", 1, "Each player must have a card in their Graveyard.", "Each player may move one card from their Graveyard to their Discard Pile. Then both players withdraw.", "If the Diplomat loses, the Diplomat may move one card from their Graveyard to their Discard Pile."),
    proposal("Rebuilding Pact", 1, "The Diplomat must have a card in Hand that can be banked as an Asset.", "Each player may bank one eligible card from Hand as an Asset without taking an Action. Then both players withdraw.", "During the Aftermath, the Diplomat may bank one eligible card from Hand as an Asset without taking an Action."),
    proposal("Ultimatum", 2, "None", "The accepting player withdraws. The Diplomat remains at the contested Position and becomes the occupier when applicable.", "Add +1 to the Diplomat's battle total."),
    proposal("Diplomatic Recognition", 2, "The Diplomat must be defending a Counterattack while occupying a Territory the opposing player controlled immediately before the Diplomat became its occupier.", "The Diplomat advances their Front Line by one Territory, if able. The accepting player withdraws, then draws two cards.", "If the Diplomat wins, advance the Diplomat's Front Line by one Territory during the Aftermath, if able. The Diplomat gains no Influence for imposing this Proposal.")
  ];
}

function proposal(name, stake, requirement, accepted, refused) {
  return { id: slug(name), name, stake, requirement, accepted, refused, source: PRIMARY_SOURCE };
}

function newCard(id, name, allegiance, cost, options = {}) {
  const entry = {
    id,
    name,
    allegiance,
    cost,
    trait: options.trait ?? null,
    card_form: options.card_form ?? null,
    unique: options.unique ?? false,
    unique_rule: options.unique_rule ?? null,
    effects: (options.effects ?? []).map(([label, text]) => ({ label, text })),
    source: PRIMARY_SOURCE
  };
  for (const effect of entry.effects) entry[effectKey(effect.label)] = effect.text;
  if (options.rules_notes) entry.rules_notes = options.rules_notes;
  return entry;
}

function card(data, name) {
  const found = data.cards.find(entry => entry.name === name);
  if (!found) throw new Error(`Missing inherited card: ${name}`);
  return found;
}

function addOrReplaceCard(data, entry) {
  const index = data.cards.findIndex(cardEntry => cardEntry.name === entry.name);
  if (index >= 0) data.cards[index] = entry;
  else data.cards.push(entry);
}

function replaceAllEffects(cardEntry, effects) {
  cardEntry.effects = effects.map(([label, text]) => ({ label, text }));
  for (const key of Object.keys(cardEntry)) {
    if (["action", "asset", "battle", "use", "terms", "accepted", "refused", "gambit", "tactic", "mission", "overlay", "loan", "aftermath"].includes(key)) delete cardEntry[key];
  }
  for (const effect of cardEntry.effects) cardEntry[effectKey(effect.label)] = effect.text;
}

function setEffect(cardEntry, label, text) {
  const existing = cardEntry.effects.find(effect => effect.label === label);
  if (existing) existing.text = text;
  else cardEntry.effects.push({ label, text });
  cardEntry[effectKey(label)] = text;
  cardEntry.source_candidate = PRIMARY_SOURCE;
}

function effectKey(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function appendRule(cardEntry, text) {
  cardEntry.rules_notes = [...(cardEntry.rules_notes ?? []), text];
}

function replaceCardText(cardEntry, from, to) {
  for (const effect of cardEntry.effects ?? []) effect.text = effect.text.split(from).join(to);
  for (const key of Object.keys(cardEntry)) {
    if (typeof cardEntry[key] === "string") cardEntry[key] = cardEntry[key].split(from).join(to);
  }
  cardEntry.source_candidate = COMPATIBILITY_SOURCE;
}

function migrateRetiredLanguage(value) {
  const replacements = [
    ["during the Action Opportunity before movement", "during Opening"],
    ["during an Action Opportunity before movement", "during Opening"],
    ["the Action Opportunity before movement", "Opening"],
    ["an Action Opportunity before movement", "Opening"],
    ["during the Action Opportunity after movement", "during Denouement"],
    ["during an Action Opportunity after movement", "during Denouement"],
    ["the Action Opportunity after movement", "Denouement"],
    ["an Action Opportunity after movement", "Denouement"],
    ["Action Opportunity after movement", "Denouement"],
    ["Action Opportunity before movement", "Opening"],
    ["opening effects", "Onset"],
    ["battle opening", "Onset"],
    ["revealed Territories", "Territories"],
    ["revealed Territory", "Territory"],
    ["Defender's Advantage", "Defensive Edge"]
  ];
  walkStrings(value, text => replacements.reduce((result, [from, to]) => result.split(from).join(to), text));
}

function walkStrings(value, transform) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string") value[key] = transform(child);
    else if (child && typeof child === "object") walkStrings(child, transform);
  }
}

function patchTerritory(data, name, text) {
  const territory = data.territories.find(entry => entry.name === name);
  if (!territory) throw new Error(`Missing inherited Territory: ${name}`);
  territory.text = text;
  territory.source_candidate = PRIMARY_SOURCE;
  syncTerritoryEffects(territory);
}

function syncTerritoryEffects(territory) {
  territory.effects = [{ label: "Text", text: territory.text }];
}

function summarizePools(cards) {
  const summary = {};
  for (const cardEntry of cards) {
    const pool = summary[cardEntry.allegiance] ??= { count: 0, total_value: 0, unique: [], cost_curve: {} };
    pool.count += 1;
    pool.total_value += cardEntry.cost;
    if (cardEntry.unique) pool.unique.push(cardEntry.name);
    pool.cost_curve[String(cardEntry.cost)] = (pool.cost_curve[String(cardEntry.cost)] ?? 0) + 1;
  }
  for (const pool of Object.values(summary)) pool.unique.sort((a, b) => a.localeCompare(b));
  return summary;
}

function slug(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
