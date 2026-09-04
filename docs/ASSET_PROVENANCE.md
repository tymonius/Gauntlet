# Asset provenance governance

Gauntlet tracks the source and rights basis of creative and source assets so that new files cannot enter the repository without an explicit provenance decision.

## Current legacy baseline

The provenance baseline is commit `4e3967a40a926eb6aa7d8b57d73c1f6cd101608d`.

Governed assets that are byte-for-byte identical to their version at that commit and do not yet have an explicit record are classified as **`legacy-unresolved`**. This is a deliberate statement of uncertainty: it does **not** assert a creator, generation method, ownership basis, license, or permission for those assets.

Legacy assets can be resolved incrementally by adding complete records to `.github/asset-provenance.json`. No unsupported provenance should be inferred or filled in merely to make the ledger look complete.

## What is governed

The policy currently covers creative/source file formats under `images/` and `card-design/`, including raster and vector artwork, PDFs and editable design formats, 3D/source archives, fonts, audio, and video.

`images/artwork/_autoscaled/` is excluded because it contains generated render derivatives. Its files inherit the provenance of their canonical source asset; the canonical source remains governed.

The exact roots, extensions, exclusions, baseline, and explicit records are defined in `.github/asset-provenance.json`.

## Adding or replacing an asset

Every new governed asset, and every changed/replaced governed asset after the baseline, requires an explicit entry in `.github/asset-provenance.json` with all of these fields:

```json
{
  "path": "images/artwork/cards/example/example.png",
  "origin": "project-created",
  "creator": "Name or team responsible for the asset",
  "source": "Where the asset came from or how it was produced",
  "rights": "Ownership, permission, or license basis for repository use",
  "sha256": "64-character SHA-256 digest of the checked-in file",
  "notes": "Optional context"
}
```

`origin` must be one of:

- `project-created` — created directly for Gauntlet by the project or a named contributor;
- `commissioned` — created for Gauntlet by another creator under an identified permission/rights basis;
- `generated` — produced with a generative tool or workflow, with the tool/workflow identified in `source` where known;
- `third-party` — sourced from outside the project under an identified license or permission.

Required provenance fields cannot be satisfied with placeholders such as `unknown`, `TBD`, or `unresolved`. If provenance cannot yet be established for a legacy asset, leave it as `legacy-unresolved`; do not create a false explicit record.

To calculate a file checksum with Python:

```bash
python -c "import hashlib,pathlib; p=pathlib.Path('images/path/to/asset.png'); print(hashlib.sha256(p.read_bytes()).hexdigest())"
```

If the binary contents change later, the checksum no longer matches and CI requires the provenance record to be reviewed and updated.

## Enforcement

`.github/scripts/validate-asset-provenance.py` runs in the Governance Integrity workflow. It fails when:

- a new governed asset has no explicit provenance record;
- a legacy governed asset changes without receiving an explicit record;
- a recorded asset's SHA-256 no longer matches;
- required provenance fields are missing or contain placeholder values;
- a record is duplicated, stale, outside the governed scope, or otherwise malformed; or
- the declared legacy baseline cannot be resolved from repository history.

This makes provenance maintenance part of the normal asset-addition workflow rather than a periodic manual cleanup. Deleting an unrecorded legacy asset does not require a record; replacing it does.
