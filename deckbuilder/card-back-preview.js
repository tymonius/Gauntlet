(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const { state } = deckbuilder;

  const PREVIEW_RETRY_LIMIT = 10;

  document.addEventListener("DOMContentLoaded", () => {
    installCardBackPreview();
    installMixedBackPrintPolicy();
  });

  function installCardBackPreview(attempt = 0) {
    if (document.getElementById("cardBackPreview")) return;

    const printBacks = document.getElementById("printCardBacks");
    const factionColor = document.getElementById("factionColorCardBack");
    const factionSelect = document.getElementById("factionSelect");
    const primaryOption = printBacks?.closest(".print-option");
    const factionOption = factionColor?.closest(".print-option");

    if (!printBacks || !primaryOption) {
      if (attempt < PREVIEW_RETRY_LIMIT) {
        window.requestAnimationFrame(() => installCardBackPreview(attempt + 1));
      }
      return;
    }

    // Back selection is no longer a user choice. Playable cards and Territories
    // always use the black Gauntlet back; persistent single-sided faction
    // components use the selected faction's color back.
    if (factionColor) {
      factionColor.checked = false;
      factionColor.disabled = true;
    }
    factionOption?.remove();

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

  function installMixedBackPrintPolicy() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const inheritedOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === mixedBackAwareOpen) window.open = inheritedOpen;
      };

      function mixedBackAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => inheritedWrite(injectMixedBackPolicy(html));
        restoreOpen();
        return printWindow;
      }

      window.open = mixedBackAwareOpen;
      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function injectMixedBackPolicy(html) {
    const faction = String(state.factionId || "intelligence").trim().toLowerCase() || "intelligence";
    const script = `<script data-automatic-mixed-back-policy="true">(() => {
  const faction = ${JSON.stringify(faction)};
  const COLUMNS = 3;
  const mirrorIndexForLongEdge = index => {
    const row = Math.floor(index / COLUMNS);
    const column = index % COLUMNS;
    return row * COLUMNS + (COLUMNS - 1 - column);
  };

  const isFactionComponent = cell => Boolean(cell.querySelector([
    '.production-render-leader',
    '.production-render-component[data-production-back-policy="standardBack"]',
    '.leader-card',
    '.tracker-card[data-contract-back-policy="standardBack"]',
    '.capital-tracker-card[data-contract-back-policy="standardBack"]',
    '.deed-card[data-contract-back-policy="standardBack"]'
  ].join(',')));

  const applyPolicy = () => {
    const backPages = [...document.querySelectorAll('.deck-card-back-page[data-duplex-pair]')];
    document.querySelectorAll('.deck-card-front-page[data-duplex-pair]').forEach(frontPage => {
      const pair = frontPage.dataset.duplexPair;
      const backPage = backPages.find(page => page.dataset.duplexPair === pair);
      if (!backPage) return;

      const frontCells = [...frontPage.querySelectorAll('.card-table td')];
      const backCells = [...backPage.querySelectorAll('.card-table td')];
      frontCells.forEach((frontCell, frontIndex) => {
        if (!isFactionComponent(frontCell)) return;
        const backCell = backCells[mirrorIndexForLongEdge(frontIndex)];
        const frame = backCell?.querySelector('iframe.production-back-frame');
        if (!frame) return;
        frame.src = '/tts/back-renderer/index.html?faction=' + encodeURIComponent(faction) + '&rotation=180';
        frame.title = faction + ' faction-component card back';
        frame.closest('.production-render-back')?.setAttribute('aria-label', faction + ' faction-component card back, rotated 180 degrees for duplex printing');
      });
    });
  };

  window.addEventListener('load', applyPolicy, { once: true });
})();<\/script>`;

    return String(html).replace(/<\/body>/i, `${script}</body>`);
  }
})();