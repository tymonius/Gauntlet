# Bespoke reference-card copy

Reference-card copy in this directory is authored as a **player aid**, not generated from faction-guide or rulebook prose.

Each bespoke reference component must keep its canonical rules source separately identified in `config/tts-component-contract.json` as `authoritySource`, with `auditHeadings` naming the rules that must be rechecked when that authority changes.

The reference copy may use fragments, compact procedures, matrices, reminders, and other table-facing language that would be inappropriate as full rules text. It must remain mechanically faithful to its authority source.

Migration is incremental. Components without `copyMode: "bespoke"` continue to use their existing source until their own compact reference copy is authored and reviewed.
