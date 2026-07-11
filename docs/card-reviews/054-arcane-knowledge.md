# 054. Arcane Knowledge

**Status:** Approved  
**v0.5.7 source name:** Witchcraft  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

**Name:** Witchcraft  
**Cost:** 3

**Action:**

> Return one other card from your Graveyard to your discard pile.

**Battle:**

> When Witchcraft is revealed, choose one non-Witchcraft card in your Graveyard whose eligible Battle effect can still resolve. Witchcraft uses that Battle effect for this battle. Leave the chosen card in your Graveyard.

## v0.6 decision

- **Name:** Arcane Knowledge
- **Cost:** 4
- **Allegiance:** Neutral
- **Trait:** Arcane
- **Starter eligible:** No
- **Complexity:** Advanced
- **Watchlist:** Graveyard toolbox flexibility, repeated access to premium Battle effects, and copied-effect chains

### Action

> Return a card from your Graveyard to your discard pile.

### Battle

> When Arcane Knowledge is revealed, choose a card in your Graveyard with a Battle effect that can resolve in this battle. Resolve that effect as if you had played it. Leave the chosen card in your Graveyard.

## Cross-card name swap

The v0.5.7 card named **Arcane Knowledge** is renamed **Witchcraft** in v0.6. It retains its previously approved mechanics, cost 5, Arcane allegiance, and Advanced complexity:

> **Action:** Bank Witchcraft as an Asset. Once per turn during a battle, Witchcraft may use the eligible Battle effect of one other card you played in that battle.
>
> **Battle:** Witchcraft may use the eligible Battle effect of one other card you played in this battle.

Final eligibility wording for Witchcraft remains part of the copied-effect rules cleanup.

## Approved copied-effect rule amendment

> A card effect that resolves another card's Battle effect cannot select a Battle effect that would itself resolve another card's Battle effect.

This replaces card-specific exclusions such as **non-Witchcraft** and prevents recursive copying chains across Arcane Knowledge, Witchcraft, Treason, and similar effects.

## Assessment

### Neutral-pool impact

Arcane Knowledge demonstrates that cards with the Arcane trait are not automatically locked behind Arcane allegiance. Limited magical study and recovered lore may appear in the Neutral pool, while the Arcane faction retains the highest density and strongest systemic exploitation of such cards.

### Faction-system interaction

As a Neutral Arcane-trait card, Arcane Knowledge can trigger anti-Arcane mechanics such as Heresy outside a direct Arcane-faction matchup. The Arcane faction can exploit it more efficiently through Invocation, Transmutation, Rites, and Graveyard interactions without making the card faction-exclusive.

### Rationale

- Swap the names because **Arcane Knowledge** better describes recovering and applying a preserved effect from the Graveyard, while **Witchcraft** better describes actively reproducing another effect manifested in the current battle.
- Replace **one other card** with **a card** in the Action because Arcane Knowledge has already left the hand and cannot target itself there.
- Remove the printed **non-Witchcraft** exclusion and handle recursive copying through one general rule.
- Raise the cost from 3 to 4 because the Battle effect acts as a flexible additional copy of the best eligible effect already available in the Graveyard.
- Keep the card Neutral with the Arcane trait so magic can be accessed outside the faction without granting access to the Arcane faction's full engine.

## Follow-up

- Rewrite Witchcraft's final copied-effect eligibility wording during the comprehensive copied-effect rules pass.
- Test Arcane Knowledge in non-Arcane decks and in Arcane decks with Invocation, Transmutation, Necromancy, and Rites.
- Roll the name swap and cards 48–54 into the consolidated Review Log and Metadata registry at the next batch checkpoint.
