(() => {
  const SKETCHES = Object.freeze({
    general: "../images/sketches/general.png",
    commandant: "../images/sketches/commandant.png",
    ambassador: "../images/sketches/ambassador.png",
    senator: "../images/sketches/senator.png",
    banker: "../images/sketches/banker.png",
    executive: "../images/sketches/executive.png",
    ranger: "../images/sketches/ranger.png",
    spymaster: "../images/sketches/spymaster.png",
    alchemist: "../images/sketches/alchemist.png",
    "spirit-walker": "../images/sketches/spirit%20walker.png",
    "grand-inquisitor": "../images/sketches/grand%20inquisitor.png",
    "witch-hunter": "../images/sketches/witch%20hunter.png"
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
      const src = SKETCHES[leaderId] || "";
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
