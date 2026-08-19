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
      divider.textContent = "Faction components";

      const container = document.createElement("div");
      container.id = "deckFactionComponents";
      container.className = "deck-list empty-state";

      territoryDivider.before(divider, container);
    }

    try {
      const currentGame = state.currentGameData || await import("../game-data/current-game.mjs").then(module => module.loadCurrentGame());
      state.currentGameData ||= currentGame;
      hydrateLegacyPrintPackages(currentGame);
      state.currentFactionComponentsReady = true;
      document.body.dataset.currentFactionComponents = "ready";
    } catch (error) {
      console.error("Unable to project faction components from current-game authority", error);
      document.body.dataset.currentFactionComponents = "error";
    }

    renderFactionComponents();
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function componentAliases(component) {
    const values = new Set([
      component.name,
      String(component.name || "").replace(/\b(reference|tracker|card|ledger)\b/gi, " "),
      component.trackedValue?.name,
      component.referenceFaces?.front?.title,
      component.referenceFaces?.reverse?.title,
    ]);
    return [...values].map(normalize).filter(Boolean);
  }

  function legacyComponentLabel(component) {
    return component.title || component.name || component.id || "";
  }

  function legacyMatchesContract(legacy, contract) {
    const legacyNames = [
      legacyComponentLabel(legacy),
      legacy.subtitle,
      legacy.type,
    ].map(normalize).filter(Boolean);
    const aliases = componentAliases(contract);
    if (legacyNames.some(name => aliases.includes(name))) return true;

    if (contract.family === "tracker" && legacy.type === "tracker") {
      const tracked = normalize(contract.trackedValue?.name);
      return tracked && legacyNames.some(name => name.includes(tracked));
    }
    if (contract.family === "ledger" && legacy.type === "capital") return /capital/.test(normalize(contract.name));
    if (contract.family === "deed-card" && legacy.type === "deed-set") return /deed/.test(normalize(contract.name));
    if (contract.family === "reference-card" && ["reference", "purge"].includes(legacy.type)) {
      return aliases.some(alias => legacyNames.some(name => name.includes(alias) || alias.includes(name)));
    }
    return false;
  }

  function annotateLegacyComponents(packageData, contractComponents) {
    for (const legacy of packageData.components || []) {
      const contract = contractComponents.find(component => legacyMatchesContract(legacy, component));
      if (!contract) continue;
      legacy.contractId = contract.id;
      legacy.contractFamily = contract.family;
      legacy.productionStatus = contract.productionStatus;
      legacy.backPolicy = contract.backPolicy;
      legacy.renderSource = contract.renderSource || null;
    }
  }

  function hydrateLegacyPrintPackages(currentGame) {
    const packages = window.GAUNTLET_V06_SUPPLEMENTALS || (window.GAUNTLET_V06_SUPPLEMENTALS = {});
    const contractComponents = currentGame.components || [];

    for (const [factionId, packageData] of Object.entries(packages)) {
      annotateLegacyComponents(
        packageData,
        contractComponents.filter(component => component.faction === factionId),
      );
    }

    const diplomats = packages.diplomats;
    if (diplomats) {
      diplomats.proposals = (currentGame.proposals || []).map((proposal, index) => ({
        ...proposal,
        number: Number(proposal.number) || index + 1,
        contractId: `diplomats-proposal-${proposal.id}`,
      }));
    }

    const mystics = packages.mystics;
    if (mystics) {
      mystics.rites = (currentGame.mystics?.rites || []).map(rite => ({
        id: rite.id,
        contractId: `mystics-rite-${rite.id}`,
        name: rite.name,
        beginning: rite.begin,
        completion: rite.complete,
        interruption: rite.interrupted,
      }));

      const ritual = currentGame.mystics?.ritual;
      if (ritual) {
        mystics.summary ||= [];
        const summaryLabel = `${ritual.name} card`;
        if (!mystics.summary.includes(summaryLabel)) mystics.summary.push(summaryLabel);

        mystics.components ||= [];
        const existing = mystics.components.find(component => component.id === MYSTICS_RITUAL_COMPONENT_ID);
        const ritualComponent = {
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
          footer: "Supplemental Ritual card — not a Playable Deck card",
          backPolicy: "specialBack",
          productionStatus: "ready",
          renderSource: { surface: "card-design/rite-card.js", componentId: ritual.id },
        };
        if (existing) Object.assign(existing, ritualComponent);
        else mystics.components.push(ritualComponent);
      }
    }
  }

  function componentMeta(component) {
    if (component.family === "proposal-treaty-card") return "Double-sided Proposal / Treaty Article";
    if (component.family === "rite-card") return "Double-sided incomplete / completed Rite";
    if (component.family === "tracker") return "Supplemental tracker";
    if (component.family === "reference-card") return "Supplemental reference";
    if (component.family === "ledger") return "Supplemental ledger";
    if (component.family === "deed-card") return "Shared supplemental cards";
    return "Faction component";
  }

  function renderFactionComponents() {
    const container = document.getElementById("deckFactionComponents");
    if (!container) return;

    const faction = typeof getFaction === "function" ? getFaction() : null;
    const leader = faction?.leaders?.find(item => item.id === state.leaderId);
    const currentGame = state.currentGameData;

    if (!faction || !leader || !currentGame || !state.currentFactionComponentsReady) {
      container.className = "deck-list empty-state";
      container.textContent = "Loading current faction components…";
      return;
    }

    const components = (currentGame.components || []).filter(component => component.faction === state.factionId);
    const items = [
      {
        name: `${leader.name} Leader Card`,
        meta: `${faction.name} · Selected leader`
      },
      ...components.map(component => ({
        name: component.quantity > 1 ? `${component.quantity} × ${component.name}` : component.name,
        meta: componentMeta(component),
      }))
    ];

    if (state.factionId === "mystics" && currentGame.mystics?.ritual) {
      items.push({
        name: currentGame.mystics.ritual.name,
        meta: "Supplemental Ritual card",
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
