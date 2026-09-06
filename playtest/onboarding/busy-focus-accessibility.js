(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("onboardingForm");
    const submitChoice = document.getElementById("submitChoice");
    const submitStatus = document.getElementById("submitStatus");
    const successPanel = document.getElementById("successPanel");
    const refreshRoster = document.getElementById("refreshRoster");
    const organizerStatus = document.getElementById("organizerStatus");

    if (submitStatus) submitStatus.tabIndex = -1;
    if (organizerStatus) organizerStatus.tabIndex = -1;

    let returnSubmitFocus = false;
    let returnRosterFocus = false;

    form?.addEventListener("submit", (event) => {
      if (event.submitter !== submitChoice && document.activeElement !== submitChoice) return;
      returnSubmitFocus = true;
      submitStatus?.focus({ preventScroll: true });
    }, true);

    refreshRoster?.addEventListener("click", () => {
      returnRosterFocus = true;
      organizerStatus?.focus({ preventScroll: true });
    }, true);

    if (submitChoice) {
      new MutationObserver(() => {
        if (!returnSubmitFocus || submitChoice.disabled) return;
        returnSubmitFocus = false;
        if (!successPanel?.hidden) return;
        submitChoice.focus({ preventScroll: true });
      }).observe(submitChoice, { attributes: true, attributeFilter: ["disabled"] });
    }

    if (refreshRoster) {
      new MutationObserver(() => {
        if (!returnRosterFocus || refreshRoster.disabled) return;
        returnRosterFocus = false;
        refreshRoster.focus({ preventScroll: true });
      }).observe(refreshRoster, { attributes: true, attributeFilter: ["disabled"] });
    }
  });
})();
