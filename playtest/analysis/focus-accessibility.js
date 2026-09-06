(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const accessPanel = document.getElementById("accessPanel");
    const analysisApp = document.getElementById("analysisApp");
    if (!accessPanel || !analysisApp) return;

    analysisApp.tabIndex = -1;

    const observer = new MutationObserver(() => {
      if (!accessPanel.hidden || analysisApp.hidden) return;
      if (accessPanel.contains(document.activeElement)) {
        analysisApp.focus({ preventScroll: true });
        analysisApp.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    observer.observe(accessPanel, { attributes: true, attributeFilter: ["hidden"] });
    observer.observe(analysisApp, { attributes: true, attributeFilter: ["hidden"] });
  });
})();
