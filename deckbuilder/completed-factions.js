(() => {
  SOURCES.mystics = {
    label: "Mystics",
    path: "../releases/v0.6.0/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md",
    start: "## 7. Canonical Mystics card pool",
    end: "## 8. Package summary and development watchlist",
    headingLevel: 3
  };

  const auditedFactions = [
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
            ["Onward — 1 Command", "Move one additional position this turn. Resolve movement one position at a time. It may initiate a battle."],
            ["Rally — 1 Command", "Before dice are rolled in a battle you initiated, add +1 to your battle total."],
            ["Rout — 2 Command", "After you win a battle you initiated, move one position toward the opponent's end of the Gauntlet. This may initiate another battle."]
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
            ["Fortify — 2 Command", "After you win while occupying an enemy-controlled Territory, capture it immediately."]
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
      victory: "Peace Treaty: after the Capture step, have five different ratified Proposals.",
      leaders: [
        {
          id: "ambassador",
          name: "Ambassador",
          tagline: "Words first. War last.",
          role: "Agreement · Card flow · Settlement",
          rules: [
            ["Setup", "Begin with 1 Influence and all nine Proposals Proposal side up."],
            ["Leverage", "Before dice following refused Terms, spend available Influence for +1 battle total each."],
            ["Cordiality", "Once per turn, after the opponent accepts your Terms, draw one card."],
            ["Peace Treaty", "After the Capture step at the start of your turn, five different ratified Proposals win the game."]
          ]
        },
        {
          id: "senator",
          name: "Senator",
          tagline: "Procedure endures.",
          role: "Stakes · Resilience · Imposition",
          rules: [
            ["Setup", "Begin with 1 Influence and all nine Proposals Proposal side up."],
            ["Leverage", "Before dice following refused Terms, spend available Influence for +1 battle total each."],
            ["Political Capital", "Once per turn, when a refused battle loss would cost staked Influence, put cards from hand in your Graveyard to recover 1 staked Influence per card."],
            ["Peace Treaty", "After the Capture step at the start of your turn, five different ratified Proposals win the game."]
          ]
        }
      ]
    },
    {
      id: "financiers",
      name: "Financiers",
      status: "ready",
      identity: "Capital, Treasury, Deeds, collateral, and acquisition.",
      resource: "Capital (dynamic limit)",
      victory: "Controlling Interest: own the Deeds to every Territory currently in the Gauntlet.",
      leaders: [
        {
          id: "banker",
          name: "Banker",
          tagline: "Credit closes the distance.",
          role: "Collateral · Planned purchases · Flexible financing",
          rules: [
            ["Capital limit", "Territories you control plus the total deckbuilding value of cards in your Treasury."],
            ["Treasury", "During the Action Opportunity after movement, place one card from hand in Treasury instead of playing a card for its Action effect."],
            ["Line of Credit", "The first Deed purchase or buyout each turn may use one hand or Treasury card as collateral, contributing up to half the cost rounded down."],
            ["Controlling Interest", "Immediately win when you own every Deed currently in the Gauntlet."]
          ]
        },
        {
          id: "executive",
          name: "Executive",
          tagline: "Take the ground. Close the deal.",
          role: "Offense · Occupation · Immediate control",
          rules: [
            ["Capital limit", "Territories you control plus the total deckbuilding value of cards in your Treasury."],
            ["Treasury", "During the Action Opportunity after movement, place one card from hand in Treasury instead of playing a card for its Action effect."],
            ["Hostile Takeover", "During the Action Opportunity after movement, buy the Deed to enemy-controlled Territory you occupied by winning a battle this turn; a successful purchase gives immediate control."],
            ["Controlling Interest", "Immediately win when you own every Deed currently in the Gauntlet."]
          ]
        }
      ]
    },
    {
      id: "intelligence",
      name: "Intelligence",
      status: "ready",
      identity: "Intel, Missions, Surveillance, Interference, and Special Operations.",
      resource: "Intel and Operation Progress (begin at 0)",
      victory: "Run the Gauntlet or complete a Special Operation.",
      leaders: [
        {
          id: "ranger",
          name: "Ranger",
          tagline: "Know the land before the battle begins.",
          role: "Territories · Reconnaissance · Field operations",
          rules: [
            ["Missions", "Complete normal Missions for 1 Operation Progress and Intel equal to the Mission card's value."],
            ["Surveillance", "Once per battle, spend 1 Intel to inspect one opposing face-down hand commitment or Battle Hand choice."],
            ["Fieldcraft", "Once per turn, spend 1 Intel to ignore a printed Territory effect affecting you, your movement, or your battle until end of turn."],
            ["Special Operation", "When Progress exceeds opposing controlled Territories, start an eligible Mission card as the Special Operation; satisfy it later and pay the final Intel cost to win."]
          ]
        },
        {
          id: "spymaster",
          name: "Spymaster",
          tagline: "Information never rests. Momentum is the weapon.",
          role: "Mission tempo · Network command · Coordination",
          rules: [
            ["Missions", "Complete normal Missions for 1 Operation Progress and Intel equal to the Mission card's value."],
            ["Surveillance", "Once per battle, spend 1 Intel to inspect one opposing face-down hand commitment or Battle Hand choice."],
            ["Mission Control", "Once per turn after completing a normal Mission, start another normal Mission from hand without using an Action Opportunity. It cannot complete that turn."],
            ["Special Operation", "When Progress exceeds opposing controlled Territories, start an eligible Mission card as the Special Operation; satisfy it later and pay the final Intel cost to win."]
          ]
        }
      ]
    },
    {
      id: "mystics",
      name: "Mystics",
      status: "ready",
      identity: "Rites, sacrifice, Graveyard transformation, and Arcane cards.",
      resource: "No faction resource; progression is tracked through completed Rites",
      victory: "Ritual: complete all three Rites, or run the Gauntlet.",
      leaders: [
        {
          id: "alchemist",
          name: "Alchemist",
          tagline: "Nothing is fixed. Everything can be transformed.",
          role: "Sacrifice sequencing · Card conversion · Transformation",
          rules: [
            ["Rites", "During the Action Opportunity after movement, begin one incomplete Rite instead of playing a card for its Action effect. You may have only one begun Rite."],
            ["Materia Prima", "The first qualifying sacrifice from hand during your turn draws one replacement card; if it occurs during battle, draw after the battle."],
            ["Invocation", "After your first Rite, once per turn when you use an Arcane card for its Action or Battle effect, move one card from your Graveyard to your Discard Pile."],
            ["Transmutation", "After your second Rite, once per turn before dice, put one hand card in your Graveyard and add its value to your battle total."],
            ["Ritual", "Complete all three Rites to win immediately."]
          ]
        },
        {
          id: "spirit-walker",
          name: "Spirit Walker",
          tagline: "The spirits remember what the living abandon.",
          role: "Ritual endurance · Protective sacrifice · Graveyard communion",
          rules: [
            ["Rites", "During the Action Opportunity after movement, begin one incomplete Rite instead of playing a card for its Action effect. You may have only one begun Rite."],
            ["Guardians of the Circle", "The first battle-loss interruption during your turn may be prevented by putting one Arcane card from hand in your Graveyard, unless a continuing position requirement is no longer satisfied."],
            ["Invocation", "After your first Rite, once per turn when you use an Arcane card for its Action or Battle effect, move one card from your Graveyard to your Discard Pile."],
            ["Transmutation", "After your second Rite, once per turn before dice, put one hand card in your Graveyard and add its value to your battle total."],
            ["Ritual", "Complete all three Rites to win immediately."]
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
      victory: "Purification: after the opponent's normal Draw step, both their Draw Pile and Discard Pile were empty.",
      leaders: [
        {
          id: "grand-inquisitor",
          name: "Grand Inquisitor",
          tagline: "We judge. We purge.",
          role: "Judgment · Purge · Permanent removal",
          rules: [
            ["Conviction", "The first time each turn opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction, up to 4."],
            ["Condemnation", "Opposing cards used from Battle Hands go to the Graveyard during cleanup."],
            ["Final Judgment", "Once per turn after winning a battle, Purge immediately without an Action Opportunity and reduce its cost by 1, minimum 1."],
            ["Purification", "After the opponent's normal Draw step, if they drew no card because their Draw Pile and Discard Pile were empty, you win."]
          ]
        },
        {
          id: "witch-hunter",
          name: "Witch Hunter",
          tagline: "You ran. I followed.",
          role: "Defense · Pursuit · Exposure",
          rules: [
            ["Conviction", "The first time each turn opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction, up to 4."],
            ["Condemnation", "Opposing cards used from Battle Hands go to the Graveyard during cleanup."],
            ["Relentless Pursuit", "Once per turn after defeating an attacking opponent, spend 2 Conviction to end their turn and move one position toward their end of the Gauntlet; resolve any resulting battle immediately."],
            ["Purification", "After the opponent's normal Draw step, if they drew no card because their Draw Pile and Discard Pile were empty, you win."]
          ]
        }
      ]
    }
  ];

  auditedFactions.forEach(faction => {
    const existingIndex = FACTIONS.findIndex(item => item.id === faction.id);
    if (existingIndex >= 0) FACTIONS.splice(existingIndex, 1, faction);
    else FACTIONS.push(faction);
  });
})();
