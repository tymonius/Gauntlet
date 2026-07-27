(() => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installIntelligencePortraitTransform, { once: true });
  } else {
    installIntelligencePortraitTransform();
  }

  function installIntelligencePortraitTransform() {
    const button = document.getElementById("printDeckButton");
    if (!button || button.dataset.intelligencePortraitTransform === "true") return;

    button.dataset.intelligencePortraitTransform = "true";
    button.addEventListener("click", () => {
      const inheritedOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === intelligencePortraitAwareOpen) window.open = inheritedOpen;
      };

      function intelligencePortraitAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => inheritedWrite(frameIntelligencePortraits(html));
        restoreOpen();
        return printWindow;
      }

      window.open = intelligencePortraitAwareOpen;
      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function frameIntelligencePortraits(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    let found = false;

    documentNode.querySelectorAll(".leader-card .leader-art img").forEach(image => {
      const leaderName = String(image.getAttribute("alt") || "").trim().toLowerCase();
      if (leaderName !== "ranger" && leaderName !== "spymaster") return;

      const card = image.closest(".leader-card");
      const art = image.closest(".leader-art");
      if (!card || !art) return;

      found = true;
      card.classList.add("intelligence-leader-card", `${leaderName}-leader-card`);
      card.style.setProperty("grid-template-rows", "1.37in 1fr .16in", "important");
      art.style.setProperty("height", "1.37in", "important");
      art.style.setProperty("min-height", "1.37in", "important");
      art.style.setProperty("max-height", "1.37in", "important");

      image.style.setProperty("position", "absolute", "important");
      image.style.setProperty("left", "0", "important");
      image.style.setProperty("right", "auto", "important");
      image.style.setProperty("bottom", "auto", "important");
      image.style.setProperty("top", leaderName === "ranger" ? "-.015in" : "-.01in", "important");
      image.style.setProperty("width", "100%", "important");
      image.style.setProperty("height", "auto", "important");
      image.style.setProperty("min-width", "100%", "important");
      image.style.setProperty("max-width", "none", "important");
      image.style.setProperty("object-fit", "fill", "important");
      image.style.setProperty("object-position", "initial", "important");
      image.style.setProperty("transform", "none", "important");
    });

    if (!found) return html;
    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }
})();
