const REPLACEMENTS = Object.freeze([
  [
    'State these effects in terms of the procedure the player may perform. Do not create additional Action phases or implicit same-phase Action permissions.',
    ''
  ],
  [
    'Faction references must group Faction Actions separately from Faction Abilities and print the legal phase beside every Faction Action.',
    ''
  ],
  [
    'Use **Onset** as the formal stage name. In ordinary prose, use constructions such as **during Onset** or **at the Onset of the battle**.',
    ''
  ],
  [
    '### Immediate capture effects\n\nAn effect that captures a Territory outside the normal Capture step cannot create non-contiguous control.\n\nUnless the effect expressly advances the Front Line more than once, interpret or rewrite it to:\n\n> Advance that player\'s Front Line one Territory.',
    '### Immediate capture effects\n\nUnless an effect expressly says otherwise, a capture effect outside the normal Capture step advances that player\'s Front Line by one Territory and cannot create non-contiguous control.'
  ],
  [
    'Both routes are the normal shared victory condition. Rules and player-facing text may distinguish the **capture route** from the **Last Stand battle route**, but both are running the Gauntlet.',
    'The capture route and Last Stand battle route both count as running the Gauntlet.'
  ],
  [
    'Conduct the resulting battle under the inherited Last Stand battle rules. The defender normally has Defensive Edge while making a Last Stand unless an effect removes it.',
    'Conduct the resulting battle normally. The defender has Defensive Edge while making a Last Stand unless an effect removes it.'
  ],
  [
    'Reference cards summarize procedures but do not replace the Rulebook or the clean faction authority. If shortened reference text omits a detail, follow the complete authority text.',
    'Reference cards summarize procedures but do not replace the complete faction rules in this Rulebook. If shortened reference text omits a detail, follow the complete rules here.'
  ],
  [
    'Proposal cards are physically presented to the receiving player. Accepted and Refused text therefore uses explicit roles rather than perspective-dependent **you** or **your**.',
    'Proposal cards are physically presented to the receiving player. When resolving a Proposal, follow the player roles named in its Accepted or Refused effect.'
  ],
  [
    '- **Hostile Takeover — Executive only:** After winning a battle as the attacker that turn and becoming the occupier of the enemy Territory, buy or buy out its Deed; a successful purchase also gives you control of that Territory.',
    '- **Hostile Takeover — Executive only:** After winning a battle as the attacker that turn and becoming the occupier of the enemy Territory, buy or buy out its Deed. If the purchase succeeds and that Territory is immediately beyond your Front Line, capture it.'
  ],
  [
    '> **Hostile Takeover:** During Denouement, if you won a battle as the attacker this turn and are now the occupier of that enemy Territory, you may take an Action to buy or buy out its Deed. Treat yourself as the occupier, but not the controller, for the cost calculation. If the purchase succeeds, advance your Front Line by one Territory, if able.',
    '> **Hostile Takeover:** During Denouement, if you won a battle as the attacker this turn and are now the occupier of that enemy Territory, you may take an Action to buy or buy out its Deed. Treat yourself as the occupier, but not the controller, for the cost calculation. If the purchase succeeds and that Territory is immediately beyond your Front Line, capture it. Otherwise, Hostile Takeover does not change Territory control.'
  ],
  [
    "At the beginning of the opponent's turn, after their normal start-of-turn draw attempt, if they draw no cards because both their Draw Pile and Discard Pile are empty, immediately win through **Purification**.",
    "If the opponent is unable to draw to start their turn because both their Draw Pile and Discard Pile are empty, immediately win through **Purification**."
  ],
  [
    "When the controller of Watchtower defends there, the attacker sets their Gambit face up or passes; the defender sets normally. Because the attacker's Gambit was never face down, Counterintelligence does not prevent the reveal. Intelligence may use Direct Interference for 2 Intel.",
    'When the controller of Watchtower defends there, the attacker sets their Gambit face up or passes; the defender sets normally. Playing or setting a card face up does not count as revealing it. Counterintelligence therefore does not prevent effects like Watchtower that cause a card to be played or set face up. Intelligence may use Direct Interference for 2 Intel.'
  ],
  [
    'A Sanction may state additional removal conditions. Cards therefore do not need to repeat identification of the refusing opponent or the default expiration after later acceptance.',
    'Additional printed removal conditions also apply unless the Sanction says otherwise.'
  ],
  [
    '**Asset is the only banked-card effect heading in v0.6.3.**',
    '**Asset is the only banked-card effect heading.**'
  ],
  [
    'Existing Deed purchase costs, caps, procedures, income rules, and Controlling Interest rules apply unchanged.',
    'Normal Deed purchase costs, caps, procedures, income rules, and Controlling Interest rules apply.'
  ],
]);

function replaceLiteral(source, from, to) {
  return source.includes(from) ? source.split(from).join(to) : source;
}

export function applyV063PlayerFacingRulebookCorrections(value) {
  let text = String(value ?? '');
  for (const [from, to] of REPLACEMENTS) {
    text = replaceLiteral(text, from, to);
  }
  return replaceLiteral(text, 'an Denouement', 'Denouement');
}
