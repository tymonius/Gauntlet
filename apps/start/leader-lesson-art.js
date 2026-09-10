(() => {
  const LEADER_ART = Object.freeze({
    general: "../images/woodcuts/general.png",
    commandant: "../images/woodcuts/commandant.png",
    ambassador: "../images/woodcuts/ambassador.png",
    senator: "../images/woodcuts/senator.png",
    banker: "../images/woodcuts/banker.png",
    executive: "../images/woodcuts/executive.png",
    ranger: "../images/woodcuts/ranger.png",
    spymaster: "../images/woodcuts/spymaster.png",
    alchemist: "../images/woodcuts/alchemist.png",
    "spirit-walker": "../images/woodcuts/spirit-walker.png",
    "grand-inquisitor": "../images/woodcuts/grand-inquisitor.png",
    "witch-hunter": "../images/woodcuts/witch-hunter.png"
  });

  document.addEventListener("DOMContentLoaded", () => {
    const lesson = document.querySelector("#factionLesson .faction-leader-lesson");
    const leaderChoices = document.getElementById("leaderChoices");
    if (!lesson || !leaderChoices) return;

    const art = document.createElement("img");
    art.className = "leader-lesson-art";
    art.alt = "";
    art.setAttribute("aria-hidden", "true");
    art.loading = "lazy";
    art.decoding = "async";
    art.hidden = true;
    lesson.append(art);

    const sync = () => {
      const leaderId = document.querySelector('input[name="leader"]:checked')?.value || "";
      const src = LEADER_ART[leaderId] || "";
      if (!src) {
        art.hidden = true;
        art.removeAttribute("src");
        art.removeAttribute("data-leader");
        return;
      }

      if (art.dataset.leader !== leaderId) {
        art.src = src;
        art.dataset.leader = leaderId;
      }
      art.hidden = false;
    };

    document.addEventListener("change", event => {
      if (event.target instanceof HTMLInputElement && event.target.name === "leader") sync();
    });

    new MutationObserver(sync).observe(leaderChoices, { childList: true, subtree: true });
    sync();
  });
})();
