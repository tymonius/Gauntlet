(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const constructionRules = () => deckbuilder.constructionRules();

  const params = new URLSearchParams(window.location.search);
  const factionId = String(params.get("faction") || "").trim();
  const leaderId = String(params.get("leader") || "").trim();
  let faction = null;
  let requestedLeader = null;
  const STARTER_FACTION_COLORS = {
    military: "#9e262c",
    diplomats: "#264f91",
    financiers: "#227044",
    intelligence: "#282827",
    mystics: "#5d347e",
    inquisition: "#a67a27"
  };

  if (params.get("starter") !== "1") return;

  let leader = null;
  let panel = null;
  let status = null;
  let printButton = null;
  let backsCheckbox = null;
  let applied = false;
  const startedAt = Date.now();

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      await deckbuilder.bootstrap();

      faction = deckbuilder.factionCatalog().find(item => item.id === factionId && item.status === "ready") || null;
      requestedLeader = faction?.leaders.find(item => item.id === leaderId) || null;
      leader = requestedLeader;
      if (!faction || !leader) return;

      deckbuilder.replaceDeckState({
        deckName: "",
        factionId: faction.id,
        leaderId: leader.id,
        deck: {},
        selectedCardId: null,
      });
      deckbuilder.feature("territories")?.setSelectedIds?.([]);
      deckbuilder.feature("mysticsRites")?.setSelectedIds?.([]);
      deckbuilder.renderFactionOptions();
      deckbuilder.render();
      injectPanel();
      requestAnimationFrame(waitForStarterData);
    } catch (error) {
      console.error("Unable to initialize starter handoff", error);
    }
  }

  function injectPanel() {
    const rules = constructionRules();
    const territoryLabel = `${rules.territoriesPerPlayer} Territor${rules.territoriesPerPlayer === 1 ? "y" : "ies"}`;
    const app = document.getElementById("app");
    const setup = app?.querySelector(".setup-panel");
    if (!app || !setup || document.getElementById("starterHandoffPanel")) return;

    panel = document.createElement("section");
    panel.id = "starterHandoffPanel";
    panel.className = "panel starter-handoff-panel";
    panel.style.setProperty("--starter-faction-color", STARTER_FACTION_COLORS[faction.id] || "#8f1f25");
    panel.style.setProperty("--starter-faction-symbol", `url("../images/faction-symbols/${faction.id}.svg")`);
    panel.innerHTML = `
      <div class="starter-handoff-copy">
        <p class="eyebrow">New-player print mode</p>
        <h2>${escapeHandoffHtml(leader.name)} of the ${escapeHandoffHtml(faction.name)}</h2>
        <p id="starterHandoffStatus">Loading the recommended starter Deck and its ${territoryLabel}…</p>
        <div class="starter-handoff-actions">
          <button id="starterHandoffPrint" type="button" disabled>Print starter Deck</button>
          <a class="button-like secondary" href="../start/">Change faction or Leader</a>
        </div>
      </div>
      <div class="starter-handoff-checklist">
        <strong>Before printing</strong>
        <label><input id="starterHandoffBacks" type="checkbox" /> Include card backs for duplex printing</label>
        <ol>
          <li>Use actual size or 100% scale.</li>
          <li>Do not use “fit to page.”</li>
          <li>Cut the cards, Leader, Territories, references, and faction components.</li>
          <li>Your opponent prints a separate starter Deck.</li>
        </ol>
      </div>`;
    setup.before(panel);

    status = document.getElementById("starterHandoffStatus");
    printButton = document.getElementById("starterHandoffPrint");
    backsCheckbox = document.getElementById("starterHandoffBacks");
    printButton.addEventListener("click", printStarterDeck);
    backsCheckbox.addEventListener("change", syncCardBackChoice);
  }

  function waitForStarterData() {
    const api = deckbuilder.feature("starterDecks");
    if (api?.isReady?.()) {
      applyStarterDeck(api);
      return;
    }
    if (Date.now() - startedAt > 15000) {
      setStatus("The starter Deck took too long to load. Reload this page or return to the new-player setup.", "error");
      return;
    }
    requestAnimationFrame(waitForStarterData);
  }

  function applyStarterDeck(api) {
    if (applied) return;
    applied = true;
    setStatus("Loading the recommended starter Deck…");

    api.loadSelectedDeck?.();
    window.setTimeout(() => {
      const preset = api.getMatchingCurrentDeck?.();
      const basePrintButton = document.getElementById("printDeckButton");
      const baseBacksCheckbox = document.getElementById("printCardBacks");
      if (!preset || !basePrintButton || basePrintButton.disabled) {
        setStatus("The selected starter Deck did not finish loading or validating. Review the Deckbuilder status below.", "error");
        panel?.classList.add("has-error");
        return;
      }

      backsCheckbox.checked = Boolean(baseBacksCheckbox?.checked);
      printButton.disabled = false;
      panel?.classList.add("is-ready");
      const rules = constructionRules();
      const territoryLabel = `${rules.territoriesPerPlayer} Territor${rules.territoriesPerPlayer === 1 ? "y" : "ies"}`;
      setStatus(`${preset.name} is loaded: ${Number(preset.cardCount) || rules.minimumCards} cards, ${territoryLabel}, the ${leader.name} Leader, strategy notes, references, and required printable components.`, "success");
      panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function syncCardBackChoice() {
    const baseBacksCheckbox = document.getElementById("printCardBacks");
    if (!baseBacksCheckbox) return;
    baseBacksCheckbox.checked = backsCheckbox.checked;
    baseBacksCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function printStarterDeck() {
    const basePrintButton = document.getElementById("printDeckButton");
    if (!basePrintButton || basePrintButton.disabled) {
      setStatus("The starter Deck is not ready to print yet.", "error");
      return;
    }
    syncCardBackChoice();
    basePrintButton.click();
  }

  function setStatus(message, kind = "") {
    if (!status) return;
    status.textContent = message;
    status.className = kind ? `is-${kind}` : "";
  }

  function escapeHandoffHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();