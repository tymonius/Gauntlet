import fs from 'node:fs';

const path = process.env.V063_CANONICAL_DATA ?? 'artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const coreRoleHeadings = ['Action', 'Asset', 'Gambit', 'Tactic', 'Gambit/Tactic'];
const standardCardHeadings = [...coreRoleHeadings, 'Mission', 'Overlay', 'Terms', 'Sanctions', 'Reaction'];

standardizeCardHeadings();
standardizeSharedRules();
for (const card of data.cards) syncLegacyEffectFields(card);

const presentHeadings = [...new Set(data.cards.flatMap((card) => card.effects.map((effect) => effect.label)))];
const unsupported = presentHeadings.filter((label) => !standardCardHeadings.includes(label));
if (unsupported.length) {
  throw new Error(`Unsupported standard-card effect headings remain: ${unsupported.join(', ')}`);
}

const specialOrProceduralHeadings = presentHeadings.filter((label) => !coreRoleHeadings.includes(label));
data.card_rules.effect_headings = {
  ...data.card_rules.effect_headings,
  supported: standardCardHeadings,
  ordinary_role_headings: coreRoleHeadings,
  special_or_procedural_headings: specialOrProceduralHeadings,
  all_present_headings: presentHeadings,
  standard_card_headings: standardCardHeadings,
};

data.normalization = {
  ...(data.normalization ?? {}),
  heading_standardization: {
    standard_card_headings: standardCardHeadings,
    removed_standard_card_headings: ['Text', 'Placement', 'Aftermath', 'Accepted', 'Refused'],
    proposal_outcome_headings_unchanged: true,
  },
};

fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`Finalized canonical effect headings in ${path}: ${presentHeadings.join(', ')}.`);

function standardizeCardHeadings() {
  replacePlacementWithAction('neutral-bombardment', 'Place this Overlay on the first enemy-controlled Territory ahead of you without an Overlay.');
  replacePlacementWithAction('intelligence-fog-of-war', 'Place this Overlay on any Territory.');

  replaceEffects('diplomats-sanctions-blockade', [
    ['Sanctions', "Instead of playing this immediately, in the Aftermath following that refusal, you may place this Overlay on a Territory that opponent controls."],
    ['Overlay', "The first time each turn that opponent enters or leaves this Territory, they choose one: discard one card; or +1 Influence. Put this card in its owner's Discard Pile if that opponent loses control of this Territory."],
  ]);

  replaceEffects('diplomats-sanctions-censure', [
    ['Sanctions', 'Bank this card.'],
    ['Asset', 'The first time each turn that opponent plays a card for its Action effect, they choose one: discard one card; or +1 Card.'],
  ]);

  replaceEffects('diplomats-sanctions-embargo', [
    ['Sanctions', 'Bank this card.'],
    ['Asset', "That opponent's Asset limit is reduced by 1, to a minimum of 0."],
  ]);

  relabel('inquisition-martyrdom', 'Aftermath', 'Reaction');
  relabel('diplomats-demilitarized-zone', 'Terms', 'Reaction');

  mergeOutcomeBranches('diplomats-diplomatic-latitude', 'Terms');
  mergeOutcomeBranches('diplomats-good-faith', 'Asset');
  mergeOutcomeBranches('diplomats-gunboat-diplomacy', 'Terms');
  mergeOutcomeBranches('diplomats-nonbinding-resolution', 'Terms');
  mergeOutcomeBranches('diplomats-trade-concessions', 'Terms');
}

function standardizeSharedRules() {
  data.card_rules.reaction = {
    play_from_hand_at_printed_trigger: true,
    action_required_by_default: false,
    timing: 'Resolve a Reaction at the timing printed on the card.',
  };
  data.card_rules.terms_effect = {
    use_window: 'Use a Terms effect at its printed point while offering Terms.',
    action_required_by_default: false,
  };
  data.card_rules.sanctions = {
    ...(data.card_rules.sanctions ?? {}),
    definition: 'A card whose title begins Sanctions: is a Sanction.',
    play_trigger: 'Immediately after an opponent refuses your Terms.',
    play_from_hand: true,
    action_required_by_default: false,
    cost_by_default: 'none',
    card_text_may_override_timing_or_procedure: true,
    retains_refusing_opponent: true,
    default_expiration: "After that opponent later accepts the owner's Terms, put the Sanction in its owner's Discard Pile.",
  };
}

function cardById(id) {
  const card = data.cards.find((entry) => entry.id === id);
  if (!card) throw new Error(`Card not found: ${id}`);
  return card;
}

function replacePlacementWithAction(id, text) {
  const card = cardById(id);
  const placement = card.effects.find((effect) => effect.label === 'Placement');
  if (!placement) {
    const action = card.effects.find((effect) => effect.label === 'Action');
    if (!action || action.text !== text) throw new Error(`Expected Placement or standardized Action effect on ${id}`);
    return;
  }
  placement.label = 'Action';
  placement.text = text;
}

function replaceEffects(id, entries) {
  cardById(id).effects = entries.map(([label, text]) => ({ label, text }));
}

function relabel(id, from, to) {
  const card = cardById(id);
  if (card.effects.some((entry) => entry.label === to)) return;
  const effect = card.effects.find((entry) => entry.label === from);
  if (!effect) throw new Error(`Effect ${from} not found on ${id}`);
  effect.label = to;
}

function mergeOutcomeBranches(id, hostLabel) {
  const card = cardById(id);
  const host = card.effects.find((effect) => effect.label === hostLabel);
  if (!host) throw new Error(`Effect ${hostLabel} not found on ${id}`);
  const accepted = card.effects.find((effect) => effect.label === 'Accepted');
  const refused = card.effects.find((effect) => effect.label === 'Refused');
  if (!accepted && !refused && host.text.includes('Accepted —') && host.text.includes('Refused —')) return;
  if (!accepted || !refused) throw new Error(`Expected Accepted/Refused effects on ${id}`);
  host.text = `${host.text}\n\nAccepted — ${accepted.text}\n\nRefused — ${refused.text}`;
  card.effects = card.effects.filter((effect) => effect !== accepted && effect !== refused);
}

function syncLegacyEffectFields(card) {
  const legacyKeys = ['action', 'asset', 'gambit', 'tactic', 'gambit_tactic', 'mission', 'overlay', 'terms', 'sanctions', 'reaction', 'placement', 'aftermath', 'accepted', 'refused', 'text'];
  for (const key of legacyKeys) {
    if (Object.hasOwn(card, key)) delete card[key];
  }
  for (const effect of card.effects ?? []) {
    const key = effect.label === 'Gambit/Tactic'
      ? 'gambit_tactic'
      : effect.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (legacyKeys.includes(key)) card[key] = effect.text;
  }
}
