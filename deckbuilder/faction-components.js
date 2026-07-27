(() => {
  const baseRenderAll = renderAll;

  renderAll = function renderAllWithFactionComponents() {
    baseRenderAll();
    renderFactionComponents();
  };

  document.addEventListener("DOMContentLoaded", installFactionComponentDisplay);

  function installFactionComponentDisplay() {
    const territoryList = document.getElementById("deckTerritories");
    const territoryDivider = territoryList?.previousElementSibling;
    if (!territoryList || !territoryDivider || document.getElementById("deckFactionComponents")) return;

    const divider = document.createElement("div");
    divider.className = "deck-section-divider";
    divider.textContent = "Faction components";

    const container = document.createElement("div");
    container.id = "deckFactionComponents";
    container.className = "deck-list empty-state";

    territoryDivider.before(divider, container);
    renderFactionComponents();
  }

  function renderFactionComponents() {
    const container = document.getElementById("deckFactionComponents");
    if (!container) return;

    const faction = typeof getFaction === "function" ? getFaction() : null;
    const leader = faction?.leaders?.find(item => item.id === state.leaderId);
    const packageData = window.GAUNTLET_V06_SUPPLEMENTALS?.[state.factionId];

    if (!faction || !leader || !packageData) {
      container.className = "deck-list empty-state";
      container.textContent = "No completed faction package is available.";
      return;
    }

    const items = [
      {
        name: `${leader.name} Leader Card`,
        meta: `${faction.name} · Selected leader`
      },
      ...(packageData.components || []).map(component => ({
        name: component.type === "deed-set" ? `${component.count || 8} × ${component.title}` : component.title,
        meta: component.type === "capital" || /ledger/i.test(component.title || "")
          ? "Supplemental ledger"
          : component.type === "tracker" || /tracker/i.test(component.footer || component.subtitle || "")
            ? "Supplemental tracker"
            : component.type === "deed-set"
              ? "Shared supplemental cards"
              : "Supplemental reference"
      }))
    ];

    if (packageData.proposals?.length) {
      packageData.proposals.forEach(proposal => {
        items.push({
          name: `Article ${proposal.number}: ${proposal.name}`,
          meta: "Double-sided Proposal / Treaty Article"
        });
      });
    }

    if (packageData.rites?.length) {
      packageData.rites.forEach(rite => {
        items.push({
          name: rite.name,
          meta: "Double-sided incomplete / completed Rite"
        });
      });
    }

    container.className = "deck-list";
    container.innerHTML = items.map(item => `
      <article class="deck-row">
        <div>
          <div class="deck-title"><strong>${escapeHtml(item.name)}</strong></div>
          <div class="deck-stats"><span class="mini-pill">${escapeHtml(item.meta)}</span><span class="mini-pill">No deckbuilding value</span></div>
        </div>
      </article>
    `).join("");
  }
})();
