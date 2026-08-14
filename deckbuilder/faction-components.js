(() => {
  const MYSTICS_RITUAL_COMPONENT_ID = "mystics-ritual-of-ascendance";

  installMysticsRitualComponent();

  const baseRenderAll = renderAll;

  renderAll = function renderAllWithFactionComponents() {
    baseRenderAll();
    renderFactionComponents();
  };

  document.addEventListener("DOMContentLoaded", installFactionComponentDisplay);

  function installMysticsRitualComponent() {
    const packageData = window.GAUNTLET_V06_SUPPLEMENTALS?.mystics;
    if (!packageData) return;

    const summaryLabel = "Ritual of Ascendance card";
    packageData.summary ||= [];
    if (!packageData.summary.includes(summaryLabel)) {
      const riteSummaryIndex = packageData.summary.findIndex(item => /Rite cards/i.test(item));
      if (riteSummaryIndex >= 0) packageData.summary.splice(riteSummaryIndex, 0, summaryLabel);
      else packageData.summary.push(summaryLabel);
    }

    packageData.components ||= [];
    if (packageData.components.some(component => component.id === MYSTICS_RITUAL_COMPONENT_ID)) return;

    packageData.components.push({
      type: "reference",
      kind: "ritual",
      id: MYSTICS_RITUAL_COMPONENT_ID,
      title: "Ritual of Ascendance",
      subtitle: "Mystics victory ritual",
      sections: [
        {
          label: "Begin",
          text: "After completing all three Rites, during an Action Opportunity after movement, spend 1 Action. Bind one Arcane card from your Hand, one from your Discard Pile, and one from your Graveyard."
        },
        {
          label: "Convergence",
          text: "While the Ritual is underway, during a battle you initiated, add +1 to your battle total for each card bound to the Ritual."
        },
        {
          label: "Complete",
          text: "Initiate a battle while all three Ritual cards remain bound. If you win that battle, complete the Ritual and immediately win the game."
        },
        {
          label: "Interruption",
          text: "If you lose any battle before completion, put all three Ritual-bound cards in your Graveyard. Withdrawal neither completes nor interrupts the Ritual."
        }
      ],
      footer: "Supplemental Ritual card — not a Playable Deck card"
    });
  }

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
        meta: component.kind === "ritual"
          ? "Supplemental Ritual card"
          : component.type === "capital" || /ledger/i.test(component.title || "")
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
          <div class="deck-stats"><span class="mini-pill">${escapeHtml(item.meta)}</span><span class="mini-pill">Not a Playable Deck card</span></div>
        </div>
      </article>
    `).join("");
  }
})();
