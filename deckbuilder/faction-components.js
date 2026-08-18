(() => {
  const MYSTICS_RITUAL_COMPONENT_ID = "mystics-ritual-of-ascension";

  installMysticsRitualComponent();
  installDiplomatProposalWording();

  const baseRenderAll = renderAll;

  renderAll = function renderAllWithFactionComponents() {
    baseRenderAll();
    renderFactionComponents();
  };

  document.addEventListener("DOMContentLoaded", installFactionComponentDisplay);

  function installMysticsRitualComponent() {
    const packageData = window.GAUNTLET_V06_SUPPLEMENTALS?.mystics;
    if (!packageData) return;

    const summaryLabel = "Ritual of Ascension card";
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
      title: "Ritual of Ascension",
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

  function installDiplomatProposalWording() {
    const packageData = window.GAUNTLET_V06_SUPPLEMENTALS?.diplomats;
    if (!packageData) return;

    packageData.proposals = [
      {
        number: 1,
        id: "de-escalation",
        name: "De-escalation",
        stake: 0,
        requirement: "None",
        accepted: "Both players withdraw. Accepting player: +1 Card.",
        refused: "Diplomat: +1 Card."
      },
      {
        number: 2,
        id: "orderly-withdrawal",
        name: "Orderly Withdrawal",
        stake: 0,
        requirement: "The Diplomat must be the attacker.",
        accepted: "The Diplomat withdraws. Accepting player: +1 Card.",
        refused: "Diplomat: +1 Battle Total."
      },
      {
        number: 3,
        id: "capitulation",
        name: "Capitulation",
        stake: 0,
        requirement: "The Diplomat must be the defender.",
        accepted: "The Diplomat withdraws. Accepting player: +1 Card.",
        refused: "If the Diplomat loses, +2 Cards."
      },
      {
        number: 4,
        id: "open-channels",
        name: "Open Channels",
        stake: 1,
        requirement: "The Diplomat must have a card in Hand.",
        accepted: "Both players reveal their Hands, then both withdraw. Accepting player: +1 Card.",
        refused: "Refusing player reveals their Hand. Diplomat: +1 Reserve."
      },
      {
        number: 5,
        id: "mutual-disarmament",
        name: "Mutual Disarmament",
        stake: 1,
        requirement: "Both players must have a card in Hand.",
        accepted: "Each player discards 1 from Hand. Accepting player: +1 Card. Then both withdraw.",
        refused: "Diplomat may discard 1 from Hand. If they do: +1 Reserve."
      },
      {
        number: 6,
        id: "prisoner-exchange",
        name: "Prisoner Exchange",
        stake: 1,
        requirement: "Each player must have a card in their Graveyard.",
        accepted: "Each player may move 1 card from their Graveyard to their Discard Pile. Then both withdraw.",
        refused: "If the Diplomat loses, they may move 1 card from their Graveyard to their Discard Pile."
      },
      {
        number: 7,
        id: "rebuilding-pact",
        name: "Rebuilding Pact",
        stake: 1,
        requirement: "The Diplomat must have a card in Hand that can be banked as an Asset.",
        accepted: "Each player may bank 1 Asset from Hand. Then both withdraw.",
        refused: "In the Aftermath, the Diplomat may bank 1 Asset from Hand."
      },
      {
        number: 8,
        id: "ultimatum",
        name: "Ultimatum",
        stake: 2,
        requirement: "None",
        accepted: "The accepting player withdraws.",
        refused: "Diplomat: +1 Battle Total."
      },
      {
        number: 9,
        id: "diplomatic-recognition",
        name: "Diplomatic Recognition",
        stake: 2,
        requirement: "The Diplomat must be defending a Counterattack.",
        accepted: "Diplomat: Advance Front Line 1, if able. Accepting player withdraws, then +2 Cards.",
        refused: "If the Diplomat wins: Advance Front Line 1 during the Aftermath, if able. No Influence for imposing this Proposal."
      }
    ];
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
