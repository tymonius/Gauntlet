#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
COMMIT="e3d03c68c182c4ea61947019485b4b09f7ca07b9"
SRC_DIR="releases/v0.6"
OUT_DIR="$ROOT/build/legal/v0.6.0-copyright-deposit"

mkdir -p "$OUT_DIR"

files=(
  "Gauntlet_v0.6.0_Rulebook.pdf"
  "Gauntlet_v0.6.0_Rulebook.md"
  "Gauntlet_v0.6.0_All_Cards_and_Components.pdf"
  "Gauntlet_v0.6.0_Canonical_Data.json"
  "Gauntlet_v0.6.0_Manifest.json"
)

for file in "${files[@]}"; do
  git -C "$ROOT" show "$COMMIT:$SRC_DIR/$file" > "$OUT_DIR/$file"
done

(
  cd "$OUT_DIR"
  sha256sum "${files[@]}" > SHA256SUMS.txt
)

cat > "$OUT_DIR/PROVENANCE.txt" <<EOF
Gauntlet v0.6.0 copyright-deposit recovery
Publication commit: $COMMIT
Historical release path: $SRC_DIR
Recovered from Git object history, not from mutable current release assets.
Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

echo "Recovered publication-snapshot deposit candidates:"
cat "$OUT_DIR/SHA256SUMS.txt"
echo
echo "Output: $OUT_DIR"
