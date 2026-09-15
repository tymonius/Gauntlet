# Bespoke reference-card copy

Reference-card copy in this directory is authored as a **player aid**, not generated from faction-guide or rulebook prose.

Each bespoke reference component must keep its canonical rules source separately identified in `config/tts-component-contract.json` as `authoritySource`, with `auditHeadings` naming the rules that must be rechecked when that authority changes.

The reference copy may use fragments, compact procedures, matrices, reminders, and other table-facing language that would be inappropriate as full rules text. It must remain mechanically faithful to its authority source.

## Copy standards

These standards apply to **every** bespoke reference card, faction-specific and universal:

- State the baseline rule directly. Do not hedge it with `normal`, `normally`, or similar wording; an effect that creates an exception is responsible for stating that exception.
- Prefer telling the player what happens over listing things that do not happen.
- Include a negative restriction or exclusion only when it resolves a plausible rules ambiguity, distinguishes mechanically meaningful states, or prevents a real interaction error.
- Prefer positive scope statements when they carry the same rule cleanly: state what counts, what a permission uses, what remains in effect, or what procedure continues.
- Compact classifications such as **No Action**, explicit resource restrictions, mutual exclusivity, and trigger exclusions are appropriate when players genuinely need them to operate the mechanic correctly.
- Do not repeat unchanged baseline behavior merely to say a faction feature leaves it unchanged.

Migration is incremental. Components without `copyMode: "bespoke"` continue to use their existing source until their own compact reference copy is authored and reviewed.
