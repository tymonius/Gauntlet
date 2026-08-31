(() => {
  const MYSTICS_RITUAL_COMPONENT_ID = "mystics-ritual-of-ascension";

  state.currentFactionComponentsReady = false;

  const baseRenderAll = renderAll;
  renderAll = function renderAllWithFactionComponents() {
    baseRenderAll();
    renderFactionComponents();
  };

  document.addEventListener("DOMContentLoaded", installFactionComponentDisplay);

  async function installFactionComponentDisplay() {
    const territoryList = document.getElementById("deckTerritories");
    const territoryDivider = territoryList?.previousElementSibling;
    if (territoryList && territoryDivider && !document.getElementById("deckFactionComponents")) {
      const divider = document.createElement("div");
      divider.className = "deck-section-divider";
      divider.textContent = "Deck components";

      const container = document.createElement("div");
      container.id = "deckFactionComponents";
      container.className = "deck-list empty-state";

      territoryDivider.before(divider, container);
    }

    try {
      const currentGame = state.currentGameData || await import("../game-data/ruleset.mjs").then(module => module.loadGameRuleset(module.rulesetModeFromUrl()));
      state.currentGameData ||= currentGame;
      hydratePrintPackages(currentGame);
      state.currentFactionComponentsReady = true;
      document.body.dataset.currentFactionComponents = "ready";
    } catch (error) {
      console.error("Unable to project deck components from current-game authority", error);
      document.body.dataset.currentFactionComponents = "error";
    }

    renderFactionComponents();
  }

  function printComponentType(component) {
    if (component.family === "tracker") return "tracker";
    if (component.family === "reference-card") return "reference";
    if (component.family === "ledger") return "capital";
    if (component.family === "deed-card") return "deed-set";
    return null;
  }

  function projectPrintComponent(component) {
    const type = printComponentType(component);
    if (!type) return null;
    return {
      type,
      id: component.id,
      contractId: component.id,
      title: component.name,
      note: `Production ${component.name}.`,
      sections: [{ label: "Component", text: `Production ${component.name}.` }],
      count: component.quantity,
      designStatus: component.designStatus || "final",
      productionStatus: component.productionStatus,
      backPolicy: component.backPolicy,
      renderSource: component.renderSource || null,
    };
  }

  function hydratePrintPackages(currentGame) {
    const sharedCardComponents = (currentGame.sharedComponents || []).filter(component => (
      component.cardLike && component.deckInclusion === "every-deck"
    ));
    const packages = {};

    for (const faction of currentGame.factions || []) {
      const factionComponents = (currentGame.components || []).filter(component => (
        component.faction === faction.id
        && !["proposal-treaty-card", "rite-card"].includes(component.family)
      ));
      const components = [...sharedCardComponents, ...factionComponents]
        .map(projectPrintComponent)
        .filter(Boolean);

      packages[faction.id] = {
        summary: [
          "Selected Leader Card",
          ...sharedCardComponents.map(component => component.name),
          ...factionComponents.map(component => component.quantity > 1
            ? `${component.quantity} × ${component.name}`
            : component.name),
        ],
        leaderImages: Object.fromEntries((faction.leaders || []).map(leader => [leader.id, leader.image || ""])),
        components,
      };
    }

    if (packages.diplomats) {
      packages.diplomats.proposals = (currentGame.proposals || []).map((proposal, index) => ({
        ...proposal,
        number: Number(proposal.number) || index + 1,
        contractId: `diplomats-proposal-${proposal.id}`,
      }));
    }

    if (packages.mystics) {
      packages.mystics.rites = (currentGame.mystics?.rites || []).map(rite => ({
        id: rite.id,
        contractId: `mystics-rite-${rite.id}`,
        name: rite.name,
        beginning: rite.begin,
        completion: rite.complete,
        reminder: rite.reminder?.text || "",
        interruption: rite.interrupted,
      }));

      const ritual = currentGame.mystics?.ritual;
      if (ritual) {
        packages.mystics.summary.push(`${ritual.name} card`);
        packages.mystics.components.push({
          type: "reference",
          kind: "ritual",
          id: MYSTICS_RITUAL_COMPONENT_ID,
          contractId: MYSTICS_RITUAL_COMPONENT_ID,
          title: ritual.name,
          subtitle: "Mystics victory ritual",
          sections: [
            { label: "Begin", text: ritual.begin },
            { label: "Convergence", text: ritual.convergence },
            { label: "Complete", text: ritual.complete },
            { label: "Interruption", text: ritual.interrupted },
          ],
          backPolicy: "specialBack",
          designStatus: "final",
          productionStatus: "ready",
        });
      }
    }

    window.GAUNTLET_CURRENT_SUPPLEMENTALS = Object.freeze(packages);
  }

  function componentMeta(component, shared = false) {
    if (shared && component.family === "reference-card") return "Shared reference · every deck";
    if (component.family === "proposal-treaty-card") return "Double-sided Proposal / Treaty Article";
    if (component.family === "rite-card") return "Double-sided incomplete / completed Rite";
    if (component.family === "tracker") return "Supplemental tracker";
    if (component.family === "reference-card") return "Supplemental reference";
    if (component.family === "ledger") return "Supplemental ledger";
    if (component.family === "deed-card") return "Shared supplemental cards";
    return shared ? "Shared component" : "Faction component";
  }

  function designMeta(component) {
    const status = component.designStatus || "final";
    if (status === "placeholder") return "Placeholder · design pending";
    if (status === "refinement-pending") return "Initial design · refinement pending";
    if (component.productionStatus === "export-pending") return "Final design · export pending";
    return "Final design";
  }

  function renderFactionComponents() {
    const container = document.getElementById("deckFactionComponents");
    if (!container) return;

    const faction = typeof getFaction === "function" ? getFaction() : null;
    const leader = faction?.leaders?.find(item => item.id === state.leaderId);
    const currentGame = state.currentGameData;

    if (!faction || !leader || !currentGame || !state.currentFactionComponentsReady) {
      container.className = "deck-list empty-state";
      container.textContent = "Loading current deck components…";
      return;
    }

    const sharedComponents = (currentGame.sharedComponents || []).filter(component => (
      component.cardLike && component.deckInclusion === "every-deck"
    ));
    const components = (currentGame.components || []).filter(component => (
      component.faction === state.factionId
      && component.deckInclusion !== "every-deck"
      && !(state.factionId === "mystics" && component.family === "rite-card")
    ));
    const selectedRiteItems = state.factionId === "mystics"
      ? (state.rites || []).map(id => currentGame.mystics?.rites?.find(rite => rite.id === id)).filter(Boolean)
      : [];
    const items = [
      ...sharedComponents.map(component => ({
        name: component.quantityPerPlayer > 1 ? `${component.quantityPerPlayer} × ${component.name}` : component.name,
        meta: `${componentMeta(component, true)} · ${designMeta(component)}`,
      })),
      {
        name: `${leader.name} Leader Card`,
        meta: `${faction.name} · Selected leader · Final design`
      },
      ...components.map(component => ({
        name: component.quantity > 1 ? `${component.quantity} × ${component.name}` : component.name,
        meta: `${componentMeta(component)} · ${designMeta(component)}`,
      })),
      ...selectedRiteItems.map(rite => ({
        name: rite.name,
        meta: "Selected Rite · Double-sided incomplete / completed Rite",
      }))
    ];

    if (state.factionId === "mystics" && currentGame.mystics?.ritual) {
      items.push({
        name: currentGame.mystics.ritual.name,
        meta: "Supplemental Ritual card · Final design",
      });
    }

    container.className = "deck-list";
    container.innerHTML = items.map(item => `
      <article class="deck-row">
        <div>
          <div class="deck-title"><strong>${escapeHtml(item.name)}</strong></div>
          <div class="deck-stats"><span class="mini-pill">${escapeHtml(item.meta)}</span><span class="mini-pill">Not a Playable Deck card</span></div>
        </div>
      </article>
    `).join("");
  }
})();
