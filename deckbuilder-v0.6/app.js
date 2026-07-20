const SOURCES = {
  neutral: {
    label: "Neutral",
    path: "../docs/Gauntlet_v0.6_Neutral_Card_Pool.md"
  },
  military: {
    label: "Military",
    path: "../releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md",
    start: "# 6. Canonical Military card pool",
    end: "# 7. Card-pool summary"
  },
  diplomats: {
    label: "Diplomats",
    path: "../releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md",
    start: "# 6. Canonical card pool",
    end: "# 7. Card-pool summary"
  },
  inquisition: {
    label: "Inquisition",
    path: "../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md",
    start: "## 6. Canonical Inquisition card pool",
    end: "## 7. Card-pool summary",
    headingLevel: 3
  },
  financiers: {
    label: "Financiers",
    path: "../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md",
    start: "## 6. Canonical Financier card pool",
    end: "## 7. Card-pool summary",
    headingLevel: 3
  },
  intelligence: {
    label: "Intelligence",
    path: "../releases/v0.6/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.md",
    start: "# 6. Canonical Intelligence card pool",
    end: "# 7. Card-pool summary"
  }
};

const FACTIONS = [
  {
    id: "military",
    name: "Military",
    status: "ready",
    identity: "Command, Orders, battlefield momentum, and direct control.",
    resource: "Command (maximum 2)",
    victory: "Run the Gauntlet.",
    leaders: [
      {
        id: "general",
        name: "General",
        tagline: "Forward. Again.",
        role: "Attack · Forward pressure · Tempo",
        rules: [
          ["Command", "The first time each turn you win a battle, gain 1 Command, up to 2."],
          ["Onward — 1 Command", "Move one additional position this turn. Resolve this movement one position at a time. It may initiate a battle."],
          ["Rally — 1 Command", "Before dice are rolled in a battle you initiated, add +1 to your battle total."],
          ["Rout — 2 Command", "After you win a battle you initiated, move one position toward the opponent's end of the Gauntlet. This movement may initiate another battle."]
        ]
      },
      {
        id: "commandant",
        name: "Commandant",
        tagline: "We hold. They break.",
        role: "Defense · Counterattack · Control",
        rules: [
          ["Command", "The first time each turn you win a battle, gain 1 Command, up to 2."],
          ["Entrench — 1 Command", "Before dice are rolled in a battle you did not initiate, add +1 to your battle total."],
          ["Repel — 1 Command", "After you win a battle you did not initiate, the defeated opponent retreats one additional position, if able."],
          ["Fortify — 2 Command", "After you win a battle while occupying an enemy-controlled Territory, capture that Territory immediately."]
        ]
      }
    ]
  },
  {
    id: "diplomats",
    name: "Diplomats",
    status: "ready",
    identity: "Terms, Influence, concessions, and political legitimacy.",
    resource: "Influence (0–10)",
    victory: "Peace Treaty: begin your turn with five different ratified Proposals.",
    leaders: [
      {
        id: "ambassador",
        name: "Ambassador",
        tagline: "Words first. War last.",
        role: "Acceptance · Card flow · Voluntary agreement",
        rules: [
          ["Setup", "Set Influence to 1 and place the nine Proposals Proposal-side up."],
          ["Leverage", "Before dice following refused Terms, spend any available Influence for +1 battle total each."],
          ["Cordiality", "Once per turn, after the opponent accepts your Terms, draw one card."],
          ["Peace Treaty", "At the start of your turn, after captures, five different ratified Proposals win the game."]
        ]
      },
      {
        id: "senator",
        name: "Senator",
        tagline: "Procedure endures.",
        role: "Stakes · Resilience · Political capital",
        rules: [
          ["Setup", "Set Influence to 1 and place the nine Proposals Proposal-side up."],
          ["Leverage", "Before dice following refused Terms, spend any available Influence for +1 battle total each."],
          ["Political Capital", "Once per turn, when you would lose staked Influence after losing the battle, send cards from hand to your Graveyard to recover 1 staked Influence per card."],
          ["Peace Treaty", "At the start of your turn, after captures, five different ratified Proposals win the game."]
        ]
      }
    ]
  },
  {
    id: "inquisition",
    name: "Inquisition",
    status: "ready",
    identity: "Conviction, condemnation, Purge, and Purification.",
    resource: "Conviction (maximum 4)",
    victory: "Purification: the opponent begins a turn unable to draw from deck or discard.",
    leaders: [
      {
        id: "grand-inquisitor",
        name: "Grand Inquisitor",
        tagline: "We judge. We purge.",
        role: "Judgment · Purge · Resource destruction",
        rules: [
          ["Conviction", "The first time each turn opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction, up to 4."],
          ["Condemnation", "Opposing played battle-drawn cards go to the Graveyard after battles involving you instead of discard."],
          ["Final Judgment", "Once per turn after you win a battle, Purge immediately without using the Action opportunity and reduce its Conviction cost by 1, minimum 1."],
          ["Purification", "At the start of the opponent's turn, after their normal draw attempt, if no card can be drawn from deck or discard, you win."]
        ]
      },
      {
        id: "witch-hunter",
        name: "Witch Hunter",
        tagline: "You ran. I followed.",
        role: "Defense · Pursuit · Exposure",
        rules: [
          ["Conviction", "The first time each turn opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction, up to 4."],
          ["Condemnation", "Opposing played battle-drawn cards go to the Graveyard after battles involving you instead of discard."],
          ["Relentless Pursuit", "Once per turn after an opponent loses a battle they initiated against you, spend 2 Conviction to end their turn, then move one space toward their Heartland; resolve any resulting battle immediately."],
          ["Purification", "At the start of the opponent's turn, after their normal draw attempt, if no card can be drawn from deck or discard, you win."]
        ]
      }
    ]
  },
  {
    id: "mystics",
    name: "Mystics",
    status: "developing",
    identity: "Rites, sacrifice, transformation, and Ritual victory.",
    resource: "In development",
    victory: "Ritual victory — in development.",
    leaders: [{ id: "alchemist", name: "Alchemist" }, { id: "spirit-walker", name: "Spirit Walker" }]
  },
  {
    id: "financiers",
    name: "Financiers",
    status: "ready",
    identity: "Capital, Treasury, Deeds, leverage, income, and Controlling Interest.",
    resource: "Capital (dynamic limit)",
    victory: "Controlling Interest: own the Deeds to every Territory in the Gauntlet.",
    leaders: [
      {
        id: "banker",
        name: "Banker",
        tagline: "Credit closes the distance.",
        role: "Collateral · Purchase timing · Flexible financing",
        rules: [
          ["Capital limit", "Territories you control plus the total value of cards in your Treasury."],
          ["Treasury", "Instead of playing an Action card after movement, place one card from hand face up in Treasury."],
          ["Line of Credit", "The first Deed purchase or buyout each turn may use one hand or Treasury card as collateral, contributing its value up to half the cost before being discarded."],
          ["Controlling Interest", "Immediately win when you own the Deeds to every Territory currently in the Gauntlet."]
        ]
      },
      {
        id: "executive",
        name: "Executive",
        tagline: "Take the ground. Close the deal.",
        role: "Offense · Occupation · Immediate control",
        rules: [
          ["Capital limit", "Territories you control plus the total value of cards in your Treasury."],
          ["Treasury", "Instead of playing an Action card after movement, place one card from hand face up in Treasury."],
          ["Hostile Takeover", "After winning a battle that caused you to occupy enemy Territory, use the after-movement Action opportunity to buy that Deed at occupied cost; success immediately gives you control."],
          ["Controlling Interest", "Immediately win when you own the Deeds to every Territory currently in the Gauntlet."]
        ]
      }
    ]
  },
  {
    id: "intelligence",
    name: "Intelligence",
    status: "ready",
    identity: "Intel, Missions, Surveillance, Interference, and Special Operation.",
    resource: "Intel and Operation Progress (begin at 0)",
    victory: "Run the Gauntlet or complete a Special Operation.",
    leaders: [
      {
        id: "ranger",
        name: "Ranger",
        tagline: "Know the land before the battle begins.",
        role: "Terrain · Reconnaissance · Hostile ground",
        rules: [
          ["Missions", "Complete normal Missions to gain 1 Operation Progress and Intel equal to the Mission card's value."],
          ["Surveillance", "Once per battle, spend 1 Intel to look at one opposing face-down Battle card when it is committed or selected."],
          ["Fieldcraft", "Once per turn, spend 1 Intel to ignore a revealed Territory effect affecting you, your movement, or a battle involving you until end of turn."],
          ["Special Operation", "When Progress exceeds opposing controlled Territories, start an eligible Mission card as the Special Operation; satisfy it later and pay the final Intel cost to win."]
        ]
      },
      {
        id: "spymaster",
        name: "Spymaster",
        tagline: "Information never rests. Momentum is the weapon.",
        role: "Mission tempo · Network command · Coordination",
        rules: [
          ["Missions", "Complete normal Missions to gain 1 Operation Progress and Intel equal to the Mission card's value."],
          ["Surveillance", "Once per battle, spend 1 Intel to look at one opposing face-down Battle card when it is committed or selected."],
          ["Mission Control", "Once per turn after completing a normal Mission, immediately start another Mission from hand without using the Action opportunity. It cannot complete that turn or be the Special Operation."],
          ["Special Operation", "When Progress exceeds opposing controlled Territories, start an eligible Mission card as the Special Operation; satisfy it later and pay the final Intel cost to win."]
        ]
      }
    ]
  }
];
