# Historical public compatibility surfaces

This subtree is the canonical repository source for retired browser applications and compatibility landings that have or will have stable public URL contracts.

The preserved public compatibility sources are:

- `rulebook/` — prepared post-v0.7.2-cutover landing for `/rulebook/`. It will redirect to the active `/rules/` architecture after the release cutover; it is intentionally not the currently published `/rulebook/` source while v0.7.1 remains current.
- `deckbuilder-v0.5/` — historical pre-faction Deckbuilder.
- `deckbuilder-v0.6/` — historical faction-era Deckbuilder.
- `faction-sheets/` — retired printable faction-sheet browser surface.

GitHub Pages stages only the compatibility sources declared by `config/publication-boundary.json`. Prepared-but-dormant landings remain repository artifacts until their explicit lifecycle cutover.

Nothing in this subtree is current gameplay or rules authority. New product behavior belongs in current applications and authority sources, not here. Changes should be limited to explicit compatibility or preservation fixes.
