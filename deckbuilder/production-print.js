(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const { state } = deckbuilder;
  const escapeHtml = value => deckbuilder.escapeHtml(value);

  const COLUMNS = 3;
  const RENDER_TIMEOUT_MS = 30000;

  deckbuilder.registerFeature("productionPrintRenderer", Object.freeze({
    card: renderProductionCardHtml,
    territory: renderProductionTerritoryHtml,
    leader: renderProductionLeaderHtml,
    component: renderProductionComponentHtml,
    cardSource: productionCardSource,
    territorySource: productionTerritorySource,
    componentSource: productionComponentSource,
    componentDescriptor: productionComponentDescriptor,
    frameSource: productionFrameSource,
    backSource: productionBackSource,
  }));
  deckbuilder.registerPrintTransform("production-rendering", prepareProductionPrintDocument, 40);
  deckbuilder.registerPrintTransform("production-face-guard", guardProductionFaces, 100);
  function resolvedCurrentGame() {
    const currentGame = state.currentGameData;
    if (!currentGame?.cards?.length || !currentGame?.territories?.length || !currentGame?.componentContract) {
      throw new Error("The shared current-game authority has not finished loading.");
    }
    return currentGame;
  }

  function prepareProductionPrintDocument(html) {
    const currentGame = resolvedCurrentGame();
    const printCardBacks = Boolean(document.getElementById("printCardBacks")?.checked);
    const documentNode = new DOMParser().parseFromString(html, "text/html");

    ensureIntrinsicReversePages(documentNode, currentGame);
    if (printCardBacks) {
      ensureStandardBackPages(documentNode);
      replaceProductionBacks(documentNode);
      installInlineCardBackRenderer(documentNode);
    }
    addDuplexInstructions(documentNode);
    injectProductionPrintStyles(documentNode);
    installProductionAuthorityBridge(documentNode);
    installProductionReadinessGate(documentNode);

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  function installProductionAuthorityBridge(documentNode) {
    const script = documentNode.createElement("script");
    script.dataset.productionAuthorityBridge = "true";
    const rulesetMode = selectedRulesetMode();
    script.textContent = `(() => {
  try {
    const runtime = window.opener?.GAUNTLET_DECKBUILDER?.state?.currentGameData || null;
    if (!runtime) return;
    window.__gauntletProductionAuthorityBridge = {
      rulesetMode: ${JSON.stringify(rulesetMode)},
      runtime,
    };
  } catch (error) {
    console.warn('Unable to bridge Deckbuilder authority into production print frames', error);
  }
})();`;
    documentNode.head.prepend(script);
  }

  function guardProductionFaces(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const staleSelectors = [
      ".print-card.leader-card",
      ".print-card.main-card:not(.production-render-card)",
      ".print-card.territory:not(.production-render-territory)",
      ".print-card.tracker-card",
      ".print-card.reference-card",
      ".print-card.purge-card",
      ".print-card.capital-tracker-card",
      ".print-card.deed-card",
      ".print-card.proposal-card",
      ".print-card.rite-card",
      ".supplemental-placeholder-card",
    ];
    const staleFaces = [...documentNode.querySelectorAll(staleSelectors.join(","))];
    if (!staleFaces.length) return html;

    const labels = staleFaces.slice(0, 5).map(face => (
      face.getAttribute("aria-label")
      || [...face.classList].join(".")
    ));
    const remaining = staleFaces.length > labels.length ? ` +${staleFaces.length - labels.length} more` : "";
    throw new Error(`Outdated print faces survived production rendering: ${labels.join("; ")}${remaining}`);
  }

  function contractComponentById(componentId, currentGame = resolvedCurrentGame()) {
    const id = String(componentId || "").trim();
    if (!id) return null;
    return [
      ...(currentGame.sharedComponents || []),
      ...(currentGame.components || []),
    ].find(component => component.id === id) || null;
  }

  function renderProductionLeaderHtml(faction, leader) {
    const currentGame = resolvedCurrentGame();
    const factionId = String(faction?.id || state.factionId || "").trim().toLowerCase();
    const leaderId = String(leader?.id || state.leaderId || "").trim().toLowerCase();
    const canonicalLeader = currentGame.findLeader?.(factionId, leaderId)
      || currentGame.leaders?.find(item => item.faction === factionId && item.id === leaderId);
    if (!canonicalLeader) {
      throw new Error(`Current-game authority cannot resolve selected Leader ${factionId}/${leaderId}.`);
    }

    return productionComponentHtml({
      kind: "leader",
      id: `${factionId}-${canonicalLeader.id}`,
      label: `${canonicalLeader.name} Leader`,
      side: "front",
      backPolicy: "standardBack",
      componentId: `leader:${factionId}:${canonicalLeader.id}`,
    });
  }

  function productionComponentDescriptor(componentId) {
    const component = contractComponentById(componentId);
    if (!component) throw new Error(`Current-game authority cannot resolve supplemental component ${componentId}.`);

    const descriptor = renderDescriptorForComponent(component);
    if (!componentIsPrintableProduction(component, descriptor)) {
      throw new Error(`Current-game authority has no production print renderer for ${component.name || component.id}.`);
    }

    return Object.freeze({
      ...descriptor,
      componentId: component.id,
      name: component.name,
      backPolicy: component.backPolicy || "standardBack",
      orientation: descriptor.orientation || component.orientation || "portrait",
      faction: component.faction || "shared",
      family: component.family || "",
    });
  }

  function productionComponentSource(componentId, side = "front") {
    const descriptor = productionComponentDescriptor(componentId);
    return productionFrameSource({ ...descriptor, side });
  }

  function renderProductionComponentHtml(componentId, side = "front") {
    const descriptor = productionComponentDescriptor(componentId);
    return productionComponentHtml({
      ...descriptor,
      label: descriptor.name,
      side,
    });
  }

  function renderProductionCardHtml(card) {
    const currentGame = resolvedCurrentGame();
    const id = String(card?.id || "").trim();
    const canonicalCard = (currentGame.cards || []).find(item => item.id === id);
    if (!canonicalCard) throw new Error(`Current-game authority cannot resolve playable card ${id || "(missing id)"}.`);
    return productionCardHtml(canonicalCard);
  }

  function renderProductionTerritoryHtml(territory) {
    const currentGame = resolvedCurrentGame();
    const id = String(territory?.id || "").trim();
    const canonicalTerritory = (currentGame.territories || []).find(item => item.id === id);
    if (!canonicalTerritory) throw new Error(`Current-game authority cannot resolve Territory ${id || "(missing id)"}.`);
    return productionTerritoryHtml(canonicalTerritory);
  }

  function productionComponentHtml(options) {
    const {
      kind,
      id,
      side = "front",
      label,
      backPolicy = "",
      componentId = id,
      orientation = "portrait",
    } = options;
    const landscape = orientation === "landscape";
    const source = productionFrameSource({ ...options, kind, id, side, orientation });
    const className = `print-card production-render-component production-render-${kind}${landscape ? " production-render-landscape" : ""}${backPolicy === "standardBack" ? " production-standard-back" : ""}`;
    const frame = `<iframe class="production-component-frame${landscape ? " production-component-frame-landscape" : ""}" data-production-render-frame="true" data-production-render-kind="component" src="${escapeHtml(source)}" title="${escapeHtml(label)} production render" scrolling="no" loading="eager"></iframe>`;
    const content = landscape
      ? `<div class="production-component-landscape-rotate">${frame}</div>`
      : frame;

    return `<article class="${escapeHtml(className)}" data-production-component-kind="${escapeHtml(kind)}" data-production-component-id="${escapeHtml(componentId)}" data-production-component-render-id="${escapeHtml(id)}" data-production-component-side="${escapeHtml(side)}" data-production-back-policy="${escapeHtml(backPolicy)}" data-production-orientation="${escapeHtml(orientation)}" aria-label="${escapeHtml(label)} production render">${content}</article>`;
  }

  function productionCardSource(cardId) {
    return `/card-design/card-review-render.html?card=${encodeURIComponent(cardId)}&fit=production&printArtwork=normalized&rules=${encodeURIComponent(selectedRulesetMode())}`;
  }

  function productionTerritorySource(territoryId) {
    return `/card-design/territory-review-render.html?territory=${encodeURIComponent(territoryId)}&rules=${encodeURIComponent(selectedRulesetMode())}`;
  }

  function productionCardHtml(card) {
    const source = productionCardSource(card.id);
    return `<article class="print-card main-card production-render-card production-standard-back" data-production-card-id="${escapeHtml(card.id)}" data-production-back-policy="standardBack" aria-label="${escapeHtml(card.name)} production card"><iframe class="production-card-frame" data-production-render-frame="true" data-production-render-kind="card" src="${escapeHtml(source)}" title="${escapeHtml(card.name)} production card" scrolling="no" loading="eager"></iframe></article>`;
  }

  function productionTerritoryHtml(territory) {
    const source = productionTerritorySource(territory.id);
    return `<article class="print-card territory production-render-territory production-standard-back" data-production-territory-id="${escapeHtml(territory.id)}" data-production-back-policy="standardBack" aria-label="${escapeHtml(territory.name)} production Territory"><div class="production-territory-rotate"><iframe class="production-territory-frame" data-production-render-frame="true" data-production-render-kind="territory" src="${escapeHtml(source)}" title="${escapeHtml(territory.name)} production Territory" scrolling="no" loading="eager"></iframe></div></article>`;
  }

  function renderDescriptorForComponent(component) {
    const explicit = component.renderSource || {};
    if (explicit.printUrl || explicit.printEndpoint) {
      return {
        kind: "external",
        id: component.id,
        src: explicit.printUrl || explicit.printEndpoint,
      };
    }

    const surface = String(explicit.surface || "");
    const componentId = String(explicit.componentId || "").trim();
    const explicitKind = String(explicit.kind || "").trim();
    if (explicitKind && componentId) return { kind: explicitKind, id: componentId };
    if (/supplemental-card\.js$/i.test(surface) && componentId) {
      return { kind: "supplemental", id: componentId };
    }
    if (/reference-card\.js$/i.test(surface)) {
      return { kind: "reference", id: componentId || component.id };
    }
    if (/proposal-card\.js$/i.test(surface)) {
      return { kind: "proposal", id: componentId || component.id.replace(/^diplomats-proposal-/, "") };
    }
    if (/rite-card\.js$/i.test(surface)) {
      return { kind: "rite", id: componentId || component.id.replace(/^mystics-rite-/, "") };
    }

    if (component.family === "tracker" && componentId) return { kind: "tracker", id: componentId };
    if (component.family === "reference-card") return { kind: "reference", id: component.id };
    if (component.family === "proposal-treaty-card") return { kind: "proposal", id: component.id.replace(/^diplomats-proposal-/, "") };
    if (component.family === "rite-card") return { kind: "rite", id: component.id.replace(/^mystics-rite-/, "") };
    if (component.family === "ritual-card") return { kind: "ritual", id: componentId || component.id.replace(/^mystics-ritual-of-/, "") };
    if (component.family === "ledger") return { kind: "supplemental", id: component.id };
    if (component.family === "deed-card") return { kind: "supplemental", id: component.id, orientation: "landscape" };
    return null;
  }

  function componentIsPrintableProduction(component, descriptor) {
    if (!descriptor) return false;
    if (component.productionStatus === "ready") return true;
    // Final card faces may be printable before their separate supplemental/TTS
    // export status is promoted. The Deckbuilder still uses the canonical
    // production renderer and never falls back to placeholder design.
    return ["proposal-treaty-card", "ledger", "deed-card"].includes(component.family)
      && (component.designStatus || "final") === "final"
      && component.productionStatus === "export-pending";
  }

  function selectedRulesetMode() {
    return deckbuilder.ruleset()?.mode
      || (new URLSearchParams(window.location.search).get("rules") === "candidate" ? "candidate" : "released");
  }

  function productionFrameSource(options) {
    if (options.kind === "external") return options.src;
    const orientation = options.orientation === "landscape" ? "&orientation=landscape" : "";
    return `/card-design/component-render.html?kind=${encodeURIComponent(options.kind)}&id=${encodeURIComponent(options.id)}&side=${encodeURIComponent(options.side || "front")}${orientation}&rules=${encodeURIComponent(selectedRulesetMode())}`;
  }

  function productionBackSource(faction, rotation = null) {
    const safeFaction = String(faction || "intelligence").trim().toLowerCase() || "intelligence";
    const rotationParam = rotation == null ? "" : `&rotation=${encodeURIComponent(String(rotation))}`;
    return `/tts/back-renderer/index.html?faction=${encodeURIComponent(safeFaction)}${rotationParam}`;
  }

  function makeProductionComponent(documentNode, options) {
    const {
      kind,
      id,
      side = "front",
      label,
      backPolicy = "",
      componentId = id,
      orientation = "portrait",
    } = options;
    const landscape = orientation === "landscape";
    const wrapper = documentNode.createElement("article");
    wrapper.className = `print-card production-render-component production-render-${kind}${landscape ? " production-render-landscape" : ""}${backPolicy === "standardBack" ? " production-standard-back" : ""}`;
    wrapper.dataset.productionComponentKind = kind;
    wrapper.dataset.productionComponentId = componentId;
    wrapper.dataset.productionComponentRenderId = id;
    wrapper.dataset.productionComponentSide = side;
    wrapper.dataset.productionBackPolicy = backPolicy;
    wrapper.dataset.productionOrientation = orientation;
    wrapper.setAttribute("aria-label", `${label} production render`);

    const frame = documentNode.createElement("iframe");
    frame.className = `production-component-frame${landscape ? " production-component-frame-landscape" : ""}`;
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "component";
    frame.src = productionFrameSource({ ...options, kind, id, side, orientation });
    frame.title = `${label} production render`;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");

    if (landscape) {
      const rotate = documentNode.createElement("div");
      rotate.className = "production-component-landscape-rotate";
      rotate.append(frame);
      wrapper.append(rotate);
    } else {
      wrapper.append(frame);
    }
    return wrapper;
  }

  function reverseOptionsFor(front, currentGame) {
    const kind = front.dataset.productionComponentKind;
    const componentId = front.dataset.productionComponentId;
    const renderId = front.dataset.productionComponentRenderId;
    const backPolicy = front.dataset.productionBackPolicy;
    if (!["twoSided", "specialBack"].includes(backPolicy)) return null;

    const component = [
      ...(currentGame.sharedComponents || []),
      ...(currentGame.components || []),
    ].find(item => item.id === componentId);
    const descriptor = component ? renderDescriptorForComponent(component) : null;
    if (!component || !descriptor) return null;
    return {
      ...descriptor,
      label: `${component.name} reverse`,
      side: "reverse",
      backPolicy,
      componentId,
    };
  }

  function ensureIntrinsicReversePages(documentNode, currentGame) {
    const frontSelector = '.production-render-component[data-production-component-side="front"][data-production-back-policy="twoSided"], .production-render-component[data-production-component-side="front"][data-production-back-policy="specialBack"]';
    const reverseSelector = '.production-render-component[data-production-component-side="reverse"]';
    const fronts = [...documentNode.querySelectorAll(frontSelector)];
    const frontPages = [...new Set(fronts.map(front => front.closest(".first-page, .card-page")).filter(Boolean))];

    frontPages.forEach((frontPage, pageIndex) => {
      const pageFronts = fronts.filter(front => front.closest(".first-page, .card-page") === frontPage);
      if (!pageFronts.length) return;

      const existingReverses = pageFronts
        .map(front => [...documentNode.querySelectorAll(reverseSelector)]
          .find(reverse => reverse.dataset.productionComponentId === front.dataset.productionComponentId))
        .filter(Boolean);
      const existingReversePages = [...new Set(existingReverses
        .map(reverse => reverse.closest(".card-page"))
        .filter(Boolean))];

      if (existingReversePages.length > 1) {
        throw new Error("Intrinsic reverse faces for one print sheet are split across multiple pages.");
      }

      let backPage = existingReversePages[0] || null;
      const pairName = frontPage.dataset.duplexPair || backPage?.dataset.duplexPair || `intrinsic-sheet-${pageIndex + 1}`;

      if (backPage) {
        markDuplexPair(frontPage, backPage, pairName);
        if (frontPage.nextElementSibling !== backPage) frontPage.after(backPage);
      } else {
        backPage = ensureBackPageForFront(documentNode, frontPage, pairName);
        markDuplexPair(frontPage, backPage, pairName);
      }

      const frontTable = frontPage.querySelector(".card-table");
      const backTable = backPage.querySelector(".card-table");
      if (!frontTable || !backTable) throw new Error("A paired print sheet is missing its card table.");
      const frontCells = [...frontTable.querySelectorAll("td")];
      const backCells = [...backTable.querySelectorAll("td")];

      const placements = pageFronts.map(front => {
        const frontCell = front.closest("td");
        const frontIndex = frontCells.indexOf(frontCell);
        if (frontIndex < 0) throw new Error("Could not locate an intrinsic front face on its print sheet.");

        const componentId = front.dataset.productionComponentId;
        const existingReverse = [...documentNode.querySelectorAll(reverseSelector)]
          .find(reverse => reverse.dataset.productionComponentId === componentId);
        const reverseOptions = existingReverse ? null : reverseOptionsFor(front, currentGame);
        if (!existingReverse && !reverseOptions) {
          throw new Error(`No current-game reverse renderer is declared for ${componentId}.`);
        }

        return {
          frontIndex,
          reverse: existingReverse || makeProductionComponent(documentNode, reverseOptions),
        };
      });

      placements.forEach(({ reverse }) => reverse.remove());
      placements.forEach(({ frontIndex, reverse }) => {
        const backCell = backCells[mirrorIndexForLongEdge(frontIndex)];
        if (!backCell) throw new Error("Could not align an intrinsic reverse face with its front.");
        backCell.replaceChildren(reverse);
      });
    });
  }

  function markDuplexPair(frontPage, backPage, pairName) {
    frontPage.classList.add("duplex-page", "duplex-front-page", "deck-card-front-page");
    backPage.classList.add("duplex-page", "duplex-back-page", "deck-card-back-page");
    frontPage.dataset.duplexPair = pairName;
    backPage.dataset.duplexPair = pairName;
  }

  function pageNeedsStandardBack(frontPage) {
    return Boolean(frontPage.querySelector(
      '.production-standard-back, [data-contract-back-policy="standardBack"]'
    ));
  }

  function ensureStandardBackPages(documentNode) {
    const frontPages = [
      documentNode.querySelector(".first-page"),
      ...documentNode.querySelectorAll(".card-page:not(.duplex-back-page):not(.deck-card-back-page)")
    ].filter(Boolean);

    frontPages.forEach((frontPage, index) => {
      if (!pageNeedsStandardBack(frontPage)) return;
      ensureBackPageForFront(documentNode, frontPage, `deck-sheet-${index + 1}`);
    });
  }

  function ensureBackPageForFront(documentNode, frontPage, fallbackPairName) {
    const existingDirect = frontPage.nextElementSibling?.classList.contains("deck-card-back-page")
      ? frontPage.nextElementSibling
      : null;
    const existingPairName = frontPage.dataset.duplexPair;
    const existingByPair = existingPairName
      ? [...documentNode.querySelectorAll(".deck-card-back-page[data-duplex-pair]")].find(page => page.dataset.duplexPair === existingPairName)
      : null;
    const existing = existingDirect || existingByPair;
    if (existing) {
      const pairName = existingPairName || existing.dataset.duplexPair || fallbackPairName;
      markDuplexPair(frontPage, existing, pairName);
      return existing;
    }

    const frontTable = frontPage.querySelector(".card-table");
    if (!frontTable) throw new Error("A print front page has no card table.");
    const rowCount = frontTable.classList.contains("two-row") ? 2 : 3;
    const isFirstPage = frontPage.classList.contains("first-page");
    const pairName = frontPage.dataset.duplexPair || fallbackPairName;
    const backPage = makeBlankBackPage(documentNode, rowCount, isFirstPage);

    markDuplexPair(frontPage, backPage, pairName);
    frontPage.after(backPage);
    return backPage;
  }

  function replaceProductionBacks(documentNode) {
    const backPages = [...documentNode.querySelectorAll(".deck-card-back-page[data-duplex-pair]")];

    documentNode.querySelectorAll(".deck-card-front-page[data-duplex-pair]").forEach(frontPage => {
      const pairName = frontPage.dataset.duplexPair;
      const backPage = backPages.find(page => page.dataset.duplexPair === pairName);
      if (!backPage) return;

      const frontCells = [...frontPage.querySelectorAll(".card-table td")];
      const backCells = [...backPage.querySelectorAll(".card-table td")];
      frontCells.forEach((frontCell, frontIndex) => {
        const needsStandardBack = frontCell.querySelector(
          '.production-standard-back, [data-contract-back-policy="standardBack"]'
        );
        if (!needsStandardBack) return;

        const backCell = backCells[mirrorIndexForLongEdge(frontIndex)];
        if (!backCell) return;
        backCell.replaceChildren(makeProductionDeckBack(documentNode, standardBackFaction(frontCell)));
      });
    });
  }

  function standardBackFaction(frontCell) {
    if (frontCell.querySelector(".production-render-card, .production-render-territory")) {
      return "intelligence";
    }

    const faction = String(state.factionId || "intelligence").trim().toLowerCase();
    return faction || "intelligence";
  }

  function makeProductionDeckBack(documentNode, faction) {
    const wrapper = documentNode.createElement("article");
    wrapper.className = "print-card production-render-back";
    wrapper.dataset.productionInlineBack = "true";
    wrapper.setAttribute("aria-label", `${faction} production deck-card back`);

    const back = documentNode.createElement("div");
    back.className = "gauntlet-card-back";
    back.dataset.gauntletCardBack = "";
    back.dataset.cardBackFaction = faction;
    wrapper.append(back);
    return wrapper;
  }

  function installInlineCardBackRenderer(documentNode) {
    if (!documentNode.querySelector("[data-production-inline-back]")) return;

    if (!documentNode.querySelector('link[data-production-card-back-style]')) {
      const stylesheet = documentNode.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/card-design/card-back.css";
      stylesheet.dataset.productionCardBackStyle = "true";
      documentNode.head.append(stylesheet);
    }

    if (!documentNode.querySelector('script[data-production-card-back-renderer]')) {
      const script = documentNode.createElement("script");
      script.type = "module";
      script.src = "/card-design/card-back.js";
      script.dataset.productionCardBackRenderer = "true";
      documentNode.head.append(script);
    }
  }

  function addDuplexInstructions(documentNode) {
    const hasPairedPages = Boolean(documentNode.querySelector(".duplex-page, .deck-card-back-page"));
    if (!hasPairedPages) return;

    const summaryBlocks = [...documentNode.querySelectorAll(".summary-side .summary-block")];
    const printNote = summaryBlocks.find(block => /print note/i.test(block.textContent || ""));
    const hasStandardBacks = Boolean(documentNode.querySelector(".production-render-back"));
    const backsNote = hasStandardBacks ? " Playable cards and Territories include mirrored production backs." : "";
    const instructionHtml = `<strong>Print note:</strong> Leader and supplemental cards are included.${backsNote} For paired cards, use Actual Size / 100%, disable headers and footers, and select <strong>Flip on long edge</strong>. Back positions are mirrored to their fronts.`;

    if (printNote) {
      printNote.innerHTML = instructionHtml;
      return;
    }

    const summarySide = documentNode.querySelector(".summary-side");
    if (!summarySide) return;
    const instructions = documentNode.createElement("div");
    instructions.className = "summary-block";
    instructions.innerHTML = instructionHtml;
    summarySide.append(instructions);
  }

  function injectProductionPrintStyles(documentNode) {
    const style = documentNode.createElement("style");
    style.dataset.productionPrintRender = "true";
    style.textContent = `
@page {
  size: letter portrait;
  margin: .25in .5in;
}
.first-page,
.card-page {
  width: 7.5in !important;
  height: 10.5in !important;
  margin: 0 !important;
  overflow: hidden !important;
}
.card-page {
  position: relative !important;
}
.card-table {
  width: 7.5in !important;
  margin: 0 !important;
}
.card-page .card-table {
  height: 10.5in !important;
}
.first-page .card-table.two-row {
  height: 7in !important;
}
.duplex-page,
.deck-card-back-page {
  break-before: page !important;
  page-break-before: always !important;
  break-after: page !important;
  page-break-after: always !important;
}
.deck-card-back-page .card-table {
  position: absolute;
  inset: 0;
}
.deck-card-back-page.first-page-back .card-table.two-row {
  top: 3.5in;
  bottom: auto;
  height: 7in !important;
}
.first-page-back-spacer {
  height: 3.5in;
}
.print-card.production-render-card,
.print-card.production-render-territory,
.print-card.production-render-component,
.print-card.production-render-back {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.print-card.production-render-card,
.print-card.production-render-component,
.print-card.production-render-back {
  display: block !important;
  width: 2.5in;
  height: 3.5in;
}
.production-card-frame,
.production-component-frame {
  display: block;
  width: 2.5in;
  height: 3.5in;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}
.print-card.production-render-territory,
.print-card.production-render-component.production-render-landscape {
  position: relative !important;
}
.production-component-landscape-rotate {
  position: absolute;
  top: 0;
  left: 2.5in;
  width: 3.5in;
  height: 2.5in;
  transform: rotate(90deg);
  transform-origin: top left;
}
.production-render-landscape .production-component-frame {
  display: block;
  width: 3.5in;
  height: 2.5in;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}
.production-territory-rotate {
  position: absolute;
  top: 0;
  left: 2.5in;
  width: 3.5in;
  height: 2.5in;
  transform: rotate(90deg);
  transform-origin: top left;
}
.production-territory-frame {
  display: block;
  width: 3.5in;
  height: 2.5in;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}
.print-card.production-render-back {
  transform: none !important;
}`;
    documentNode.head.append(style);
  }

  function installProductionReadinessGate(documentNode) {
    const script = documentNode.createElement("script");
    script.dataset.productionPrintGate = "true";
    script.textContent = `(() => {
  const timeoutMs = ${RENDER_TIMEOUT_MS};
  const preflights = window.__gauntletPrintPreflights = window.__gauntletPrintPreflights || [];
  const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));

  async function waitForFrame(frame) {
    const deadline = performance.now() + timeoutMs;
    while (performance.now() < deadline) {
      try {
        const body = frame.contentDocument?.body;
        const status = body?.dataset?.renderReady;
        if (status === 'true' || status === 'error') return status;
      } catch (error) {
        console.error('Unable to inspect production print frame', frame.src, error);
        return 'error';
      }
      await delay(25);
    }
    console.error('Timed out waiting for production print frame', frame.src);
    return 'timeout';
  }

  preflights.push(async () => {
    const inlineBacks = [...document.querySelectorAll('[data-production-inline-back]')];
    if (inlineBacks.some(back => !back.querySelector('.gauntlet-card-back__frame'))) {
      throw new Error('One or more production card backs failed to finish rendering. Printing was stopped so the Deck is not printed with incomplete backs.');
    }

    const frames = [...document.querySelectorAll('[data-production-render-frame]')];
    const results = await Promise.all(frames.map(waitForFrame));
    if (results.some(result => result !== 'true')) {
      throw new Error('One or more production card faces failed to finish rendering. Printing was stopped so the Deck is not printed with incomplete cards.');
    }
  });
})();`;
    documentNode.body.append(script);
  }

  function mirrorIndexForLongEdge(index) {
    const row = Math.floor(index / COLUMNS);
    const column = index % COLUMNS;
    return row * COLUMNS + (COLUMNS - 1 - column);
  }

  function makeBlankBackPage(documentNode, rowCount, firstPageBack) {
    const section = documentNode.createElement("section");
    section.className = `card-page deck-card-back-page duplex-back-page blank-card-back-page${firstPageBack ? " first-page-back" : ""}`;

    if (firstPageBack) {
      const spacer = documentNode.createElement("div");
      spacer.className = "first-page-back-spacer";
      section.append(spacer);
    }

    const table = documentNode.createElement("table");
    table.className = `card-table ${rowCount === 2 ? "two-row" : "three-row"}`;
    const body = documentNode.createElement("tbody");

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = documentNode.createElement("tr");
      for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex += 1) {
        row.append(documentNode.createElement("td"));
      }
      body.append(row);
    }

    table.append(body);
    section.append(table);
    return section;
  }
})();
