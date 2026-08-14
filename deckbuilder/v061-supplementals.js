(() => {
  const packages = window.GAUNTLET_V06_SUPPLEMENTALS || (window.GAUNTLET_V06_SUPPLEMENTALS = {});

  packages.military = {
    summary: ["Selected Leader Card", "Military Command Tracker"],
    leaderImages: {
      general: "https://tymonius.github.io/Gauntlet/images/general.png",
      commandant: "https://tymonius.github.io/Gauntlet/images/commandant.png"
    },
    components: [{
      type: "tracker",
      id: "military-command-tracker",
      title: "Military Command",
      note: "Place beneath your Leader Card. Fully cover this card at 0 Command. Slide the Leader upward until its bottom edge reaches the current Command line.",
      zeroLabel: "0 — Fully covered",
      steps: [
        { value: 1, label: "Command", position: 1.08 },
        { value: 2, label: "Full Command", position: 2.02 }
      ]
    }]
  };

  packages.diplomats = {
    summary: [
      "Selected Leader Card",
      "Diplomat Influence Tracker",
      "Nine double-sided Proposal / Treaty Article cards",
      "Double-sided Diplomat Reference card"
    ],
    leaderImages: {
      ambassador: "https://tymonius.github.io/Gauntlet/images/ambassador.png",
      senator: "https://tymonius.github.io/Gauntlet/images/senator.png"
    },
    components: [
      {
        type: "tracker",
        id: "diplomat-influence-tracker",
        title: "Diplomat Influence",
        note: "Place beneath your Leader Card. Fully cover this card at 0 Influence. Slide the Leader upward until its bottom edge aligns with current Influence. Maximum 10.",
        zeroLabel: "0 — Fully covered",
        steps: Array.from({ length: 10 }, (_, index) => ({
          value: index + 1,
          label: "Influence",
          position: (index + 1) * 0.30
        }))
      },
      {
        type: "reference",
        id: "diplomat-reference-a",
        title: "Diplomat Reference",
        subtitle: "Side A — Offering Terms",
        sections: [
          { label: "Opening effects", text: "Before Gambits are set, choose one eligible Proposal, confirm its Requirement, and lower available Influence by its Stake. The opponent accepts or refuses." },
          { label: "Accepted", text: "No battle occurs. Resolve the Accepted effect, return the Stake, and flip an unratified Proposal. If newly ratified, gain Influence equal to its Stake." },
          { label: "Refused", text: "Resolve the Refused effect, then continue to Set Gambits. Before dice, available Influence may be spent through Leverage for +1 battle total each." },
          { label: "Result", text: "Win: return Stake, impose an unratified Proposal, and normally gain 1 Influence. Loss: lose Stake and do not ratify. Withdrawal or another no-winner result: return Stake and do not ratify." }
        ],
        footer: "Reference side A — pair with side B"
      },
      {
        type: "reference",
        id: "diplomat-reference-b",
        title: "Influence & Treaty",
        subtitle: "Side B — Resource and Victory",
        sections: [
          { label: "Influence", text: "Begin at 1. Minimum 0, maximum 10. Staked Influence is unavailable until Terms resolve; excess gains are lost." },
          { label: "Diplomat mirror", text: "The attacker may offer first. If they pass, the defender may offer. Once either offers, the other cannot offer Terms for that pending battle." },
          { label: "Treaty Articles", text: "A ratified Proposal may be offered again for its tactical effects, but cannot be ratified again or grant the normal newly-ratified reward." },
          { label: "Peace Treaty", text: "At the start of your turn, after the Capture step and before the Draw step, five different ratified Proposals win the game." }
        ],
        footer: "Reference side B — pair with side A"
      }
    ],
    proposals: [
      { number: 1, name: "De-escalation", stake: 0, accepted: "Both players withdraw. The opponent draws one card.", refused: "Draw one card." },
      { number: 2, name: "Orderly Withdrawal", stake: 0, requirement: "You must be attacking.", accepted: "You withdraw. The opponent remains in or occupies the contested position, then draws one card.", refused: "Add +1 to your battle total." },
      { number: 3, name: "Capitulation", stake: 0, requirement: "You must be defending.", accepted: "You withdraw. The opponent remains in or occupies the contested position, then draws one card.", refused: "If you lose, draw two cards." },
      { number: 4, name: "Open Channels", stake: 1, requirement: "You must have a card in Hand.", accepted: "Both players reveal their Hands, then withdraw. The opponent draws one card.", refused: "Reveal the opponent's Hand. When forming your Reserve, draw one additional card." },
      { number: 5, name: "Mutual Disarmament", stake: 1, requirement: "Both players must have a card in Hand.", accepted: "Each player discards one card from Hand. The opponent draws one card, then both players withdraw.", refused: "You may discard one card from Hand. If you do, draw one additional card when forming your Reserve." },
      { number: 6, name: "Prisoner Exchange", stake: 1, requirement: "Each player must have a card in their Graveyard.", accepted: "Each player may move one card from their Graveyard to their Discard Pile. Then both players withdraw.", refused: "If you lose, you may move one card from your Graveyard to your Discard Pile." },
      { number: 7, name: "Rebuilding Pact", stake: 1, requirement: "You must have a card in Hand that can be banked as an Asset.", accepted: "Each player may bank one eligible card from Hand as an Asset without spending an Action. Then both players withdraw.", refused: "During the Aftermath, you may bank one eligible card from Hand as an Asset without spending an Action." },
      { number: 8, name: "Ultimatum", stake: 2, accepted: "The opponent withdraws. You remain in or occupy the contested position.", refused: "Add +1 to your battle total. If you win and newly ratify this Proposal, gain 2 Influence instead of 1." },
      { number: 9, name: "Diplomatic Recognition", stake: 2, requirement: "You must be defending a counterattack on a Territory you occupy that the opponent controlled immediately before you occupied it.", accepted: "Capture that Territory. The opponent withdraws, then draws two cards.", refused: "If you win, capture that Territory during the Aftermath, but gain no Influence for imposing this Proposal." }
    ]
  };

  packages.financiers = {
    summary: ["Selected Leader Card", "Financier Reference", "Capital Ledger", "Eight full-size generic Deed Cards"],
    leaderImages: {
      banker: "https://tymonius.github.io/Gauntlet/images/leader-cards/banker.svg",
      executive: "https://tymonius.github.io/Gauntlet/images/leader-cards/executive.svg"
    },
    components: [
      {
        type: "reference",
        id: "financier-reference",
        title: "Financier Reference",
        sections: [
          { label: "Capital & Capacity", text: "Minimum 0. Limit = Territories controlled + total card value in Treasury; reduce excess at the end of every turn. After Capture effects, if Treasury value exceeds Territories controlled, gain 1 additional Action that turn; if both Actions are spent, one must be a Financier Faction Action." },
          { label: "Treasury", text: "During an Action Opportunity after movement, spend 1 Action to place one Hand card face up in Treasury. Treasury is outside normal zones and is not the Asset Bank." },
          { label: "Deed cost", text: "min(Deeds you own + 1, 6) + position modifier + buyout premium; minimum 1. Control −1, occupy 0, neither +1. Buyout premium = min(Deeds the opposing owner owns, 6)." },
          { label: "Play the Market", text: "Discard one Hand card and roll: 1 = Graveyard/0; 2–3 = 1 Capital; 4–5 = card value; 6 = twice card value." },
          { label: "Subsidize", text: "Before dice: +1 costs 1; +2 costs 3; +3 costs 6; +4 costs 10. The cumulative progression continues without a fixed maximum." },
          { label: "Income & victory", text: "After the Capture step, gain 1 Capital per owned Deed. Immediately win when you own the Deeds to every Territory currently in the Gauntlet." }
        ],
        footer: "Supplemental reference — not a Playable Deck card"
      },
      {
        type: "capital",
        id: "financier-capital-ledger",
        title: "Capital Ledger",
        note: "Record every Capital gain, spend, loss, and end-turn reduction as a transaction. The last Balance entry is current Capital. Record the current Capital limit separately."
      },
      { type: "deed-set", id: "financier-deed-cards", title: "Deed", count: 8 }
    ]
  };

  packages.intelligence = {
    summary: ["Selected Leader Card", "Mission Reference", "Operations Reference", "Intel sliding tracker", "Operation Progress sliding tracker"],
    leaderImages: {
      ranger: "https://tymonius.github.io/Gauntlet/images/ranger.png",
      spymaster: "https://tymonius.github.io/Gauntlet/images/spymaster.png"
    },
    components: [
      {
        type: "reference",
        id: "intelligence-mission-reference",
        title: "Mission Reference",
        sections: [
          { label: "Eligible", text: "Only an Intelligence card with a printed Mission requirement." },
          { label: "Start", text: "During an Action Opportunity after movement, spend 1 Action to place one eligible Hand card face down as the Active Mission. Only one; it cannot complete that turn." },
          { label: "Complete", text: "During a later after-movement Action Opportunity, spend 1 Action to reveal a satisfied Active Mission. Gain 1 Operation Progress and Intel equal to its value, then put it in the Discard Pile." },
          { label: "Abort or fail", text: "During an after-movement Action Opportunity, spend 1 Action, reveal the Active Mission, and spend Intel equal to its value to abort it; discard it. A failed Mission is revealed and put in the Graveyard." },
          { label: "Special Operation", text: "Progress must exceed opposing controlled Territories. Spend 1 Action after movement to start an eligible card face down. Later, while ready and satisfied, spend 1 Action after movement and pay Territories in the Gauntlet minus card value, minimum 1 Intel, to win." }
        ],
        footer: "Supplemental reference — not a Playable Deck card"
      },
      {
        type: "reference",
        id: "intelligence-operations-reference",
        title: "Operations Reference",
        sections: [
          { label: "Gambit Surveillance", text: "Once per battle after the opponent sets a face-down Gambit, spend 1 Intel to reveal it." },
          { label: "Tactic Surveillance", text: "Once per battle after the opponent chooses face-down Tactics, spend 1 Intel for each opposing Tactic revealed. The two Surveillance opportunities are independent." },
          { label: "Interference", text: "Immediately after Surveillance, spend 2 additional Intel per revealed card removed. A Gambit returns to Hand; a Tactic returns to Reserve. Its owner may replace it from that source or pass." },
          { label: "Direct Interference", text: "A face-up opposing choice may be Interfered with directly for 2 Intel at the same response timing without Surveillance." },
          { label: "Revision & limits", text: "After Interference and replacements, revise your corresponding choice if already made. A replacement creates no new reveal or response window. Prevented uses still spend Intel and use the opportunity." }
        ],
        footer: "Supplemental reference — not a Playable Deck card"
      },
      {
        type: "tracker",
        id: "intelligence-intel-tracker",
        title: "Intel Tracker",
        note: "Begin at 0; Intel has no maximum. Place beneath the Operations Reference and slide to the current printed value. Continue recording above 20 separately if necessary.",
        zeroLabel: "0 — Fully covered",
        compact: true,
        steps: Array.from({ length: 20 }, (_, index) => ({ value: index + 1, label: (index + 1) % 5 === 0 ? "Intel" : "", position: (index + 1) * 0.15 }))
      },
      {
        type: "tracker",
        id: "intelligence-operation-progress-tracker",
        title: "Operation Progress",
        note: "Begin at 0; Operation Progress has no maximum. Place beneath the Mission Reference and slide to the current printed value. Continue recording above 8 separately if necessary.",
        zeroLabel: "0 — Fully covered",
        steps: Array.from({ length: 8 }, (_, index) => ({ value: index + 1, label: "Progress", position: (index + 1) * 0.36 }))
      }
    ]
  };

  packages.mystics = {
    summary: ["Selected Leader Card", "Mystics Reference", "Three double-sided Rite cards"],
    leaderImages: {
      alchemist: "https://tymonius.github.io/Gauntlet/images/leader-cards/alchemist.svg",
      "spirit-walker": "https://tymonius.github.io/Gauntlet/images/leader-cards/spirit-walker.svg"
    },
    components: [{
      type: "reference",
      id: "mystics-reference",
      title: "Mystics Reference",
      sections: [
        { label: "Begin a Rite", text: "During an Action Opportunity after movement, spend 1 Action and pay one incomplete Rite's beginning cost. Only one begun Rite; it cannot complete that turn; complete at most one per turn." },
        { label: "Progression", text: "First completed Rite unlocks Invocation. Second unlocks Transmutation. Third unlocks Convergence and permission to begin the Ritual of Ascendance." },
        { label: "Invocation", text: "Once per turn, when an Arcane card you play, set, or choose resolves its Action, Gambit, Tactic, or Battle effect, move one card from your Graveyard to your Discard Pile." },
        { label: "Transmutation", text: "Once per turn before dice, put one Hand card in your Graveyard and add its value to your battle total. It is not played and its effects do not resolve." },
        { label: "Ritual & Convergence", text: "After three Rites, bind one Arcane card from Hand, Discard Pile, and Graveyard. In a battle you initiate, gain +1 per Ritual card. Initiate and win while all remain bound to win." },
        { label: "Bound cards", text: "Bound cards are outside normal zones and move only as instructed. If a Rite or Ritual binding ends without another instruction, put those bound cards in their owners' Graveyards." }
      ],
      footer: "Supplemental reference — not a Playable Deck card"
    }],
    rites: [
      {
        name: "Rite of Echoes",
        icon: "◉",
        beginning: "Bind one chosen Graveyard card face up beneath this Rite. Then bind one Hand card face down whose title matches at least one other card in your Playable Deck.",
        completion: "On a later turn, complete when another card with the bound Hand card's title resolves its Gambit, Tactic, or Battle effect during a battle.",
        result: "Move the chosen Graveyard card to your Discard Pile; put the bound Hand card in your Graveyard; resolve the completing card normally.",
        interruption: "If you lose a battle first, put both bound cards in your Graveyard and reset this Rite."
      },
      {
        name: "Rite of Blood",
        icon: "◆",
        beginning: "Put one card from your Hand in your Graveyard.",
        completion: "On a later turn, complete when you win a battle without setting a Gambit or choosing a Tactic.",
        result: "Transmutation, Assets, Overlays, Territories, Leader abilities, and cards from other sources do not by themselves prevent completion.",
        interruption: "If you lose a battle first, reset this Rite."
      },
      {
        name: "Rite of Crossing",
        icon: "✦",
        requirement: "Begin only during an Action Opportunity after movement after winning a battle that caused you to occupy a Territory the opponent controlled immediately before that battle.",
        beginning: "Put one Arcane card from your Hand in your Graveyard. If you have none, reveal your Hand and move one Arcane card from your Discard Pile to your Graveyard instead.",
        completion: "At the start of your next turn, after the Capture step, complete if you still occupy or control that Territory.",
        interruption: "Otherwise, reset this Rite."
      }
    ]
  };

  packages.inquisition = {
    summary: ["Selected Leader Card", "Inquisition Conviction Tracker", "Inquisition Doctrine Reference", "Purge Reference"],
    leaderImages: {
      "grand-inquisitor": "https://tymonius.github.io/Gauntlet/images/grand%20inquisitor.png",
      "witch-hunter": "https://tymonius.github.io/Gauntlet/images/witch%20hunter.png"
    },
    components: [
      {
        type: "tracker",
        id: "inquisition-conviction-tracker",
        title: "Inquisition Conviction",
        note: "Place beneath the selected Leader Card. Fully cover at 0; slide the Leader upward until its bottom edge aligns with current Conviction. Maximum 4.",
        zeroLabel: "0 — Fully covered",
        steps: [
          { value: 1, label: "Conviction", position: 0.72 },
          { value: 2, label: "Conviction", position: 1.27 },
          { value: 3, label: "Conviction", position: 1.82 },
          { value: 4, label: "Maximum Conviction", position: 2.37 }
        ]
      },
      {
        type: "reference",
        id: "inquisition-doctrine",
        title: "Inquisition Doctrine",
        sections: [
          { label: "Conviction", text: "Maximum 4. The first time each turn one or more opposing cards enter the Graveyard during the Aftermath of a battle involving you, gain 1 Conviction." },
          { label: "Condemnation", text: "During the Aftermath of battles involving you, opposing Tactics go to their owner's Graveyard instead of their Discard Pile. Opposing Gambits already do; Reserve cards discard normally." },
          { label: "Blasphemy", text: "When an opponent plays an Arcane card for its Action effect, or an Arcane Gambit or Tactic they control is revealed, gain 1 Conviction outside the normal once-per-turn gain." },
          { label: "Purification", text: "At the beginning of the opponent's turn, after their normal draw attempt, win if they draw no cards because both their Draw Pile and Discard Pile are empty. Other failed draws do not count." }
        ],
        footer: "Supplemental reference — not a Playable Deck card"
      },
      {
        type: "purge",
        id: "purge-reference",
        title: "Purge Reference",
        intro: "During an Action Opportunity, spend 1 Action and Conviction to choose one:",
        rows: [
          { cost: 1, text: "Put the top card of the opponent's Discard Pile in their Graveyard; or choose up to two cards there with combined value 2 or less and put them in their Graveyard." },
          { cost: 2, text: "Choose one opposing Asset and put it in its owner's Graveyard." },
          { cost: 3, text: "The opponent chooses one card from their Hand and puts it in their Graveyard." },
          { cost: 4, text: "Reveal the opponent's Hand. Choose one card and put it in their Graveyard." }
        ],
        reminder: "The first Action spent to Purge each turn grants 1 additional Action; spend at most 1 Action on Purge each turn. Final Judgment: once per turn during the Aftermath of a battle the Grand Inquisitor won, after battle cards are cleared, Purge without spending an Action and reduce the cost by 1, minimum 1."
      }
    ]
  };
})();
