(() => {
  const STORAGE_KEY = "gauntlet_deck_prep_submission_versions_v1";
  const code = new URLSearchParams(window.location.search).get("code") || "";
  if (!code) return;

  document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("requestList");
    if (!list) return;
    let scheduled = false;
    const inspect = () => {
      scheduled = false;
      const versions = readVersions();
      let changed = false;
      list.querySelectorAll(".request-card").forEach(card => {
        const select = card.querySelector("[data-request-status]");
        const submitted = card.querySelector(".request-meta span:nth-child(2)")?.textContent?.trim() || "";
        const participantId = select?.dataset.requestStatus || "";
        if (!select || !participantId || !submitted) return;
        const key = `${code}:${participantId}`;
        const previous = versions[key];
        if (previous && previous !== submitted && select.value !== "requested") {
          versions[key] = submitted;
          changed = true;
          select.value = "requested";
          select.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        }
        if (previous !== submitted) {
          versions[key] = submitted;
          changed = true;
        }
      });
      if (changed) writeVersions(versions);
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(inspect);
    };
    new MutationObserver(schedule).observe(list, { childList: true, subtree: true });
    schedule();
  });

  function readVersions() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function writeVersions(value) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* The queue remains usable without revision memory. */ }
  }
})();
