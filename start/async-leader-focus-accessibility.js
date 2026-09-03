(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const choices = document.getElementById("leaderChoices");
    if (!choices) return;

    let focusedLeaderId = "";

    document.addEventListener("focusin", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.name === "leader" && choices.contains(target)) {
        focusedLeaderId = target.value;
      } else if (!(target instanceof Node) || !choices.contains(target)) {
        focusedLeaderId = "";
      }
    });

    new MutationObserver(() => {
      if (!focusedLeaderId || choices.contains(document.activeElement)) return;
      const replacement = [...choices.querySelectorAll('input[name="leader"]')]
        .find((input) => input.value === focusedLeaderId && input.checked);
      if (!replacement) return;
      window.requestAnimationFrame(() => {
        if (replacement.isConnected && replacement.checked) replacement.focus({ preventScroll: true });
      });
    }).observe(choices, { childList: true });
  });
})();
