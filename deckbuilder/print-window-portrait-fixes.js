(() => {
  const inheritedOpen = window.open.bind(window);

  window.open = function gauntletPrintAwareOpen(...args) {
    const openedWindow = inheritedOpen(...args);
    if (!openedWindow?.document || openedWindow.document.__gauntletPortraitWriteWrapped) return openedWindow;

    const inheritedWrite = openedWindow.document.write.bind(openedWindow.document);
    openedWindow.document.write = html => inheritedWrite(frameIntelligencePortraits(String(html)));
    openedWindow.document.__gauntletPortraitWriteWrapped = true;
    return openedWindow;
  };

  function frameIntelligencePortraits(html) {
    if (!/alt=["'](?:Ranger|Spymaster)["']/i.test(html)) return html;

    const documentNode = new DOMParser().parseFromString(html, "text/html");
    let changed = false;

    documentNode.querySelectorAll(".leader-card .leader-art img").forEach(image => {
      const leaderName = String(image.getAttribute("alt") || "").trim().toLowerCase();
      if (leaderName !== "ranger" && leaderName !== "spymaster") return;

      const card = image.closest(".leader-card");
      const art = image.closest(".leader-art");
      if (!card || !art) return;

      changed = true;
      card.dataset.portraitFraming = "intelligence-wide";
      card.style.setProperty("grid-template-rows", "1.37in 1fr .16in", "important");
      art.style.setProperty("height", "1.37in", "important");
      art.style.setProperty("min-height", "1.37in", "important");
      art.style.setProperty("max-height", "1.37in", "important");

      image.style.setProperty("position", "absolute", "important");
      image.style.setProperty("left", "0", "important");
      image.style.setProperty("right", "auto", "important");
      image.style.setProperty("top", leaderName === "ranger" ? "-.015in" : "-.01in", "important");
      image.style.setProperty("bottom", "auto", "important");
      image.style.setProperty("width", "100%", "important");
      image.style.setProperty("height", "auto", "important");
      image.style.setProperty("min-width", "100%", "important");
      image.style.setProperty("max-width", "none", "important");
      image.style.setProperty("object-fit", "fill", "important");
      image.style.setProperty("object-position", "initial", "important");
      image.style.setProperty("transform", "none", "important");
    });

    return changed ? `<!doctype html>\n${documentNode.documentElement.outerHTML}` : html;
  }
})();
