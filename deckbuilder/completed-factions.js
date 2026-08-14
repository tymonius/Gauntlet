(() => {
  SOURCES.mystics = {
    label: "Mystics",
    path: "../releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md",
    start: "# 8. Canonical Mystics card pool",
    end: "# 9. Quick reference",
    headingLevel: 2
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
            ["Onward — 1 Command", "During your Movement step, before a battle begins, move one additional position. This movement may start a battle."],
            ["Rally — 1 Command", "Before dice are rolled in a battle you initiated, add +1 to your battle total."],
            ["Rout — 2 Command", "At the end of the Aftermath of a battle you initiated and won, advance one position. This movement may start another battle."]
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
            ["Repel — 1 Command", "During the Aftermath of a battle you did not initiate and won, after the opponent's normal retreat, they retreat one additional position, if able."],
            ["Fortify — 2 Command", "During the Aftermath of a battle you won while occupying an enemy-controlled Territory, capture that Territory."]
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
          role: "Agreement · Card flow · Terms",
          rules: [
            ["Setup", "Begin with 1 Influence and all nine Proposals Proposal side up."],
            ["Terms", "During opening effects, offer one Proposal and stake the required Influence. Accepted Terms prevent the pending battle."],
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
            ["Terms", "During opening effects, offer one Proposal and stake the required Influence. Accepted Terms prevent the pending battle."],
            ["Leverage", "Before dice following refused Terms, spend available Influence for +1 battle total each."],
            ["Political Capital", "Once per turn, when a refused battle loss would cost staked Influence, put cards from Hand in your Graveyard to recover 1 staked Influence per card."],
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
            ["Capital limit", "Territories you control plus the total card value in your Treasury."],
            ["Financial Capacity", "After the Capture step, if Treasury value exceeds Territories controlled, gain 1 additional Action that turn; if both Actions are spent, one must be spent on a Financier Faction Action."],
            ["Treasury", "During an Action Opportunity after movement, spend 1 Action to place one card from Hand face up in Treasury."],
            ["Line of Credit", "The first Deed purchase or buyout each turn may use one Hand or Treasury card as collateral, contributing up to half the purchase cost, rounded down."],
            ["Controlling Interest", "Immediately win when you own every Deed currently in the Gauntlet."]
          ]
        },
        {
          id: "executive",
          name: "Executive",
          tagline: "Take the ground. Close the deal.",
          role: "Offense · Occupation · Immediate control",
          rules: [
            ["Capital limit", "Territories you control plus the total card value in your Treasury."],
            ["Financial Capacity", "After the Capture step, if Treasury value exceeds Territories controlled, gain 1 additional Action that turn; if both Actions are spent, one must be spent on a Financier Faction Action."],
            ["Treasury", "During an Action Opportunity after movement, spend 1 Action to place one card from Hand face up in Treasury."],
            ["Hostile Takeover", "During an Action Opportunity after movement, after winning as the attacker and becoming the occupier of that enemy Territory, spend 1 Action to buy or buy out its Deed; success gives immediate control."],
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
            ["Surveillance", "Once during the Gambit stage and once during the Tactic stage each battle, spend 1 Intel per opposing face-down card revealed."],
            ["Interference", "Immediately after revealing a card, spend 2 more Intel to return it to its source. Its owner may replace it from that source or pass."],
            ["Fieldcraft", "Once per turn, spend 1 Intel to ignore a printed Territory effect affecting you, your movement, or a battle involving you until end of turn."],
            ["Special Operation", "When Progress exceeds opposing controlled Territories, begin an eligible Mission card as a Special Operation; satisfy it and pay its Intel cost to win."]
          ]
        },
        {
          id: "spymaster",
          name: "Spymaster",
          tagline: "Information never rests. Momentum is the weapon.",
          role: "Mission tempo · Network command · Coordination",
          rules: [
            ["Missions", "Complete normal Missions for 1 Operation Progress and Intel equal to the Mission card's value."],
            ["Surveillance", "Once during the Gambit stage and once during the Tactic stage each battle, spend 1 Intel per opposing face-down card revealed."],
            ["Interference", "Immediately after revealing a card, spend 2 more Intel to return it to its source. Its owner may replace it from that source or pass."],
            ["Mission Control", "Once per turn after completing a normal Mission, start another eligible Mission from Hand without spending an Action. It cannot complete that turn and cannot be a Special Operation."],
            ["Special Operation", "When Progress exceeds opposing controlled Territories, begin an eligible Mission card as a Special Operation; satisfy it and pay its Intel cost to win."]
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
      victory: "Run the Gauntlet or complete the Ritual of Ascendance.",
      leaders: [
        {
          id: "alchemist",
          name: "Alchemist",
          tagline: "Nothing is fixed. Everything can be transformed.",
          role: "Sacrifice sequencing · Card conversion · Transformation",
          rules: [
            ["Rites", "During an Action Opportunity after movement, spend 1 Action to begin one incomplete Rite. It cannot complete that turn."],
            ["Materia Prima", "The first qualifying card put from Hand into your Graveyard during your turn draws one replacement; if this occurs in battle, draw after the Aftermath."],
            ["Invocation", "After your first Rite, once per turn when an Arcane card's Action, Gambit, Tactic, or Battle effect resolves, move one card from your Graveyard to your Discard Pile."],
            ["Transmutation", "After your second Rite, once per turn before dice, put one Hand card in your Graveyard and add its value to your battle total."],
            ["Ritual of Ascendance", "After all three Rites, bind one Arcane card from Hand, Discard Pile, and Graveyard. Initiate and win a battle while all three remain bound to win."]
          ]
        },
        {
          id: "spirit-walker",
          name: "Spirit Walker",
          tagline: "The spirits remember what the living abandon.",
          role: "Rite endurance · Protective sacrifice · Graveyard communion",
          rules: [
            ["Rites", "During an Action Opportunity after movement, spend 1 Action to begin one incomplete Rite. It cannot complete that turn."],
            ["Guardians of the Circle", "The first time on your turn a battle loss would interrupt a begun Rite or Ritual, put one Arcane card from Hand in your Graveyard whose value is at least 1 plus your completed Rites to prevent that interruption."],
            ["Invocation", "After your first Rite, once per turn when an Arcane card's Action, Gambit, Tactic, or Battle effect resolves, move one card from your Graveyard to your Discard Pile."],
            ["Transmutation", "After your second Rite, once per turn before dice, put one Hand card in your Graveyard and add its value to your battle total."],
            ["Ritual of Ascendance", "After all three Rites, bind one Arcane card from Hand, Discard Pile, and Graveyard. Initiate and win a battle while all three remain bound to win."]
          ]
        }
      ]
    },
    {
      id: "inquisition",
      name: "Inquisition",
      status: "ready",
      identity: "Conviction, Condemnation, Purge, and Purification.",
      resource: "Conviction (maximum 4)",
      victory: "Purification: the opponent's normal start-of-turn draw fails because both their Draw Pile and Discard Pile are empty.",
      leaders: [
        {
          id: "grand-inquisitor",
          name: "Grand Inquisitor",
          tagline: "We judge. We purge.",
          role: "Judgment · Purge · Permanent removal",
          rules: [
            ["Conviction", "The first time each turn opposing cards enter the Graveyard during the Aftermath of a battle involving you, gain 1 Conviction, up to 4."],
            ["Condemnation", "Opposing Tactics go to the Graveyard during the Aftermath instead of the Discard Pile."],
            ["Blasphemy", "Gain 1 Conviction when an opponent plays an Arcane card for its Action effect or an opposing Arcane Gambit or Tactic is revealed."],
            ["Final Judgment", "Once per turn during the Aftermath of a battle you won, after battle cards are cleared, Purge without spending an Action and reduce its cost by 1, minimum 1."],
            ["Purification", "Win when the opponent's normal start-of-turn draw fails because their Draw Pile and Discard Pile are empty."]
          ]
        },
        {
          id: "witch-hunter",
          name: "Witch Hunter",
          tagline: "You ran. I followed.",
          role: "Defense · Pursuit · Exposure",
          rules: [
            ["Conviction", "The first time each turn opposing cards enter the Graveyard during the Aftermath of a battle involving you, gain 1 Conviction, up to 4."],
            ["Condemnation", "Opposing Tactics go to the Graveyard during the Aftermath instead of the Discard Pile."],
            ["Blasphemy", "Gain 1 Conviction when an opponent plays an Arcane card for its Action effect or an opposing Arcane Gambit or Tactic is revealed."],
            ["Relentless Pursuit", "At the end of the Aftermath after defeating an attacking opponent, spend 2 Conviction to end their turn and move one position toward their end; any battle begins with you as attacker."],
            ["Purification", "Win when the opponent's normal start-of-turn draw fails because their Draw Pile and Discard Pile are empty."]
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
