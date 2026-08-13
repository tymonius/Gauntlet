# Clean v0.6.2 Faction Authority Reconstruction

This directory contains the six self-contained faction authority candidates for the clean v0.6.2 reconstruction.

They are generated deterministically from the definitive v0.6.1 faction guides plus only the approved v0.6.2 decision layer. The withdrawn v0.6.2 Rulebook and combined faction guide are explicitly forbidden as authority skeletons and are used only as historical evidence.

The generated candidates are not published rules. They remain subject to semantic review and certification before downstream canonical data, browser, Rules Arbiter, digital, print, or publication work may rely on them.

Regenerate and validate with:

```bash
node scripts/build-clean-v062-faction-authority.mjs
node scripts/validate-clean-v062-faction-authority.mjs
```
