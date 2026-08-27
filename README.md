# Gauntlet v0.7.0 TTS QA assets

Temporary pre-publication host for the exact machine-ready asset bundle generated for commit c96f479e93be4d3b8814bec135e39cdb5a6bfb95 by Actions run 33123762979 / artifact 9667635952.

- This branch is **not** a Gauntlet release.
- It exists only so Tabletop Simulator can perform clean-client manual QA before v0.7.0 publication.
- The QA scaffold rewrites the network host prefix and appends the source commit as a cache key so TTS cannot silently reuse an older rendered asset at the same deterministic filename.
- After QA approval, the final release pipeline will upload those deterministic filenames to the v0.7.0 GitHub Release.
