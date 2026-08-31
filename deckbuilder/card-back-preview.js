(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const PREVIEW_RETRY_LIMIT = 10;

  document.addEventListener("DOMContentLoaded", installCardBackPreview);

  function installCardBackPreview(attempt = 0) {
    if (document.getElementById("cardBackPreview")) return;

    const printBacks = document.getElementById("printCardBacks");
    const factionSelect = document.getElementById("factionSelect");
    const primaryOption = printBacks?.closest(".print-option");

    if (!printBacks || !primaryOption) {
      if (attempt < PREVIEW_RETRY_LIMIT) {
        window.requestAnimationFrame(() => installCardBackPreview(attempt + 1));
      }
      return;
    }

    const controls = document.createElement("div");
    controls.className = "card-back-controls";

    const options = document.createElement("div");
    options.className = "card-back-options";

    const policy = document.createElement("p");
    policy.className = "muted card-back-policy-note";
    policy.textContent = "Automatic backs: black for playable cards and Territories; faction color for Leaders and other single-sided faction components.";

    const preview = document.createElement("figure");
    preview.id = "cardBackPreview";
    preview.className = "card-back-preview";
    preview.setAttribute("aria-label", "Faction component card back preview");

    const stage = document.createElement("div");
    stage.className = "card-back-preview-stage";

    const frame = document.createElement("iframe");
    frame.id = "cardBackPreviewFrame";
    frame.className = "card-back-preview-frame";
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;

    const caption = document.createElement("figcaption");
    caption.id = "cardBackPreviewCaption";

    stage.append(frame);
    preview.append(stage, caption);

    primaryOption.before(controls);
    controls.append(options, preview);
    options.append(primaryOption, policy);

    const selectedFaction = () => String(factionSelect?.value || "intelligence").trim().toLowerCase() || "intelligence";

    const updatePreview = () => {
      const faction = selectedFaction();
      const src = `/tts/back-renderer/index.html?faction=${encodeURIComponent(faction)}`;
      if (frame.dataset.faction !== faction) {
        frame.dataset.faction = faction;
        frame.src = src;
      }

      const factionLabel = faction.charAt(0).toUpperCase() + faction.slice(1);
      frame.title = `${factionLabel} faction-component card back preview`;
      caption.textContent = `${factionLabel} component back`;
      preview.classList.toggle("disabled", !printBacks.checked);
    };

    printBacks.addEventListener("change", updatePreview);
    factionSelect?.addEventListener("change", () => window.requestAnimationFrame(updatePreview));
    updatePreview();
  }

})();
