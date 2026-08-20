# Sliding tracker card design

The covering card or card stack is the pointer.

- At **0**, the tracker is fully covered.
- For a positive value, slide the covering card or stack upward until its **bottom edge** aligns with the registration line immediately above the current value band.
- The exposed band below that line states the value in large text, e.g. **1 COMMAND**, **2 COMMAND**.
- Trackers remain face-up and public.
- Tracker cards retain the standard faction metadata footer for visual and production consistency with the rest of the card set: **FACTION · TRACKER · VERSION**. The footer occupies the card's existing lower metadata strip; the tracker scale begins immediately above it rather than adding a second reserved gap.
- All tracker cards use the same full-size 2.5 × 3.5 inch supplemental-card geometry and faction parchment treatment.
- Actual faction resources carry one compact **STANDARD [RESOURCE] CAP** line sourced from the authoritative tracked-value maximum. An uncapped resource such as Intel reads **STANDARD INTEL CAP · NONE**. Operation Progress is a progression value rather than a resource and therefore carries no cap line.
- Each tracker includes a full-width Caslon italic usage sentence naming its actual covering card or stack and explaining which bottom edge aligns to the registration line.
- Every tracker uses the same 2.56-inch tracking field above the metadata footer. Each physical range divides that field into equal-height value bands, retaining substantially more registration-line spacing than the earlier instruction-heavy layout.

## Intelligence nested stack

The Intelligence trackers are one three-card sliding assembly, from bottom to top:

1. **Operation Progress Tracker**
2. **Intel Tracker**
3. **selected Intelligence Leader Card**

Move the **Intel Tracker and Leader together** over the Operation Progress Tracker to show Operation Progress. The bottom edge of the Intel Tracker is the Operation Progress pointer. Then move the **Leader alone** over the Intel Tracker to show current Intel. This allows the two tracked values to remain independently readable while sharing one compact physical stack.

The Mission and Operations Reference Cards remain ordinary reference components and are not used as tracker covers.

## Physical scales

| Tracker | Physical scale | Covering card / stack | Rationale |
|---|---:|---|---|
| Command | 0–4 | selected Military Leader Card | v0.6.3 rules cap Command at 2, but the physical component intentionally includes modest headroom for cap-increasing effects and near-term rules evolution. |
| Influence | 0–10 | selected Diplomat Leader Card | Current hard rules maximum is 10. |
| Intel | 0–12 | selected Intelligence Leader Card | Intel is uncapped, so the printed endpoint is based on normal live-game behavior rather than theoretical hoarding. Special Operation readiness normally takes 3–4 completed Missions. The current competitive Ranger starter's Mission pool averages about 2.4 Intel per completion and Spymaster's about 2.25, putting gross Intel earned by readiness around 7–10 before Surveillance, Interference, Fieldcraft, Special Operation payment, or other spending. A 12-space tracker therefore covers the expected high-water range with modest insurance. This is a rules-and-deck estimate; the repository does not currently contain logged peak-Intel session data. |
| Operation Progress | 0–8 | Intel Tracker + selected Intelligence Leader Card | Operation Progress is uncapped, but Special Operation readiness only needs Progress to exceed opposing controlled Territories. A six-Territory game makes 6 a conservative relevant threshold, so 8 provides two points of insurance. |
| Conviction | 0–4 | selected Inquisition Leader Card | Current hard rules maximum is 4. |

A printed endpoint is the capacity of the physical tracking component, not a rules maximum unless the faction rules independently define one.

## Durability rule

When a resource has a hard rules maximum, the tracker should at minimum cover that value and may include modest additional headroom where near-term effects are expected to raise the cap. When a resource is uncapped, choose a practical capacity from normal-game behavior and add a small buffer rather than attempting an unusably dense theoretical maximum.
