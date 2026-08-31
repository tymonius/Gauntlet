(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const { state } = deckbuilder;
  const escapeHtml = value => deckbuilder.escapeHtml(value);
  const ritesApi = () => deckbuilder.feature("mysticsRites");

  deckbuilder.registerRenderHook(renderFactionComponents);

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
      const currentGame = state.currentGameData || await deckbuilder.bootstrap();
      state.currentGameData ||= currentGame;
      hydratePrintPackages(currentGame);
      document.body.dataset.currentFactionComponents = "ready";
    } catch (error) {
      console.error("Unable to project deck components from current-game authority", error);
      document.body.dataset.currentFactionComponents = "error";
    }

    renderFactionComponents();
  }

  function printComponentType(component) {
    if (component.family === "tracker") return "tracker";
    if (component.family === "reference-card" || component.family === "ritual-card") return "reference";
    if (component.family === "ledger") return "capital";
    if (component.family === "deed-card") return "deed-set";
    return null;
  }

  function projectPrintComponent(component, currentGame) {
    const type = printComponentType(component);
    if (!type) return null;
    const ritual = component.family === "ritual-card" ? currentGame.mystics?.ritual : null;
    return {
      type,
      kind: component.renderSource?.kind || "",
      id: component.id,
      contractId: component.id,
      title: component.name,
      subtitle: ritual ? "Mystics victory ritual" : "",
      note: `Production ${component.name}.`,
      sections: ritual ? [
        { label: "Begin", text: ritual.begin },
        { label: "Convergence", text: ritual.convergence },
        { label: "Complete", text: ritual.complete },
        { label: "Interruption", text: ritual.interrupted },
      ] : [{ label: "Component", text: `Production ${component.name}.` }],
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
        .map(component => projectPrintComponent(component, currentGame))
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

    }

    deckbuilder.registerFeature("supplementalPackages", packages);
  }

  function componentMeta(component, shared = false) {
    if (shared && component.family === "reference-card") return "Shared reference · every deck";
    if (component.family === "proposal-treaty-card") return "Double-sided Proposal / Treaty Article";
    if (component.family === "rite-card") return "Double-sided incomplete / completed Rite";
    if (component.family === "ritual-card") return "Supplemental Ritual card";
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

    const faction = deckbuilder.getFaction();
    const leader = faction?.leaders?.find(item => item.id === state.leaderId);
    const currentGame = state.currentGameData;

    if (!faction || !leader || !currentGame || !deckbuilder.feature("supplementalPackages")) {
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
      ? (ritesApi()?.selectedRites?.() || [])
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
