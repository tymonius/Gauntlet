# Clean v0.6.2 Digital Base — Source Boundary

This reconstruction is an isolated executable base for later clean-v0.6.3 digital propagation. It is not a publication surface and does not replace the current v0.6.1 digital pointer.

## Semantic authority

The primary authority is the certified clean-v0.6.2 authority set `563ce3a0ac39a0bbba52cc113ae9ffbcaeb3c0985bad4cfa66fe462fb2cacb3b`:

- clean v0.6.2 Rulebook;
- Military faction guide;
- Diplomat faction guide;
- Financier faction guide;
- Intelligence faction guide;
- Mystics faction guide; and
- Inquisition faction guide.

The exact paths and SHA-256 values are recorded in `manifest.json` and are rechecked by the dedicated validator.

## Neutral Landslide exception

The certified seven-file authority set contains no separate Neutral card guide. The exact v0.6.2 Landslide decision is therefore traced directly to the accepted design record in [issue #481](https://github.com/tymonius/Gauntlet/issues/481), including the owner's accepted comment locking cost 4, Action/Battle/Overlay modes, one-Landslide-per-Territory restriction, retreat-only trigger, consecutive chaining, and Discard-Pile destination.

This historical decision record is supplemental authority evidence for **Landslide only**. It is not used as a general substitute for the certified clean authority set.

## Historical implementation evidence only

The following may be inspected to understand prior implementation attempts but are explicitly forbidden as semantic inputs:

- `src/v062/`;
- `src/content/v062.ts`;
- withdrawn/published v0.6.2 structured data and release files;
- `src/v063/`;
- `src/content/v063.ts`.

The clean modules import none of them.

The audit identified concrete reasons not to inherit the old v0.6.2 digital layer:

1. its Front Line capture helper increments the capturing player's control without transferring an opponent-controlled Territory, so the real 3–3 opening state cannot capture correctly;
2. its retreat helper clamps at the Territory-column edge, preventing required retreat beyond the Gauntlet;
3. its pending-battle geometry cannot represent a Last Stand beyond the Territory column; and
4. its Martyrdom helper collapses distinct Before-Clear / During-Clear / After-Clear timing into one immediate mutation.

## Structured-data boundary

There is no reconstructed clean-v0.6.2 canonical-data artifact. This PR therefore does **not** create a content adapter by pointing at withdrawn v0.6.2 JSON. It implements only authority-backed executable behavior.

The later clean-v0.6.3 digital layer may bind to the already reconstructed clean-v0.6.3 canonical data only after this behavioral base is accepted.

## Publication boundary

- `src/content/current.ts` remains v0.6.1.
- No current public route changes.
- No release lifecycle change.
- No v0.6.2 or v0.6.3 publication.
