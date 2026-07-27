#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
RELEASE="$ROOT/releases/v0.6.0"
VALIDATION="$ROOT/build/v0.6.0/card-validation"
mkdir -p "$VALIDATION"
find "$VALIDATION" -maxdepth 1 -type f -name '*.png' -delete

node scripts/build-v0.6.0-card-sheets.mjs

python3 -m http.server 8000 --bind 127.0.0.1 > "$ROOT/build/v0.6.0/card-server.log" 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
sleep 2
GAUNTLET_BASE_URL=http://127.0.0.1:8000 node scripts/print-v0.6.0-card-sheets.mjs

pdfunite \
  "$RELEASE/Gauntlet_v0.6.0_Neutral_Cards.pdf" \
  "$RELEASE/Gauntlet_v0.6.0_Territories.pdf" \
  "$RELEASE/Gauntlet_v0.6.0_Military_Cards_and_Components.pdf" \
  "$RELEASE/Gauntlet_v0.6.0_Diplomat_Cards_and_Components.pdf" \
  "$RELEASE/Gauntlet_v0.6.0_Financier_Cards_and_Components.pdf" \
  "$RELEASE/Gauntlet_v0.6.0_Intelligence_Cards_and_Components.pdf" \
  "$RELEASE/Gauntlet_v0.6.0_Mystics_Cards_and_Components.pdf" \
  "$RELEASE/Gauntlet_v0.6.0_Inquisition_Cards_and_Components.pdf" \
  "$RELEASE/Gauntlet_v0.6.0_All_Cards_and_Components.pdf"

for pdf in "$RELEASE"/Gauntlet_v0.6.0_*Cards*.pdf "$RELEASE/Gauntlet_v0.6.0_Territories.pdf"; do
  test -s "$pdf"
  pdfinfo "$pdf" | grep '^Pages:'
done

all_pages="$(pdfinfo "$RELEASE/Gauntlet_v0.6.0_All_Cards_and_Components.pdf" | awk '/^Pages:/ {print $2}')"
if (( all_pages < 20 || all_pages > 40 )); then
  echo "Unexpected combined card PDF page count: $all_pages" >&2
  exit 1
fi

pdftoppm -png -r 72 "$RELEASE/Gauntlet_v0.6.0_All_Cards_and_Components.pdf" "$VALIDATION/all-cards-page"
python3 scripts/make-pdf-contact-sheets.py "$VALIDATION" 'all-cards-page-*.png' "$VALIDATION/all-cards-contact" --chunk 20

echo "Rendered combined card package: $all_pages pages"
