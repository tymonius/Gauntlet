# Clean v0.6.3 current-release metadata — validation status

Status before merge: **candidate**.

This slice closes the derived-metadata portion of issue #590 without publishing anything. The candidate registry contains ten reconstructed release surfaces and requires one exact authority-set ID across all of them.

Validation requires:

- complete authority ID `64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49` on every registered surface;
- certified Rulebook, canonical-data, and starter-deck hashes;
- 128 playable cards, 25 Territories, six factions, 12 Leaders, and 12 approved starters;
- `Second Line` and `Smuggler's Run` identity invariants;
- clean print/export metadata of nine print documents, nine PDFs, and three JSON exports;
- current public release still v0.6.1;
- v0.6.2 and v0.6.3 lifecycle states still withdrawn;
- no mutation of protected v0.6.1 public surfaces or preserved withdrawn release evidence;
- publication still locked and post-publication gauntlet.run / production Worker verification still pending.

Passing this gate means the reconstructed release metadata is internally consistent. It does **not** mean v0.6.3 has been published or that post-merge production verification has occurred.
