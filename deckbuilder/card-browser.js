(() => {
  let browserShellReady = false;
  let previewElement = null;

  function installCardBrowserShell() {
    if (browserShellReady) return;
    const list = document.getElementById("availableCards");
    if (!list || list.closest(".card-browser")) {
      browserShellReady = true;
      previewElement = document.getElementById("cardPreview");
      return;
    }

    const browser = document.createElement("div");
    browser.className = "card-browser";
    list.parentNode.insertBefore(browser, list);
    browser.append(list);

    previewElement = document.createElement("aside");
    previewElement.id = "cardPreview";
    previewElement.className = "card-preview empty";
    previewElement.textContent = "Select a card to view its full text.";
    browser.append(previewElement);

    browserShellReady = true;
  }

  function renderCompactAvailableCards() {
    installCardBrowserShell();

    const cards = getFilteredCards();
    el.availableCards.innerHTML = "";
    el.availableCount.textContent = `${cards.length} card${cards.length === 1 ? "" : "s"}`;

    if (!cards.length) {
      el.availableCards.className = "card-list compact-card-list empty-state";
      el.availableCards.textContent = "No cards match the current filters.";
      renderCardPreview(null);
      return;
    }

    el.availableCards.className = "card-list compact-card-list";

    if (!state.selectedAvailableCard || !cards.some(card => card.name === state.selectedAvailableCard)) {
      state.selectedAvailableCard = cards[0].name;
    }

    for (const card of cards) {
      el.availableCards.append(compactCardRow(card));
    }

    renderCardPreview(state.data.cardByName[state.selectedAvailableCard] || cards[0]);
  }

  function compactCardRow(card) {
    const row = document.createElement("article");
    const owned = state.cards[card.name] || 0;
    const selected = state.selectedAvailableCard === card.name;
    const unique = (getRules().unique_cards || []).includes(card.name);

    row.className = `compact-card-row${selected ? " selected" : ""}`;
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-pressed", selected ? "true" : "false");

    const main = document.createElement("div");
    main.className = "compact-card-main";

    const titleLine = document.createElement("div");
    titleLine.className = "compact-card-title-line";
    titleLine.innerHTML = `<strong>${escapeHtml(card.name)}</strong><span class="mini-pill">${card.cost}</span>${owned ? `<span class="mini-pill">${owned}x</span>` : ""}`;

    const tags = document.createElement("div");
    tags.className = "compact-card-tags";
    tags.textContent = [
      card.action ? "Action" : null,
      card.battle ? "Battle" : null,
      card.reminder ? "Note" : null,
      unique ? "Unique" : null
    ].filter(Boolean).join(" · ");

    main.append(titleLine, tags);

    const actions = document.createElement("div");
    actions.className = "compact-card-actions";
    const add = document.createElement("button");
    add.type = "button";
    add.className = "compact-add-button secondary";
    add.textContent = owned ? `Add (${owned})` : "Add";
    add.addEventListener("click", event => {
      event.stopPropagation();
      state.selectedAvailableCard = card.name;
      addCard(card.name);
    });
    actions.append(add);

    row.addEventListener("click", () => selectAvailableCard(card.name));
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectAvailableCard(card.name);
      }
    });

    row.append(main, actions);
    return row;
  }

  function selectAvailableCard(name) {
    state.selectedAvailableCard = name;
    renderCompactAvailableCards();
  }

  function renderCardPreview(card) {
    if (!previewElement) return;

    if (!card) {
      previewElement.className = "card-preview empty";
      previewElement.textContent = "Select a card to view its full text.";
      return;
    }

    const owned = state.cards[card.name] || 0;
    const unique = (getRules().unique_cards || []).includes(card.name);
    previewElement.className = "card-preview";
    previewElement.innerHTML = `
      <div class="card-preview-header">
        <div>
          <h3>${escapeHtml(card.name)}</h3>
          <div class="card-preview-meta">
            <span class="mini-pill">${card.cost} point${card.cost === 1 ? "" : "s"}</span>
            ${owned ? `<span class="mini-pill">${owned} in deck</span>` : ""}
            ${unique ? '<span class="mini-pill">Unique</span>' : ""}
          </div>
        </div>
      </div>
      <div class="card-preview-section">
        <div class="card-preview-label">Action</div>
        <p class="card-preview-text">${escapeHtml(card.action || "—")}</p>
      </div>
      <div class="card-preview-section">
        <div class="card-preview-label">Battle</div>
        <p class="card-preview-text">${escapeHtml(card.battle || "—")}</p>
      </div>
      ${card.reminder ? `<div class="card-preview-section"><div class="card-preview-label">Reminder</div><p class="card-preview-text">${escapeHtml(card.reminder)}</p></div>` : ""}
      <div class="card-preview-actions">
        <button id="previewAddCardButton" type="button">Add to deck</button>
      </div>
    `;

    previewElement.querySelector("#previewAddCardButton")?.addEventListener("click", () => {
      state.selectedAvailableCard = card.name;
      addCard(card.name);
    });
  }

  window.renderAvailableCards = renderCompactAvailableCards;
  try {
    renderAvailableCards = renderCompactAvailableCards;
  } catch (error) {
    // Older browsers may not allow assigning the global binding directly.
  }
})();
