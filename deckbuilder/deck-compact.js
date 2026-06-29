(() => {
  function renderCompactDeckCards() {
    const entries = getDeckCardEntries();
    el.deckCards.innerHTML = "";

    if (!entries.length) {
      el.deckCards.className = "deck-list empty-state";
      el.deckCards.textContent = "No main-deck cards yet.";
      return;
    }

    el.deckCards.className = "deck-list compact-deck-list";

    for (const { card, qty } of entries) {
      el.deckCards.append(compactDeckRow(card, qty));
    }
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

  window.renderDeckCards = renderCompactDeckCards;
  try {
    renderDeckCards = renderCompactDeckCards;
  } catch (error) {
    // Older browsers may not allow assigning the global binding directly.
  }
})();
