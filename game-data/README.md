# Current Gauntlet game data

`game-data/current-game.json` is the root authority for the active Gauntlet development build, with `game-data/current-game.mjs` responsible for resolving the full current-game object consumed by runtime surfaces.

Current-development tools and render surfaces must **not** choose versioned source files independently. They consume the resolved current-game service in `game-data/current-game.mjs` (browser/runtime) or the corresponding Node authority helpers under `scripts/`.

## Authority model

The current-game authority declares or centrally resolves:

- the active development version and base release;
- the provenance inputs that define the current playable-card pool;
- the complete current Territory and Proposal sources;
- current Arcane-symbol clarification rules;
- current Leader definitions;
- current Mystics Rite/Ritual definitions;
- the current physical-component contract;
- canonical manual artwork positioning saved by the Card Design compositor;
- explicit resolution semantics for additions, revisions, and retirements.

The resolver turns those inputs into one current-game object. A consumer receives that resolved object; it does not decide source precedence itself.

For playable cards, stable IDs are authoritative. Resolution is:

1. begin with the immutable base-release card pool;
2. remove declared retirements;
3. replace any existing stable ID supplied by the current card-change source;
4. add any new stable ID supplied by the current card-change source.

This makes an update to an existing card propagate exactly like a new card: once the authority's current change record is updated, every current consumer sees the same resolved card.

## Artwork positioning

The Card Design compositor remains the authoring surface for manual artwork composition. Its canonical save file is `tts/artwork-direction-overrides.js`, keyed by the same stable card/Territory IDs used by current-game data.

`game-data/current-game.mjs` resolves that canonical input into `currentGame.artDirection` and `currentGame.artDirectionFor(id)`. Current production card and Territory renderers consume those resolved values rather than independently loading an artwork-position source. Because Deckbuilder preview/printing and Card Reference reuse those renderers, an approved compositor save propagates to all of them.

The existing artwork-authoring GitHub App does not need additional repository permissions, OAuth changes, new secrets, or a different save path for this arrangement: it continues to update the same canonical file on the same authoring branch and open/reuse the same pull request. The authority change is downstream consumption, not a new privileged operation.

## What may remain version-pinned

Published release snapshots are immutable historical artifacts. Release-generation and release-verification code may intentionally target a named published release when its job is explicitly to reproduce that release.

That is different from a current-development consumer. Card Reference, Deckbuilder, Card Design, production review/print renderers, Rules Arbiter candidate corpus, and current digital-game adapters must resolve through the current-game authority.

## Adding or changing current content

Do **not** add a new source URL or merge rule to an individual UI, renderer, or tool.

Instead:

1. update the appropriate authority input, or add a new input declaration to `current-game.json` if a genuinely new content family is introduced;
2. teach the central resolver how that family resolves, if necessary;
3. consume the resolved field from downstream tools;
4. add or update authority tests so direct source selection cannot creep back into downstream code.

Physical card components follow the same rule. Their identity, quantity, production status, renderer declaration, and back policy come from the component contract selected by the current-game authority. Presentation geometry may remain local to a renderer because it is layout, not game data.

## Static build adapters

Some TypeScript build surfaces cannot dynamically import an arbitrary JSON path at runtime. Those adapters must import `current-game.json`, verify that any statically bundled input is the exact source declared by the authority, and fail the build on a mismatch. They must not define their own precedence or version selection.

## Guardrails

`tests/current-game-authority.test.ts` prevents active runtime surfaces from directly selecting the raw v0.6.4 source files, verifies stable-ID replacement/retirement semantics, and verifies that compositor-authored artwork direction is resolved through current-game before production rendering.

If a future current-development tool needs game data, the default answer is: **load the current-game authority, not another versioned file.**
