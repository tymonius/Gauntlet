const CASES = [
  make("accepted-terms-prevent-onset", /accepted terms|terms (?:are|were|get|got) accepted|accept(?:s|ed)? (?:a |the )?proposal.*battle|battle.*accept/i, "Accepted Terms end the pending battle before Onset. Do not begin a battle, do not resolve Onset, and do not perform Aftermath. Apply the Proposal's Accepted effect and the normal accepted-Terms procedure.", ["Accepted Terms prevent Onset", "pending battle Terms Onset", "Proposal Accepted"]),
  make("refused-terms-proceed-to-onset", /refused terms|terms (?:are|were|get|got) refused|refuse(?:s|d)? (?:a |the )?proposal|what happens after terms are refused/i, "After Terms are refused, apply the Proposal's Refused effect and proceed to Onset unless that effect itself prevents the battle. The resulting battle then follows the normal Gambit, Reserve, Tactic, Outcome, and Aftermath sequence.", ["Refused Terms proceed to Onset", "Proposal Refused"]),
  make("action-phase-limit", /(?:when|which phase).*take an action|action.*opening.*denouement|two actions.*same phase|action opportunity/i, "Normally you take one Action per turn, during either Opening or Denouement. A player may normally take no more than one Action in either phase. Gaining an additional Action increases the total available that turn; it does not by itself permit two Actions in the same phase.", ["Opening Denouement one Action", "additional Action same phase"]),
  make("movement-choices", /advance.*hold.*fall back|what are (?:the )?movement choices|fall back.*retreat|fall back.*withdraw/i, "During ordinary Movement, choose Advance, Hold, or Fall Back. Fall Back is ordinary Movement. It is not a retreat, which follows losing a battle, and it is not a withdrawal, which ends or prevents a pending or active battle without a winner.", ["Advance Hold Fall Back", "retreat withdrawal movement"]),
  make("pending-battle-ends-movement", /unused movement.*(?:terms|battle)|pending battle.*movement|continue moving after.*terms|movement.*accepted terms/i, "Entering the opponent's Position creates a pending battle and ends that Movement sequence. Any unused movement from that sequence is lost. Accepted Terms do not restore it.", ["pending battle ends Movement sequence", "Accepted Terms do not restore movement"]),
  make("defensive-edge", /defensive edge|defender wins ties|who wins (?:a )?tie.*defend/i, "When the defender has Defensive Edge, the defender wins tied battle totals. The defender normally has it while defending a Territory they control or making a Last Stand, unless an effect removes it.", ["Defensive Edge tied battle totals", "Last Stand Defensive Edge"]),
  make("tiebreak-roll", /tiebreak roll|tie.*without defensive edge|arena.*tie|reroll.*tie/i, "If the battle remains tied without Defensive Edge deciding it, make a separate Tiebreak Roll. Each player rolls one die. Do not apply advantage, disadvantage, card effects, numerical modifiers, or the previous battle totals. Higher roll wins; reroll further ties.", ["Tiebreak Roll unmodified", "Arena removes Defensive Edge"]),
  make("front-line-definition", /what is (?:the )?front line|position.*control|token.*beyond.*front line|isolated control/i, "A player's Front Line is the unbroken sequence of Territories they control from their own end. A Player Token may move beyond the Front Line, but Position alone does not create control and control cannot skip an opposing Territory.", ["Front Line contiguous control Position"]),
  make("normal-capture", /capture phase|how (?:does|do) (?:normal )?capture|capture more than one|next opposing territory/i, "During Capture, if your token is on or beyond the next opposing Territory immediately beyond your Front Line, add that Territory to your Front Line. Normal Capture advances the Front Line by at most one Territory per turn.", ["Capture next opposing Territory Front Line", "Normal Capture at most one"]),
  make("pre-onset-withdrawal", /withdraw.*before onset|withdraw.*pending battle|pre-onset withdrawal/i, "A withdrawal before Onset prevents the battle from beginning. There is no battle result and no Aftermath. Move the withdrawing player or players according to the withdrawal geometry stated by the effect.", ["withdrawal before Onset no Aftermath"]),
  make("post-onset-withdrawal", /withdraw.*after onset|safe conduct.*aftermath|post-onset withdrawal/i, "A withdrawal after Onset ends the active battle without a winner. Complete the remaining non-result Aftermath steps, clear committed battle cards using their normal destinations, and do not apply win, loss, retreat, or battle-result effects.", ["withdrawal after Onset non-result Aftermath", "Safe Conduct"]),
  make("withdrawal-geometry", /only defender withdraws|both players withdraw|attacker withdraws.*where|withdrawal geometry/i, "Withdrawal uses the normal positional geometry: an attacking player returns to the Position from which they attacked; a defending player moves one Position toward their own end. If only the defender withdraws, the attacker remains at the contested Position and becomes the occupier when applicable. If both withdraw, move the attacker first and then the defender; no Occupation results from that mutual withdrawal.", ["withdrawal attacker defender geometry", "both players withdraw Occupation"]),
  make("retreat-versus-withdrawal", /difference.*retreat.*withdraw|retreat versus withdrawal|does withdrawal count as a loss|does retreat count as withdrawal/i, "Retreat follows losing a battle and carries the normal win, loss, Occupation, and result consequences. Withdrawal ends or prevents a pending or active battle without a winner. A withdrawal is not a loss and does not trigger effects that require winning or losing.", ["retreat losing player withdrawal no winner"]),
  make("invasion-action", /invasion.*(?:action|movement|terms|onward)|unused invasion movement/i, "Invasion's Action is played during Opening. During that turn's Movement, you may advance up to two additional Positions, one at a time. The additional movement may create a pending battle, but doing so ends the Movement sequence and loses any unused Invasion movement. Accepted Terms do not restore it.", ["Military Invasion Action Opening"]),
  make("invasion-battle", /invasion.*(?:reserve|tactic|battle mode|stack)/i, "When you are the attacker, Invasion's Battle mode lets you form your Reserve with one additional card and choose one additional Tactic. Multiple active effects may each increase those limits unless a specific effect prohibits stacking.", ["Military Invasion Battle Reserve Tactic"]),
  make("good-faith-accepted", /good faith.*accepted|accepted.*good faith/i, "For Good Faith's Accepted result, put that card in your Graveyard, then gain 1 Influence.", ["Good Faith Accepted"]),
  make("gunboat-diplomacy", /gunboat diplomacy/i, "Reveal Gunboat Diplomacy from Hand after offering Terms but before the opponent accepts or refuses. If accepted, put it in your Discard Pile. If refused, set it face up as an additional Gambit in the resulting battle without counting against your Gambit limit; it adds +2. A refusal-set Gunboat Diplomacy is a Gambit and therefore goes to the Graveyard when cleared.", ["Gunboat Diplomacy Terms Accepted Refused"]),
  make("financial-capacity", /financial capacity|treasury value.*territor|financier.*two actions/i, "After Capture and its follow-up effects, but before Draw, compare Treasury value with Territories controlled. If Treasury value is greater, the Financier may take one Action during both Opening and Denouement that turn, provided at least one is a Financier Faction Action. This still does not permit two Actions in one phase.", ["Financial Capacity Treasury value Territories controlled"]),
  make("purge-timing", /when can.*purge|purge.*opening.*denouement|two-phase permission.*purge/i, "Purge is an Inquisition Faction Action that may be taken during Opening or Denouement, normally no more than once per turn. Its adopted two-phase permission lets it use either phase; it does not permit two Purges in one turn unless another effect expressly says so.", ["Inquisition Purge Opening Denouement"]),
  make("final-judgment-purge", /final judgment.*purge|purge.*aftermath.*final judgment/i, "Final Judgment's Aftermath Purge is a directly permitted Faction Ability at that timing. It does not use an Action and is separate from taking the Purge Faction Action during Opening or Denouement.", ["Final Judgment Aftermath Purge Faction Ability"]),
  make("guardians-protection", /guardians of the circle|protect the circle|prevent interruption.*rite|sacrifice.*arcane.*ritual/i, "Guardians of the Circle protects the current progression by sacrificing an Arcane card whose deckbuilding value is at least 1 for the first Rite, 2 for the second Rite, 3 for the third Rite, or 4 for the Ritual of Ascendance.", ["Guardians of the Circle 1 2 3 4"]),
  make("extraordinary-rendition", /extraordinary rendition/i, "Bank Extraordinary Rendition, reveal the opponent's Hand, choose one card there, and bind it face up beneath the Asset. You may have only one banked Extraordinary Rendition. The bound card cannot be played, moved, or affected except by Extraordinary Rendition. Whenever you discard one or more Assets you control, discard Extraordinary Rendition before any others if able; when it leaves play, put the bound card in its owner's Discard Pile.", ["Extraordinary Rendition Action Asset bound card"]),
  make("natures-altar", /nature'?s altar/i, "Nature's Altar may be placed as an Overlay on your current or an adjacent Territory by its Action, or on the contested Territory after you win by its Battle mode. During your Opening while your token is on the overlaid Territory, you may take the Begin a Rite Faction Action. A Rite begun this way may complete that turn only if you control that Territory when its completion condition and timing are satisfied.", ["Nature's Altar Action Battle Overlay"]),
  make("martyrdom", /martyrdom/i, "When you lose a battle while Martyrdom is in your Hand, you may play it during the Aftermath before battle cards are cleared without taking an Action. Cards remaining in the opponent's Reserve go to their Graveyard instead of their Discard Pile during that Aftermath. After clearing battle cards, set your Conviction to 4 and put Martyrdom in your Graveyard. It does not prevent the loss, retreat, Occupation, or other battle-result consequences.", ["Martyrdom Aftermath Reserve Conviction"]),
  make("landslide", /landslide/i, "Landslide may be placed as an Overlay by its Action, or on the contested Territory after you lose and retreat by its Battle mode. When a player retreats onto that Territory, they retreat one additional Position if able, then Landslide goes to its owner's Discard Pile. It triggers from retreat, not Fall Back or withdrawal, and only one Landslide may be on each Territory.", ["Landslide Action Battle Overlay retreat"]),
  make("detente", /d[ée]tente/i, "Bank Détente as an Asset; you may have only one banked Détente. The first time each turn an opponent accepts one of your Proposals that was already ratified when you offered it, gain 1 Influence. It does not trigger when that acceptance is what ratifies the Proposal.", ["Détente Asset already ratified Proposal"]),
  make("compound-interest", /compound interest/i, "Bank Compound Interest as an Asset; you may have only one banked Compound Interest. After your normal Draw, if your Treasury contains at least one card, you may reveal the top card of your Draw Pile and either place it face up in your Treasury or put it in your Discard Pile.", ["Compound Interest Asset Treasury normal Draw"]),
  make("protracted-siege", /protracted siege/i, "Protracted Siege prevents one future Front Line advance onto the overlaid Territory; it does not undo a capture already completed. After it prevents that advance, or if the opposing token leaves the Territory first, put it in its owner's Graveyard.", ["Protracted Siege Front Line advance Overlay"]),
  make("manifest-destiny", /manifest destiny/i, "Manifest Destiny's Battle mode may insert the blank Territory only if placing it between the contested Territory and the Position from which you attacked would make it immediately beyond your Front Line. It then becomes a blank Territory under your control; it cannot create isolated control.", ["Manifest Destiny immediately beyond Front Line"]),
  make("refuge-fall-back", /refuge.*(?:withdraw|fall back)|(?:withdraw|fall back).*refuge/i, "Refuge triggers when a player Falls Back onto it as ordinary Movement. Battle withdrawal does not satisfy that trigger.", ["Refuge Falls Back ordinary Movement"])
];

export function resolveV062DeterministicRuling({ question } = {}) {
  const value = String(question || "").trim();
  if (!value) return null;
  for (const entry of CASES) {
    entry.match.lastIndex = 0;
    if (!entry.match.test(value)) continue;
    return {
      id: entry.id,
      answer: entry.answer,
      rulingStatus: entry.rulingStatus,
      confidence: entry.confidence,
      responseType: entry.responseType,
      sourceQueries: entry.sourceQueries,
      subject: entry.subject || inferSubject(entry.sourceQueries),
      topic: entry.topic || entry.id
    };
  }
  return null;
}

export function materializeV062DeterministicSources(corpus, ruling, limit = 5) {
  if (!ruling || !Array.isArray(corpus?.documents)) return [];
  const queries = Array.isArray(ruling.sourceQueries) ? ruling.sourceQueries : [];
  return corpus.documents
    .map((document) => {
      const haystack = normalize(`${document.title} ${document.heading || ""} ${document.body}`);
      let score = 0;
      for (const query of queries) {
        const terms = normalize(query).split(" ").filter((term) => term.length > 2);
        const hits = terms.filter((term) => haystack.includes(term)).length;
        score += hits * hits;
        if (terms.length && hits === terms.length) score += 20;
      }
      return { document, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.document.title.localeCompare(b.document.title))
    .slice(0, Math.max(1, Math.min(limit, 8)))
    .map(({ document }, index) => ({
      id: document.id || `V062-S${index + 1}`,
      canonicalId: document.id || `V062-S${index + 1}`,
      title: document.title,
      sourcePath: document.sourcePath,
      sourceUrl: document.sourceUrl,
      excerpt: String(document.body || "").slice(0, 1100),
      body: document.body
    }));
}

export const V062_DETERMINISTIC_CASE_COUNT = CASES.length;

function make(id, match, answer, sourceQueries, options = {}) {
  return {
    id,
    match,
    answer,
    sourceQueries,
    rulingStatus: options.rulingStatus || "explicit",
    confidence: options.confidence || "high",
    responseType: options.responseType || "written_rule",
    subject: options.subject || null,
    topic: options.topic || null
  };
}

function inferSubject(sourceQueries) {
  const first = Array.isArray(sourceQueries) ? sourceQueries[0] : "";
  return String(first || "").split(/\s+/).slice(0, 4).join(" ") || null;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
