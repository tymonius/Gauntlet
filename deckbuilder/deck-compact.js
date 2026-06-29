(() => {
  function renderCompactDeckCards() {
    const entries = getDeckCardEntries();
    const selectedTerritories = state.territories
      .map(name => state.data.territoryByName[name])
      .filter(Boolean);

    el.deckCards.innerHTML = "";

    if (!entries.length && !selectedTerritories.length) {
      el.deckCards.className = "deck-list empty-state";
      el.deckCards.textContent = "No main-deck cards or Territories yet.";
      return;
    }

    el.deckCards.className = "deck-list compact-deck-list";

    if (entries.length) {
      el.deckCards.append(sectionDivider("Main deck"));
      for (const { card, qty } of entries) {
        el.deckCards.append(compactDeckRow(card, qty));
      }
    }

    if (selectedTerritories.length) {
      el.deckCards.append(sectionDivider("Territories"));
      for (const territory of selectedTerritories) {
        el.deckCards.append(compactDeckTerritoryRow(territory));
      }
    }
  }

  function sectionDivider(label) {
    const divider = document.createElement("div");
    divider.className = "compact-deck-section-divider";
    divider.innerHTML = `<span>${escapeHtml(label)}</span>`;
    return divider;
  }

  function compactDeckRow(card, qty) {
    const row = document.createElement("article");
    row.className = "compact-deck-row";

    const main = document.createElement("div");
    main.className = "compact-deck-main";

    const titleLine = document.createElement("div");
    titleLine.className = "compact-deck-title-line";
    titleLine.innerHTML = `<strong>${escapeHtml(card.name)}</strong><span class="mini-pill">${card.cost}</span>`;

    const stats = document.createElement("div");
    stats.className = "compact-deck-stats";
    stats.innerHTML = `<span class="mini-pill">${qty}x</span><span class="mini-pill">${qty * card.cost} pts</span>`;

    main.append(titleLine, stats);

    const actions = document.createElement("div");
    actions.className = "compact-deck-actions";

    const minus = makeIconButton("−", `Remove one ${card.name}`, () => removeCard(card.name));
    const plus = makeIconButton("+", `Add one ${card.name}`, () => addCard(card.name));
    const remove = makeIconButton("×", `Remove all ${card.name}`, () => removeAllCard(card.name));
    remove.classList.add("danger", "secondary");

    actions.append(minus, plus, remove);
    row.append(main, actions);
    return row;
  }

  function compactDeckTerritoryRow(territory) {
    const row = document.createElement("article");
    row.className = "compact-deck-row compact-deck-territory-row";

    const main = document.createElement("div");
    main.className = "compact-deck-main";

    const titleLine = document.createElement("div");
    titleLine.className = "compact-deck-title-line";
    titleLine.innerHTML = `<strong>${escapeHtml(territory.name)}</strong>`;

    const stats = document.createElement("div");
    stats.className = "compact-deck-stats";
    stats.innerHTML = `<span class="mini-pill">Territory</span>${territory.arena ? '<span class="arena-pill">Arena</span>' : ""}`;

    main.append(titleLine, stats);

    const actions = document.createElement("div");
    actions.className = "compact-deck-actions";

    const remove = makeIconButton("×", `Remove ${territory.name}`, () => {
      state.selectedTerritory = territory.name;
      toggleTerritory(territory.name);
    });
    remove.classList.add("danger", "secondary");

    actions.append(remove);
    row.append(main, actions);
    return row;
  }

  window.renderDeckCards = renderCompactDeckCards;
  try {
    renderDeckCards = renderCompactDeckCards;
  } catch (error) {
    // Older browsers may not allow assigning the global binding directly.
  }
})();
