(() => {
  const STORAGE_KEY = "gauntlet_standalone_onboarding_v1";

  const FACTION_PRESENTATION = Object.freeze({
    military: {
      name: "Military",
      summary: "Win battles and keep the pressure on.",
      lesson: {
        title: "Military: win battles, then spend the momentum.",
        intro: "Military adds one small resource: Command. The first time you win a battle each turn, gain 1 Command, up to 2. Spend Command on the three Orders printed on your Leader.",
        steps: [
          "Play normal Gauntlet until you win a battle. That first win gives you 1 Command—even if it happens while defending on the opponent's turn.",
          "Watch your Leader Card for the moments when an Order can be used. Orders spend Command to move farther, strengthen a battle, push an enemy farther back, or secure ground.",
          "Command caps at 2, so it is meant to be spent. Turn wins into immediate battlefield advantage instead of saving it forever."
        ],
        victory: "Military has no separate alternate victory. Everything it does helps you Run the Gauntlet: capture the Territory at the opponent's end or win their Last Stand."
      },
      leaders: [
        {
          id: "general",
          name: "General",
          portrait: "/images/general.png",
          summary: "Attack and keep advancing.",
          ability: "The General's Orders are about attack and tempo: move farther, strengthen a battle you started, or keep advancing after an attacking win.",
          firstGame: [
            "Look for battles you can start on favorable terms; the General wants to be the attacker.",
            "Spend Command to turn one good turn into more movement or another fight instead of sitting at the 2-Command cap.",
            "After an attacking win, check whether Rout can keep the pressure going before the opponent recovers."
          ]
        },
        {
          id: "commandant",
          name: "Commandant",
          portrait: "/images/commandant.png",
          summary: "Defend, punish attacks, and counterattack.",
          ability: "The Commandant's Orders are about defense and counterattack: strengthen a defense, drive a failed attacker farther back, and turn a well-held enemy position into progress.",
          firstGame: [
            "Do not feel obligated to rush forward. A strong position can make the opponent attack into you.",
            "Save Command for the defensive battle that matters; Entrench and Repel make a failed attack hurt.",
            "Once defense creates space, use the opening to counterattack or secure the ground you are already holding."
          ]
        }
      ]
    },

    diplomats: {
      name: "Diplomats",
      summary: "Make deals and force difficult choices.",
      lesson: {
        title: "Diplomats: turn battles into negotiations.",
        intro: "Diplomats add Influence and Proposals. When a battle is about to begin, you can offer Terms before either player commits battle cards. Your opponent can accept the deal or refuse it and fight.",
        steps: [
          "You begin with 1 Influence. An eligible Proposal tells you what you may offer, how much Influence is at stake, and what happens if the opponent accepts or refuses.",
          "If the opponent accepts, the battle does not happen and the agreement resolves. If they refuse, the battle continues, and the refusal can give you leverage or make the fight more costly for them.",
          "Accepted or successfully imposed Proposals can become ratified Treaty Articles. Each different Article is visible progress toward your political victory."
        ],
        victory: "Diplomats can still win by running the Gauntlet. They also win at the start of their turn, after Capture, if they have six different ratified Proposals forming the Peace Treaty."
      },
      leaders: [
        {
          id: "ambassador",
          name: "Ambassador",
          portrait: "/images/ambassador.png",
          summary: "Reward accepted deals and keep cards flowing.",
          ability: "Once per turn, when the opponent accepts your Terms, the Ambassador draws a card. Agreements help advance the Treaty without starving your Hand.",
          firstGame: [
            "Begin with low-Stake Proposals that are genuinely tempting to accept.",
            "Vary the Proposals you offer; accepted agreements advance your political plan and keep cards flowing.",
            "Use battlefield pressure so refusing is not obviously safe. The best offer is one where either answer helps you."
          ]
        },
        {
          id: "senator",
          name: "Senator",
          portrait: "/images/senator.png",
          summary: "Take bigger political risks and recover from refusals.",
          ability: "When refused Terms lead to a battle loss, the Senator can sacrifice cards from Hand to recover Influence that would otherwise be lost.",
          firstGame: [
            "Keep cards in Hand before staking a lot of Influence; those cards are your insurance if the negotiation turns into a lost battle.",
            "Take larger risks when the payoff matters. The Senator can absorb a bad result better than the Ambassador.",
            "Make repeated refusals increasingly uncomfortable, but do not risk all of your Influence on one offer."
          ]
        }
      ]
    },

    financiers: {
      name: "Financiers",
      summary: "Build wealth and turn it into control.",
      lesson: {
        title: "Financiers: turn cards into money, then money into property.",
        intro: "Financiers add an economy to the battlefield. Capital is money you spend, Treasury is where you store cards to increase how much Capital you can keep, and Deeds represent ownership of Territories.",
        steps: [
          "Put cards you can afford to delay into Treasury. The Territories you control plus the value in Treasury determine how much Capital you can keep.",
          "Spend Capital to buy Deeds or power faction effects. Each Deed you own produces more Capital at the start of your turn after Capture, so ownership helps fund more ownership.",
          "As your Treasury grows, your faction reference may give you an extra Action through Financial Capacity. You do not need to memorize that rule now—check the reference when your economy gets large enough."
        ],
        victory: "Financiers can run the Gauntlet normally. They also win immediately through Controlling Interest if they own the Deed to every Territory currently in the Gauntlet."
      },
      leaders: [
        {
          id: "banker",
          name: "Banker",
          portrait: "/images/banker.png",
          summary: "Use credit and collateral to buy property sooner.",
          ability: "On the first Deed purchase or buyout of the turn, the Banker can use one card from Hand or Treasury as collateral for part of the price, then pay the rest with Capital.",
          firstGame: [
            "Put cards you can afford to delay into Treasury early; that grows what you can finance.",
            "Use Line of Credit to reach an important Deed before your Capital alone could pay for it.",
            "Do not spend every point of Capital just because you can. Leave yourself enough flexibility for the next purchase or important faction effect."
          ]
        },
        {
          id: "executive",
          name: "Executive",
          portrait: "/images/executive.png",
          summary: "Turn battlefield occupation directly into ownership.",
          ability: "After winning as the attacker and occupying an enemy Territory, the Executive can spend an Action to buy that Territory's Deed. If it is the next Territory your side could normally capture, the purchase can capture it immediately.",
          firstGame: [
            "Plan attacks around Territories whose Deeds you can actually afford.",
            "Keep Capital or collateral available before you attack; a win is strongest when you can buy immediately afterward.",
            "Look for turns where one attack gives you both battlefield position and property. The Executive wants those two systems to move together."
          ]
        }
      ]
    },

    intelligence: {
      name: "Intelligence",
      summary: "Complete hidden objectives and disrupt plans.",
      lesson: {
        title: "Intelligence: give yourself a secret objective.",
        intro: "Intelligence adds face-down Missions and a resource called Intel. Start a Mission, play normal Gauntlet while satisfying its hidden requirement, then spend an Action on a later turn to complete it.",
        steps: [
          "Keep one normal Mission in progress face down. Your opponent knows a Mission exists, but not what you are trying to accomplish.",
          "Completed Missions give you Intel and Operation Progress. Spend Intel to inspect an opponent's hidden battle card; with enough Intel, you can remove that choice from the battle and force a replacement.",
          "As Operation Progress grows, you can eventually prepare a face-down Special Operation. Satisfy its requirement and pay its Intel cost to complete it."
        ],
        victory: "Intelligence can win by running the Gauntlet. Once your Operation Progress exceeds the number of Territories the opponent controls, you can work toward a Special Operation; complete it and pay its Intel cost to win."
      },
      leaders: [
        {
          id: "ranger",
          name: "Ranger",
          portrait: "/images/ranger.png",
          summary: "Use terrain and information to keep operations on track.",
          ability: "Once per turn, the Ranger can spend 1 Intel to ignore a Territory's printed effect when it would interfere with you, your movement, or your battle.",
          firstGame: [
            "Choose Missions that line up with movement and battles you already want to take.",
            "Save Intel when a Territory effect would block a key move or operation; do not spend it just because it is available.",
            "Use Surveillance and Interference when a hidden card truly threatens a decisive Mission or attack."
          ]
        },
        {
          id: "spymaster",
          name: "Spymaster",
          portrait: "/images/spymaster.png",
          summary: "Chain Missions together quickly.",
          ability: "Once per turn, after completing a normal Mission, the Spymaster can immediately begin another eligible Mission from Hand without spending an Action.",
          firstGame: [
            "Before completing your current Mission, try to have the next eligible Mission already in Hand.",
            "Chain Missions so Mission Control never wastes its free start.",
            "Think one Mission ahead and preserve enough Intel for the Special Operation instead of spending everything on interference."
          ]
        }
      ]
    },

    mystics: {
      name: "Mystics",
      summary: "Build combinations and work toward powerful rituals.",
      lesson: {
        title: "Mystics: complete Rites while playing the normal game.",
        intro: "Mystics add three public Rites. Each Rite is a longer objective you begin now and complete later while still playing normal Gauntlet. Completing Rites gradually unlocks more of the faction.",
        steps: [
          "For your first turns, focus on one Rite whose requirement fits your cards or battlefield position. Do not try to memorize the whole Rite progression at once.",
          "When you complete your first Rite, read the ability it unlocks on your faction reference and start using it from then on. Do the same after your second Rite.",
          "After all three Rites are complete, your faction reference explains the Ritual of Ascension and the final battle you need to win for the alternate victory."
        ],
        victory: "Mystics can run the Gauntlet normally. Complete all three Rites to unlock the Ritual of Ascension; when you reach that point, follow the faction reference to begin the Ritual and win the required battle."
      },
      leaders: [
        {
          id: "alchemist",
          name: "Alchemist",
          portrait: "/images/alchemist.png",
          summary: "Turn sacrifices into replacement cards and combinations.",
          ability: "The first qualifying card the Alchemist deliberately sacrifices from Hand on your turn is replaced by drawing a card. Your Leader Card tells you which sacrifices qualify.",
          firstGame: [
            "Do not think of the Graveyard as only a place for lost cards; Mystics can make use of cards there later.",
            "When a Rite or Arcane effect asks you to sacrifice from Hand, try to make that your first qualifying sacrifice so Materia Prima replaces it.",
            "Focus on the Rite that best matches your current cards or battlefield position instead of trying to advance all three at once."
          ]
        },
        {
          id: "spirit-walker",
          name: "Spirit Walker",
          portrait: "/images/spirit%20walker.png",
          summary: "Protect your Rites while they build.",
          ability: "The first time on your turn that losing a battle would interrupt a Rite or Ritual in progress, the Spirit Walker can sacrifice a sufficiently valuable Arcane card from Hand to protect that progress.",
          firstGame: [
            "Begin a Rite early when you can support its condition instead of waiting for a perfect setup.",
            "Once a Rite can be broken by a battle loss, keep a useful Arcane card in Hand as insurance.",
            "You can take a calculated battle risk that another Mystic might avoid because Guardians of the Circle can preserve your progress once per turn."
          ]
        }
      ]
    },

    inquisition: {
      name: "Inquisition",
      summary: "Permanently strip away the opponent's resources.",
      lesson: {
        title: "Inquisition: make the opponent's battle cards stay gone.",
        intro: "Normally, Tactics return to the Discard Pile and may be drawn again later. The Inquisition's Condemnation sends opposing Tactics to the Graveyard instead, making those cards permanent losses.",
        steps: [
          "The first time each turn opposing cards enter the Graveyard during the aftermath of a battle involving you, gain 1 Conviction, up to 4. You can gain it even when you lost the battle.",
          "Spend Conviction on Purge to send more of the opponent's resources—such as Assets, cards in Hand, or cards they could draw again—to the Graveyard.",
          "The longer this continues, the fewer recoverable cards the opponent has. Ordinary battles become an attrition engine even when the battlefield itself is not moving."
        ],
        victory: "Inquisition can run the Gauntlet normally. It also wins by Purification if the opponent reaches the start of their turn unable to draw because both their Draw Pile and Discard Pile are empty."
      },
      leaders: [
        {
          id: "grand-inquisitor",
          name: "Grand Inquisitor",
          portrait: "/images/grand%20inquisitor.png",
          summary: "Turn battle wins into efficient Purges.",
          ability: "Once per turn after winning a battle, the Grand Inquisitor can immediately Purge without spending an Action and at a reduced Conviction cost.",
          firstGame: [
            "Build some Conviction before committing to a major Purge.",
            "Choose battles you can win when possible; each victory opens a discounted immediate Purge.",
            "After a win, remove the resource that will hurt the opponent's next few turns most rather than spending Conviction on a low-impact target."
          ]
        },
        {
          id: "witch-hunter",
          name: "Witch Hunter",
          portrait: "/images/witch%20hunter.png",
          summary: "Punish failed attacks with immediate pursuit.",
          ability: "After the opponent attacks you and loses, the Witch Hunter can spend 2 Conviction to end their turn immediately and advance one position, possibly starting a counterattack.",
          firstGame: [
            "Try to keep 2 Conviction available when the opponent is likely to attack.",
            "Defend positions that force the opponent to commit. A failed attack can become your counterattack before their turn even finishes.",
            "Use the immediate advance when the counterattack is favorable; you do not have to pursue every time."
          ]
        }
      ]
    }
  });

  let currentAuthority = null;
  let FACTIONS = Object.freeze({});

  const state = {
    factionId: "",
    leaderId: "",
    starterDecks: [],
    starterLoadError: null
  };

  const el = {};
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    for (const id of [
      "leaderFieldset", "leaderPrompt", "leaderChoices", "selectedHeading", "selectedSummary",
      "starterPreview", "factionLessonEmpty", "factionLesson", "factionLessonEyebrow",
      "factionLessonTitle", "factionLessonIntro", "factionLessonSteps", "factionLessonVictory",
      "leaderLessonTitle", "leaderLessonAbility", "leaderLessonTips", "factionGuideLink",
      "printForm", "printSelectionHeading", "printSelectionCopy", "openStarterDeck", "printStatus"
    ]) el[id] = document.getElementById(id);

    document.querySelectorAll('input[name="faction"]').forEach(input => {
      input.addEventListener("change", () => selectFaction(input.value));
    });
    el.printForm.addEventListener("submit", openGuidedDeckbuilder);
    installTrackedPlaytestAction();

    await loadCurrentAuthority();
    restoreState();
    renderChoice();
    await loadStarterDecks();
    renderChoice();
  }

  function installTrackedPlaytestAction() {
    if (!el.openStarterDeck || document.getElementById("startTrackedPlaytest")) return;
    const panel = document.createElement("div");
    panel.className = "tracked-playtest-start";
    panel.style.cssText = "margin-top:1rem;padding-top:1rem;border-top:1px solid var(--start-line)";
    panel.innerHTML = `
      <p style="margin:.1rem 0 .75rem;line-height:1.5"><strong>Track this playtest</strong><br><span style="color:#59625f">Create one tracked game, share the join link with your opponent, and record the result and separate player feedback.</span></p>
      <button id="startTrackedPlaytest" class="button primary" type="button" disabled>Create tracked playtest</button>`;
    el.openStarterDeck.after(panel);
    el.startTrackedPlaytest = document.getElementById("startTrackedPlaytest");
    el.startTrackedPlaytest.addEventListener("click", openTrackedPlaytest);
  }

  function selectFaction(factionId, preferredLeader = "") {
    const faction = FACTIONS[factionId];
    state.factionId = faction ? factionId : "";
    state.leaderId = faction?.leaders.some(leader => leader.id === preferredLeader)
      ? preferredLeader
      : "";
    renderChoice();
    saveState();
    el.leaderFieldset?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderChoice() {
    const focusedLeaderId = document.activeElement instanceof HTMLInputElement
      && document.activeElement.name === "leader"
      && el.leaderChoices.contains(document.activeElement)
      ? document.activeElement.value
      : "";
    const faction = FACTIONS[state.factionId];

    document.querySelectorAll('input[name="faction"]').forEach(input => {
      input.checked = input.value === state.factionId;
    });

    if (!faction) {
      el.leaderFieldset.disabled = true;
      el.leaderPrompt.textContent = "Choose a faction first.";
      el.leaderChoices.replaceChildren();
      el.selectedHeading.textContent = "Choose a faction and Leader.";
      el.selectedSummary.textContent = "Your ready-made first-game Deck will appear here.";
      renderStarterPreview(null);
      renderFactionLesson(null, null);
      syncPrintAction();
      return;
    }

    el.leaderFieldset.disabled = false;
    el.leaderPrompt.textContent = `Choose how you want to lead ${faction.name}.`;
    el.leaderChoices.replaceChildren();

    faction.leaders.forEach(leader => {
      const label = document.createElement("label");
      label.className = "leader-choice";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "leader";
      input.value = leader.id;
      input.checked = state.leaderId === leader.id;
      input.addEventListener("change", () => {
        state.leaderId = leader.id;
        saveState();
        renderChoice();
      });

      const portrait = document.createElement("img");
      portrait.className = "leader-portrait";
      portrait.src = leader.portrait;
      portrait.alt = "";
      portrait.loading = "lazy";
      portrait.decoding = "async";

      const copy = document.createElement("span");
      copy.className = "leader-copy";
      const name = document.createElement("strong");
      name.textContent = leader.name;
      const summary = document.createElement("small");
      summary.textContent = leader.summary;
      copy.append(name, summary);
      label.append(input, portrait, copy);
      el.leaderChoices.append(label);
    });

    const leader = selectedLeader();
    el.selectedHeading.textContent = leader
      ? `${leader.name} of the ${faction.name}`
      : `${faction.name} selected — choose a Leader.`;
    el.selectedSummary.textContent = leader
      ? `${faction.summary} ${leader.summary}`
      : faction.summary;

    renderStarterPreview(selectedStarterDeck());
    renderFactionLesson(faction, leader);
    syncPrintAction();
    if (focusedLeaderId && focusedLeaderId === state.leaderId) focusSelectedLeader(focusedLeaderId);
  }

  function renderFactionLesson(faction, leader) {
    if (!faction?.lesson) {
      el.factionLessonEmpty.hidden = false;
      el.factionLesson.hidden = true;
      return;
    }

    el.factionLessonEmpty.hidden = true;
    el.factionLesson.hidden = false;
    el.factionLessonEyebrow.textContent = `${faction.name} · your extra system`;
    el.factionLessonTitle.textContent = faction.lesson.title;
    el.factionLessonIntro.textContent = faction.lesson.intro;
    el.factionLessonVictory.textContent = faction.lesson.victory;
    el.factionGuideLink.href = `../factions/${state.factionId}/`;
    el.factionGuideLink.textContent = `Open the full ${faction.name} guide ↗`;

    el.factionLessonSteps.replaceChildren(...faction.lesson.steps.map(step => {
      const item = document.createElement("li");
      item.textContent = step;
      return item;
    }));

    if (!leader) {
      el.leaderLessonTitle.textContent = "Choose a Leader above.";
      el.leaderLessonAbility.textContent = "The faction system stays the same, but the two Leaders can push you toward very different priorities.";
      el.leaderLessonTips.replaceChildren();
      return;
    }

    el.leaderLessonTitle.textContent = `${leader.name}: what to focus on`;
    el.leaderLessonAbility.textContent = leader.ability;
    el.leaderLessonTips.replaceChildren(...leader.firstGame.map(tip => {
      const item = document.createElement("li");
      item.textContent = tip;
      return item;
    }));
  }

  function focusSelectedLeader(leaderId) {
    const target = [...el.leaderChoices.querySelectorAll('input[name="leader"]')]
      .find(input => input.value === leaderId);
    target?.focus({ preventScroll: true });
  }

  async function loadCurrentAuthority() {
    const response = await fetch("../game-data/current-game.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Current-game authority returned ${response.status}.`);
    const authority = await response.json();
    if (authority?.schemaVersion !== 2 || authority?.authority !== "current-game" || !authority?.version) {
      throw new Error("Start Playing requires the complete current-game authority.");
    }
    if (!Array.isArray(authority.gameplay?.factions) || !Array.isArray(authority.leaders)) {
      throw new Error("Current-game authority is missing factions or Leaders.");
    }
    currentAuthority = authority;

    FACTIONS = Object.freeze(Object.fromEntries(authority.gameplay.factions.map(faction => {
      const presentation = FACTION_PRESENTATION[faction.id] || {};
      const leaders = authority.leaders
        .filter(leader => leader.faction === faction.id)
        .map(leader => {
          const copy = presentation.leaders?.find(item => item.id === leader.id) || {};
          return Object.freeze({
            id: leader.id,
            name: leader.name,
            portrait: leader.image || copy.portrait || "",
            summary: copy.summary || leader.note || "",
            ability: copy.ability || "",
            firstGame: Object.freeze(copy.firstGame || [])
          });
        });

      return [faction.id, Object.freeze({
        name: faction.name,
        summary: presentation.summary || "",
        lesson: presentation.lesson || null,
        leaders: Object.freeze(leaders)
      })];
    })));
  }

  async function loadStarterDecks() {
    try {
      const data = currentAuthority?.starterDecks;
      if (!data || !Array.isArray(data.decks)) {
        throw new Error("Current-game authority did not provide starter Deck data.");
      }
      state.starterDecks = data.decks;
      state.starterLoadError = null;
    } catch (error) {
      console.error(error);
      state.starterLoadError = error;
    }
  }

  function selectedLeader() {
    const faction = FACTIONS[state.factionId];
    return faction?.leaders.find(leader => leader.id === state.leaderId) || null;
  }

  function selectedStarterDeck() {
    return state.starterDecks.find(deck =>
      deck.factionId === state.factionId && deck.leaderId === state.leaderId
    ) || null;
  }

  function renderStarterPreview(deck) {
    if (state.starterLoadError) {
      el.starterPreview.className = "starter-preview empty-state";
      el.starterPreview.textContent = "The starter Deck preview could not be loaded. You can still continue after choosing a Leader.";
      return;
    }
    if (!state.starterDecks.length) {
      el.starterPreview.className = "starter-preview empty-state";
      el.starterPreview.textContent = "Loading the starter Deck library…";
      return;
    }
    if (!deck) {
      el.starterPreview.className = "starter-preview empty-state";
      el.starterPreview.textContent = state.leaderId
        ? "No matching starter Deck was found."
        : "Gauntlet lets you build your own Deck from a large pool of cards. For a first game, choose a Leader and we'll select a pre-built recommended starter Deck for you.";
      return;
    }

    el.starterPreview.className = "starter-preview";
    el.starterPreview.innerHTML = `
      <p class="eyebrow">Recommended first-game Deck</p>
      <h4>${escapeHtml(deck.name)}</h4>
      <div class="starter-meta"><span>${Number(deck.cardCount) || 30} cards</span><span>Pre-built</span></div>
      <p>Gauntlet players can build their own Decks from a large pool of cards. For your first game, this recommended Deck is already built for your chosen Leader so you can learn the game before learning deckbuilding.</p>`;
  }

  function syncPrintAction() {
    const faction = FACTIONS[state.factionId];
    const leader = selectedLeader();
    const deck = selectedStarterDeck();
    const complete = Boolean(faction && leader);

    el.openStarterDeck.disabled = !complete;
    if (el.startTrackedPlaytest) el.startTrackedPlaytest.disabled = !complete;
    el.printSelectionHeading.textContent = faction && leader
      ? `${leader.name} of the ${faction.name}`
      : "Choose a faction and Leader first.";
    el.printSelectionCopy.textContent = faction && leader
      ? deck
        ? `${deck.name} will load automatically in the Deckbuilder. Your choice is saved in this browser.`
        : "The matching starter Deck will load automatically in the Deckbuilder. Your choice is saved in this browser."
      : "Your selection is saved in this browser as you work.";
  }

  function openGuidedDeckbuilder(event) {
    event.preventDefault();
    const faction = FACTIONS[state.factionId];
    const leader = selectedLeader();
    if (!faction || !leader) {
      setStatus("Choose a faction and Leader before continuing.", "error");
      document.getElementById("choose")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    saveState();
    const url = new URL("../deckbuilder/", window.location.href);
    url.searchParams.set("faction", state.factionId);
    url.searchParams.set("leader", state.leaderId);
    url.searchParams.set("starter", "1");
    url.searchParams.set("source", "start");
    window.location.assign(url.href);
  }

  function openTrackedPlaytest() {
    const faction = FACTIONS[state.factionId];
    const leader = selectedLeader();
    if (!faction || !leader) {
      setStatus("Choose a faction and Leader before tracking a game.", "error");
      return;
    }
    saveState();
    const url = new URL("../playtest/tracked/", window.location.href);
    const currentParams = new URLSearchParams(window.location.search);
    url.searchParams.set("source", "start");
    const mode = currentParams.get("mode");
    if (mode === "physical" || mode === "tts") url.searchParams.set("mode", mode);
    window.location.assign(url.href);
  }

  function restoreState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return;
      if (FACTIONS[saved.factionId]) state.factionId = saved.factionId;
      const faction = FACTIONS[state.factionId];
      if (faction?.leaders.some(leader => leader.id === saved.leaderId)) state.leaderId = saved.leaderId;
    } catch {
      // A damaged local preference should not block onboarding.
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        factionId: state.factionId,
        leaderId: state.leaderId,
        updatedAt: new Date().toISOString()
      }));
    } catch {
      // The flow remains usable when browser storage is unavailable.
    }
  }

  function setStatus(message, kind = "") {
    el.printStatus.textContent = message;
    el.printStatus.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
