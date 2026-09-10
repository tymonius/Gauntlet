from pathlib import Path
import json
from datetime import datetime, timezone

worker = Path('rules-assistant/worker-v071.js')
s = worker.read_text(encoding='utf-8')

old_head = '''  const match = current.match(/\\b(?:this|that)\\s+(ability|effect|feature)\\b/i);
  if (!match) return null;

  const noun = String(match[1] || "ability").toLowerCase();'''
new_head = '''  const genericRuleMatch = current.match(/\\b(?:this|that)\\s+(ability|effect|feature)\\b/i);
  const describedCardMatch = current.match(/\\b(?:the|this|that|a)\\s+(?:stored|saved|held|set[ -]?aside)\\s+card\\b/i);
  const match = genericRuleMatch || describedCardMatch;
  if (!match) return null;

  const noun = describedCardMatch ? "card" : String(match[1] || "ability").toLowerCase();'''
if old_head not in s:
    raise SystemExit('Could not find ambiguous-referent helper head')
s = s.replace(old_head, new_head, 1)

old_subjects = '''  const subjects = familyCue.test(recentText)
    ? recentSpecificSubjects(history, retrieval)
    : [];'''
new_subjects = '''  const subjects = noun === "card"
    ? recentSpecificSubjects(history, retrieval)
    : familyCue.test(recentText)
      ? recentSpecificSubjects(history, retrieval)
      : [];'''
if old_subjects not in s:
    raise SystemExit('Could not find ambiguous-referent subject selection')
s = s.replace(old_subjects, new_subjects, 1)

old_answer = '''    answer: `Which ${noun} do you mean? Give me its name or the card, Leader, or Faction feature it comes from, plus the current phase or step, whose turn it is, and any relevant game state that is not already clear from the conversation.`,'''
new_answer = '''    answer: noun === "card"
      ? "Which card do you mean? Give me its name or exact text, plus the current phase or step, whose turn it is, and any relevant game state that is not already clear from the conversation."
      : `Which ${noun} do you mean? Give me its name or the card, Leader, or Faction feature it comes from, plus the current phase or step, whose turn it is, and any relevant game state that is not already clear from the conversation.`,'''
if old_answer not in s:
    raise SystemExit('Could not find ambiguous-referent answer')
s = s.replace(old_answer, new_answer, 1)
worker.write_text(s, encoding='utf-8')

test_path = Path('rules-assistant/v071-ambiguous-referent-clarification.test.mjs')
t = test_path.read_text(encoding='utf-8')
anchor = '  test("self-contained questions are not diverted into clarification", () => {'
addition = '''  test("the reviewed unidentified stored-card question asks for the missing card instead of guessing", () => {
    const result = buildAmbiguousReferentClarification(
      "Can I deploy the stored card now?",
      [],
      []
    );
    expect(result).not.toBeNull();
    expect(result?.rulingStatus).toBe("unresolved");
    expect(result?.responseType).toBe("clarification");
    expect(result?.executionPath).toBe("deterministic-clarification");
    expect(result?.answer).toContain("Which card do you mean?");
    expect(result?.answer).toContain("name or exact text");
  });

  test("a single clearly named recent card keeps stored-card follow-ups eligible for ordinary resolution", () => {
    const history = [
      { role: "user", content: "I used Heresy to store Rend the Veil." },
      { role: "assistant", content: "Rend the Veil is the card you stored." }
    ];
    const retrieval = [
      { canonicalId: "card:mystics-rend-the-veil", title: "Card: Rend the Veil" }
    ];
    expect(buildAmbiguousReferentClarification("Can I deploy the stored card now?", history, retrieval)).toBeNull();
  });

'''
if anchor not in t:
    raise SystemExit('Could not find clarification test insertion point')
test_path.write_text(t.replace(anchor, addition + anchor, 1), encoding='utf-8')

revision_files = [
    'rules-assistant/worker-v071.js',
    'rules-assistant/v071-ambiguous-referent-clarification.test.mjs',
    'rules-assistant/v071-battle-card-replacement-retrieval.test.mjs',
    'rules-assistant/v071-copied-effect-retrieval-review.test.mjs',
    'rules-assistant/v071-fortifications-tactic-choice-review.test.mjs',
    'rules-assistant/v071-short-counterfactual-continuity.test.mjs',
    'rules-assistant/v071-strategic-withdrawal-review.test.mjs',
]
old_revision = 'v071-qa-20260910-2'
new_revision = 'v071-qa-20260910-3'
for filename in revision_files:
    p = Path(filename)
    text = p.read_text(encoding='utf-8')
    if old_revision not in text:
        raise SystemExit(f'Missing expected behavior revision in {filename}')
    p.write_text(text.replace(old_revision, new_revision), encoding='utf-8')

ledger_path = Path('artifacts/rules-refinement/resolution-ledger.json')
ledger = json.loads(ledger_path.read_text(encoding='utf-8'))
entry_id = 'unidentified-stored-card-clarification-v071'
interaction_id = '5b7455c0-0d7b-49db-b526-2793fdc6dd27'
if any(entry.get('id') == entry_id for entry in ledger.get('entries', [])):
    raise SystemExit('Ledger entry already exists')
if any(interaction_id in entry.get('interactionIds', []) for entry in ledger.get('entries', [])):
    raise SystemExit('Interaction already appears in resolution ledger')
now = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
ledger['updatedAt'] = now
ledger.setdefault('entries', []).append({
    'id': entry_id,
    'status': 'resolved',
    'rootCause': 'retrieval',
    'interactionIds': [interaction_id],
    'caseIds': ['unidentified-stored-card-clarification'],
    'resolutionSurface': 'arbiter_clarification',
    'summary': 'The reviewed v0.6.1 answer was already correct: the question did not identify the stored card, so the Arbiter appropriately asked for the missing card or ability. Current v0.7.1 now preserves that behavior deterministically for unidentified stored, saved, held, or set-aside card descriptions while still allowing a single clearly named recent card to resolve from conversation context.',
    'resolvedAt': now,
    'binding': {'behaviorRevision': new_revision},
})
ledger_path.write_text(json.dumps(ledger, indent=2) + '\n', encoding='utf-8')
