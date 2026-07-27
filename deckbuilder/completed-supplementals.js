(() => {
  const packages = window.GAUNTLET_V06_SUPPLEMENTALS || (window.GAUNTLET_V06_SUPPLEMENTALS = {});

  packages.mystics = {
    summary: [
      "Selected Leader Card",
      "Mystics Reference",
      "Three double-sided Rite cards"
    ],
    leaderImages: {
      alchemist: "https://tymonius.github.io/Gauntlet/images/leader-cards/alchemist.svg",
      "spirit-walker": "https://tymonius.github.io/Gauntlet/images/leader-cards/spirit-walker.svg"
    },
    components: [
      {
        type: "reference",
        id: "mystics-reference",
        title: "Mystics Reference",
        sections: [
          { label: "Setup", text: "Place the three Rites incomplete side up. Completed Rites remain public and cannot be begun again." },
          { label: "Begin", text: "During the Action phase after movement, instead of an Action card, begin one incomplete Rite and pay its cost. Only one Rite may be begun at a time." },
          { label: "Timing", text: "A Rite cannot complete on the turn it begins. Complete at most one Rite per turn. If interrupted, reset it; paid costs are not returned." },
          { label: "Progress", text: "First Rite: unlock Invocation. Second Rite: unlock Transmutation. Third Rite: immediately win by Ritual." },
          { label: "Invocation", text: "Once per turn, when you play an Arcane card, you may move one card from your Graveyard to your discard pile." },
          { label: "Transmutation", text: "Once per turn before dice in a battle involving you, send one hand card to your Graveyard and add its value to your battle total. This is neither a hand commitment nor a battle-drawn play." },
          { label: "Bound cards", text: "Bound cards are outside all normal zones and move only as instructed. If their effect ends without a destination, place them in their owner's Graveyard." }
        ]
      }
    ],
    rites: [
      {
        name: "Rite of Echoes",
        icon: "◉",
        beginning: "Bind one chosen card from your Graveyard face up beneath this Rite. Then bind one card from your hand face down beneath it whose title matches at least one other card in your constructed deck.",
        completion: "On a later turn, complete this Rite when you play another card with the bound hand card's title during battle.",
        result: "Move the selected Graveyard card to your discard pile. Place the bound hand card in your Graveyard. The completing card resolves normally.",
        interruption: "If you lose a battle first, place both bound cards in your Graveyard and reset this Rite."
      },
      {
        name: "Rite of Blood",
        icon: "◆",
        beginning: "Send one card from your hand to your Graveyard.",
        completion: "On a later turn, complete this Rite when you win a battle without committing a card from hand and without playing a battle-drawn card.",
        result: "Transmutation, Assets, Overlays, Territory effects, leader abilities, and cards played from the Graveyard do not by themselves prevent completion.",
        interruption: "If you lose a battle first, reset this Rite."
      },
      {
        name: "Rite of Crossing",
        icon: "✦",
        requirement: "Begin only after winning a battle that causes you to occupy a Territory the opponent controlled immediately before that battle.",
        beginning: "Send one Arcane card from your hand to your Graveyard. If you have none, reveal your hand and send one Arcane card from your discard pile to your Graveyard instead.",
        completion: "At the beginning of your next turn, after captures, complete this Rite if you still occupy or control that Territory.",
        interruption: "Otherwise, reset this Rite. Heartlands do not count."
      }
    ]
  };

  packages.intelligence = {
    summary: [
      "Selected Leader Card",
      "Mission Reference",
      "Operations Reference",
      "Intel sliding tracker",
      "Operation Progress sliding tracker"
    ],
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
          { label: "Start", text: "After movement, instead of an Action card, place it face down as the Active Mission. Only one Active Mission; it cannot complete that turn." },
          { label: "Complete", text: "After movement, reveal a satisfied Active Mission instead of an Action card. Gain 1 Operation Progress and Intel equal to its value; discard it." },
          { label: "Abort", text: "After movement, reveal it and spend Intel equal to its value; discard it. Aborting is not failure." },
          { label: "Fail", text: "Opponent disruption, compromised game state, or a specific effect. Reveal it and place it in your Graveyard." },
          { label: "Special Operation", text: "Progress must exceed opposing controlled Territories. Use an eligible Mission card, maintain readiness, satisfy its requirement later, then pay Territories in the Gauntlet minus card value, minimum 1 Intel, to win." }
        ]
      },
      {
        type: "reference",
        id: "intelligence-operations-reference",
        title: "Operations Reference",
        sections: [
          { label: "Commitment order", text: "Attacker commits from hand, then defender. Attacker selects from battle draw, then defender." },
          { label: "Surveillance — 1 Intel", text: "Once per battle, when the opponent commits or selects a face-down Battle card, look at it before the battle proceeds." },
          { label: "Interference — +2 Intel", text: "After Surveillance, remove that card from the battle. The opponent may choose another legal card from the same source." },
          { label: "Hand source", text: "Return the commitment to hand." },
          { label: "Battle-draw source", text: "Return the card to that draw; it is no longer selected." },
          { label: "No replacement", text: "The opponent plays no card from that source." },
          { label: "Reminder", text: "Interference disrupts rather than destroys. It does not discard or negate the card and creates no additional response window." }
        ]
      },
      {
        type: "tracker",
        id: "intelligence-intel-tracker",
        title: "Intel Tracker",
        note: "Place beneath the Operations Reference Card. Fully cover at 0. Slide the Reference upward until its bottom edge aligns with current Intel. Printed range: 0–20.",
        zeroLabel: "0 — Fully covered",
        compact: true,
        steps: Array.from({ length: 20 }, (_, index) => ({
          value: index + 1,
          label: (index + 1) % 5 === 0 ? "Intel" : "",
          position: (index + 1) * 0.15
        }))
      },
      {
        type: "tracker",
        id: "intelligence-operation-progress-tracker",
        title: "Operation Progress",
        note: "Place beneath the Mission Reference Card. Fully cover at 0. Slide the Reference upward until its bottom edge aligns with current Operation Progress. Printed range: 0–8.",
        zeroLabel: "0 — Fully covered",
        steps: Array.from({ length: 8 }, (_, index) => ({
          value: index + 1,
          label: "Progress",
          position: (index + 1) * 0.36
        }))
      }
    ]
  };
})();
