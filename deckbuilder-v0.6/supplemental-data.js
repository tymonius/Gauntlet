window.GAUNTLET_V06_SUPPLEMENTALS = {
  military: {
    summary: [
      "Selected Leader Card",
      "Military Command Tracker"
    ],
    leaderImages: {
      general: "https://tymonius.github.io/Gauntlet/images/general.png",
      commandant: "https://tymonius.github.io/Gauntlet/images/commandant.png"
    },
    components: [
      {
        type: "tracker",
        id: "military-command-tracker",
        title: "Military Command",
        note: "Place beneath your Leader Card. Cover this card at 0 Command. Slide the Leader upward until its bottom edge reaches the current Command line.",
        zeroLabel: "0 — Fully covered",
        steps: [
          { value: 1, label: "Command", position: 1.08 },
          { value: 2, label: "Full Command", position: 2.02 }
        ]
      }
    ]
  },

  diplomats: {
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
        note: "Slide your Leader Card until its lower edge aligns with your current Influence. Fully cover this card at 0. Maximum 10.",
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
          { label: "Before a battle involving you", text: "1. Choose an eligible Proposal.\n2. Lower Influence by its listed Stake.\n3. The opponent accepts or refuses." },
          { label: "Accepted", text: "No battle occurs. Resolve the Accepted effect and return the stake. If newly ratified, flip the Proposal and gain Influence equal to its Stake." },
          { label: "Refused", text: "Resolve the Refused effect, then battle. Before dice, you may use Leverage." },
          { label: "You win", text: "Impose the Proposal and return the stake. If newly ratified, flip it and gain 1 Influence unless stated otherwise." },
          { label: "You lose", text: "Do not ratify it. Lose the stake." },
          { label: "No winner", text: "Do not ratify it. Return the stake." }
        ],
        footer: "Reference side A — pair with side B"
      },
      {
        type: "reference",
        id: "diplomat-reference-b",
        title: "Influence & Treaty",
        subtitle: "Side B — Resource and Victory",
        sections: [
          { label: "Influence", text: "Track available Influence from 0 to 10. Excess gains are lost." },
          { label: "Staking", text: "Lower the tracker by the Proposal's Stake. That Influence is unavailable until Terms resolve." },
          { label: "Leverage", text: "Before dice in a battle following refused Terms, spend any amount of available Influence for +1 battle total each." },
          { label: "Treaty Articles", text: "A ratified Proposal may be offered again, but cannot be ratified again or grant normal newly-ratified Influence rewards." },
          { label: "Peace Treaty", text: "At the start of your turn, after captures, five different Treaty Articles win the game." }
        ],
        footer: "Reference side B — pair with side A"
      }
    ],
    proposals: [
      { number: 1, name: "De-escalation", stake: 0, accepted: "Both players withdraw. The opponent draws one card.", refused: "Draw one card." },
      { number: 2, name: "Orderly Withdrawal", stake: 0, requirement: "You must be attacking.", accepted: "You withdraw. The opponent remains in or occupies the battle space, then draws one card.", refused: "Gain +1 battle total." },
      { number: 3, name: "Capitulation", stake: 0, requirement: "You must be defending.", accepted: "You withdraw. The opponent remains in or occupies the battle space, then draws one card.", refused: "If you lose, draw two cards." },
      { number: 4, name: "Open Channels", stake: 1, requirement: "You must have a card in hand.", accepted: "Both players reveal their hands, then withdraw. The opponent draws one card.", refused: "Look at the opponent's hand. During battle draw, draw one additional card before choosing your battle-drawn card." },
      { number: 5, name: "Mutual Disarmament", stake: 1, requirement: "Both players must have a card in hand.", accepted: "Each player discards one card from hand. The opponent draws one card, then both players withdraw.", refused: "You may discard one card from hand. If you do, during battle draw, draw one additional card before choosing your battle-drawn card." },
      { number: 6, name: "Prisoner Exchange", stake: 1, requirement: "Each player must have a card in their Graveyard.", accepted: "Each player may move one card from their Graveyard to their discard pile. Then both players withdraw.", refused: "If you lose, you may move one card from your Graveyard to your discard pile." },
      { number: 7, name: "Rebuilding Pact", stake: 1, requirement: "You must have a card in hand that can be banked as an Asset.", accepted: "Each player may bank one Asset from hand without using an Action. Then both players withdraw.", refused: "After the battle, you may bank one Asset from hand without using an Action." },
      { number: 8, name: "Ultimatum", stake: 2, accepted: "The opponent withdraws. You remain in or occupy the battle space.", refused: "Gain +1 battle total. If you win and newly ratify this Proposal, gain 2 Influence instead of 1." },
      { number: 9, name: "Diplomatic Recognition", stake: 2, requirement: "You must be defending a counterattack on a Territory you occupy that the opponent controlled immediately before you occupied it.", accepted: "Capture that Territory immediately. The opponent withdraws, then draws two cards.", refused: "If you win, capture that Territory immediately, but gain no Influence for imposing this Proposal." }
    ]
  },

  inquisition: {
    summary: [
      "Selected Leader Card",
      "Inquisition Conviction Tracker",
      "Inquisition Doctrine reference",
      "Purge Reference"
    ],
    leaderImages: {
      "grand-inquisitor": "https://tymonius.github.io/Gauntlet/images/grand%20inquisitor.png",
      "witch-hunter": "https://tymonius.github.io/Gauntlet/images/witch%20hunter.png"
    },
    components: [
      {
        type: "tracker",
        id: "inquisition-conviction-tracker",
        title: "Inquisition Conviction",
        note: "Place beneath the selected Leader Card. Fully align at 0; slide the Leader upward until its bottom edge aligns with the current Conviction line.",
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
          { label: "Conviction", text: "Maximum 4. The first time each turn one or more opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction." },
          { label: "Condemnation", text: "In battles involving you, opposing played battle-drawn cards go to their owner's Graveyard after the battle instead of discard. Hand commitments already go to the Graveyard. Unplayed battle-drawn cards are discarded normally." },
          { label: "Blasphemy", text: "Whenever the opponent plays a card with the Arcane trait, gain 1 Conviction outside the normal once-per-turn limit, up to the maximum. The Arcane trait is separate from faction allegiance; not every Arcane card belongs to Mystics." },
          { label: "Purification", text: "At the start of the opponent's turn, after their normal draw attempt, if they draw no cards because their deck and discard pile are empty, you win. Failed battle draws and card-effect draws do not trigger Purification." }
        ],
        footer: "Supplemental reference — no deckbuilding value"
      },
      {
        type: "purge",
        id: "purge-reference",
        title: "Purge Reference",
        intro: "Instead of playing an Action card during the Action step, spend Conviction to choose one:",
        rows: [
          { cost: 1, text: "Send the top card of the opponent's discard pile to their Graveyard; or send up to two cards there with combined deckbuilding value 2 or less to their Graveyard." },
          { cost: 2, text: "Send one opposing Asset to its owner's Graveyard." },
          { cost: 3, text: "The opponent sends one card from hand to their Graveyard." },
          { cost: 4, text: "Look at the opponent's hand. Send one card to their Graveyard." }
        ],
        reminder: "Final Judgment: After the Grand Inquisitor wins a battle, they may Purge once per turn without using the Action opportunity and reduce its cost by 1, minimum 1."
      }
    ]
  },
  financiers: {
    summary: [
      "Selected Leader Card",
      "Financier Reference",
      "Capital Tracker",
      "Eight full-size generic Deed Cards"
    ],
    leaderImages: {
      banker: "https://tymonius.github.io/Gauntlet/images/leader-cards/banker.svg",
      executive: "https://tymonius.github.io/Gauntlet/images/leader-cards/executive.svg"
    },
    components: [
      {
        type: "reference", id: "financier-reference", title: "Financier Reference",
        sections: [
          { label: "Capital", text: "Cannot fall below 0. Limit = controlled Territories + total value in Treasury. Reduce excess only at end of turn." },
          { label: "Treasury", text: "After movement, instead of an Action card, place one hand card face up in Treasury. It raises the Capital limit but cannot be played normally." },
          { label: "Deed cost", text: "min(Deeds you own + 1, 6) + position modifier + buyout premium; minimum 1. Control -1, occupy 0, neither +1. Buyout premium = min(opposing owner's Deeds, 6)." },
          { label: "Market & Subsidize", text: "Market: 1 = Graveyard/0; 2-3 = 1; 4-5 = card value; 6 = twice value. Subsidize: +1/1, +2/3, +3/6, +4/10." },
          { label: "Income & victory", text: "After captures, gain 1 Capital per owned Deed. Win when every Territory has a Deed Card on your side." }
        ]
      },
      { type: "capital", id: "financier-capital-tracker", title: "Capital Tracker", note: "Track current Capital and Capital limit publicly. Capital has no fixed maximum." },
      { type: "deed-set", id: "financier-deed-cards", title: "Deed", count: 8 }
    ]
  },
};