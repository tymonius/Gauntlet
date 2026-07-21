#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
BUILD="$ROOT/build/v0.6.0"
RELEASE="$ROOT/releases/v0.6.0"
VALIDATION="$BUILD/validation"

mkdir -p "$BUILD" "$VALIDATION"
find "$VALIDATION" -maxdepth 1 -type f -name '*.png' -delete

python3 scripts/prepare-v0.6-markdown.py rulebook "$RELEASE/Gauntlet_v0.6.0_Rulebook.md" "$BUILD/rulebook-prepared.md"
python3 scripts/prepare-v0.6-markdown.py reference "$RELEASE/Gauntlet_v0.6.0_Reference_Guide.md" "$BUILD/reference-prepared.md"
python3 scripts/create-v0.6-reference-docx.py

pandoc "$BUILD/rulebook-prepared.md" \
  --from=gfm+raw_html \
  --resource-path="$ROOT:$RELEASE" \
  --lua-filter="$ROOT/scripts/pagebreak.lua" \
  --reference-doc="$BUILD/reference.docx" \
  --toc --toc-depth=1 \
  -o "$RELEASE/Gauntlet_v0.6.0_Rulebook.docx"

pandoc "$BUILD/reference-prepared.md" \
  --from=gfm+raw_html \
  --resource-path="$ROOT:$RELEASE" \
  --lua-filter="$ROOT/scripts/pagebreak.lua" \
  --reference-doc="$BUILD/reference.docx" \
  -o "$RELEASE/Gauntlet_v0.6.0_Reference_Guide.docx"

pandoc "$BUILD/rulebook-prepared.md" \
  --from=gfm+raw_html \
  --resource-path="$ROOT:$RELEASE" \
  --lua-filter="$ROOT/scripts/pagebreak.lua" \
  --standalone --section-divs --toc --toc-depth=1 \
  --css="$RELEASE/rulebook.css" \
  --css="$RELEASE/rulebook-section-layout.css" \
  -o "$BUILD/rulebook.html"

pandoc "$BUILD/reference-prepared.md" \
  --from=gfm+raw_html \
  --resource-path="$ROOT:$RELEASE" \
  --lua-filter="$ROOT/scripts/pagebreak.lua" \
  --standalone --section-divs \
  --css="$RELEASE/rulebook.css" \
  --css="$RELEASE/rulebook-section-layout.css" \
  -o "$BUILD/reference.html"

weasyprint --base-url "$ROOT" "$BUILD/rulebook.html" "$RELEASE/Gauntlet_v0.6.0_Rulebook.pdf"
weasyprint --base-url "$ROOT" "$BUILD/reference.html" "$RELEASE/Gauntlet_v0.6.0_Reference_Guide.pdf"

rulebook_pages="$(pdfinfo "$RELEASE/Gauntlet_v0.6.0_Rulebook.pdf" | awk '/^Pages:/ {print $2}')"
reference_pages="$(pdfinfo "$RELEASE/Gauntlet_v0.6.0_Reference_Guide.pdf" | awk '/^Pages:/ {print $2}')"

if (( rulebook_pages < 25 || rulebook_pages > 100 )); then
  echo "Unexpected rulebook page count: $rulebook_pages" >&2
  exit 1
fi
if (( reference_pages < 2 || reference_pages > 30 )); then
  echo "Unexpected reference-guide page count: $reference_pages" >&2
  exit 1
fi

for ((page=1; page<=rulebook_pages; page++)); do
  chars="$(pdftotext -f "$page" -l "$page" "$RELEASE/Gauntlet_v0.6.0_Rulebook.pdf" - | tr -d '[:space:]' | wc -c)"
  if (( chars < 12 )); then
    echo "Rulebook page $page appears blank." >&2
    exit 1
  fi
done

for ((page=1; page<=reference_pages; page++)); do
  chars="$(pdftotext -f "$page" -l "$page" "$RELEASE/Gauntlet_v0.6.0_Reference_Guide.pdf" - | tr -d '[:space:]' | wc -c)"
  if (( chars < 12 )); then
    echo "Reference page $page appears blank." >&2
    exit 1
  fi
done

pdftoppm -png -r 72 "$RELEASE/Gauntlet_v0.6.0_Rulebook.pdf" "$VALIDATION/rulebook-page"
pdftoppm -png -r 90 "$RELEASE/Gauntlet_v0.6.0_Reference_Guide.pdf" "$VALIDATION/reference-page"
python3 scripts/make-pdf-contact-sheets.py "$VALIDATION" 'rulebook-page-*.png' "$VALIDATION/rulebook-contact"
python3 scripts/make-pdf-contact-sheets.py "$VALIDATION" 'reference-page-*.png' "$VALIDATION/reference-contact" --chunk 24

echo "Rendered rulebook: $rulebook_pages pages"
echo "Rendered reference guide: $reference_pages pages"
