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

pandoc "$BUILD/rulebook-prepared.md" \
  --from=gfm+raw_html \
  --resource-path="$ROOT:$RELEASE" \
  --lua-filter="$ROOT/scripts/pagebreak.lua" \
  --standalone --section-divs --toc --toc-depth=1 \
  --css="$RELEASE/rulebook.css" \
  --css="$RELEASE/rulebook-section-layout.css" \
  --css="$RELEASE/rulebook-booklet.css" \
  --css="$RELEASE/rulebook-booklet-refinements.css" \
  -o "$BUILD/rulebook-booklet.html"

pandoc "$BUILD/reference-prepared.md" \
  --from=gfm+raw_html \
  --resource-path="$ROOT:$RELEASE" \
  --lua-filter="$ROOT/scripts/pagebreak.lua" \
  --standalone --section-divs \
  --css="$RELEASE/rulebook.css" \
  --css="$RELEASE/rulebook-section-layout.css" \
  -o "$BUILD/reference.html"

weasyprint --base-url "$ROOT" "$BUILD/rulebook.html" "$RELEASE/Gauntlet_v0.6.0_Rulebook.pdf"
weasyprint --base-url "$ROOT" "$BUILD/rulebook-booklet.html" "$BUILD/rulebook-booklet-unpadded.pdf"
python3 scripts/impose-booklet.py \
  "$BUILD/rulebook-booklet-unpadded.pdf" \
  "$RELEASE/Gauntlet_v0.6.0_Rulebook_Booklet.pdf" \
  "$RELEASE/Gauntlet_v0.6.0_Rulebook_Booklet_Print.pdf"
weasyprint --base-url "$ROOT" "$BUILD/reference.html" "$RELEASE/Gauntlet_v0.6.0_Reference_Guide.pdf"

rulebook_pages="$(pdfinfo "$RELEASE/Gauntlet_v0.6.0_Rulebook.pdf" | awk '/^Pages:/ {print $2}')"
booklet_pages="$(pdfinfo "$RELEASE/Gauntlet_v0.6.0_Rulebook_Booklet.pdf" | awk '/^Pages:/ {print $2}')"
booklet_print_pages="$(pdfinfo "$RELEASE/Gauntlet_v0.6.0_Rulebook_Booklet_Print.pdf" | awk '/^Pages:/ {print $2}')"
reference_pages="$(pdfinfo "$RELEASE/Gauntlet_v0.6.0_Reference_Guide.pdf" | awk '/^Pages:/ {print $2}')"

if (( rulebook_pages < 22 || rulebook_pages > 30 )); then
  echo "Unexpected rulebook page count: $rulebook_pages" >&2
  exit 1
fi
if (( booklet_pages < 32 || booklet_pages > 80 || booklet_pages % 4 != 0 )); then
  echo "Unexpected booklet page count: $booklet_pages" >&2
  exit 1
fi
if (( booklet_print_pages * 2 != booklet_pages )); then
  echo "Unexpected imposed booklet page count: $booklet_print_pages for $booklet_pages booklet pages" >&2
  exit 1
fi
if (( reference_pages < 2 || reference_pages > 30 )); then
  echo "Unexpected reference-guide page count: $reference_pages" >&2
  exit 1
fi

if ! pdfinfo "$RELEASE/Gauntlet_v0.6.0_Rulebook_Booklet.pdf" | grep -Eq '^Page size:[[:space:]]+396 x 612 pts'; then
  echo "Booklet is not half-letter portrait." >&2
  pdfinfo "$RELEASE/Gauntlet_v0.6.0_Rulebook_Booklet.pdf" >&2
  exit 1
fi
if ! pdfinfo "$RELEASE/Gauntlet_v0.6.0_Rulebook_Booklet_Print.pdf" | grep -Eq '^Page size:[[:space:]]+792 x 612 pts'; then
  echo "Print-imposed booklet is not Letter landscape." >&2
  pdfinfo "$RELEASE/Gauntlet_v0.6.0_Rulebook_Booklet_Print.pdf" >&2
  exit 1
fi

for ((page=1; page<=rulebook_pages; page++)); do
  chars="$(pdftotext -f "$page" -l "$page" "$RELEASE/Gauntlet_v0.6.0_Rulebook.pdf" - | tr -d '[:space:]' | wc -c)"
  if (( chars < 12 )); then
    echo "Rulebook page $page appears blank." >&2
    exit 1
  fi
done

first_booklet_blank=0
for ((page=1; page<=booklet_pages; page++)); do
  chars="$(pdftotext -f "$page" -l "$page" "$RELEASE/Gauntlet_v0.6.0_Rulebook_Booklet.pdf" - | tr -d '[:space:]' | wc -c)"
  if (( chars < 12 )); then
    if (( first_booklet_blank == 0 )); then
      first_booklet_blank=$page
    fi
  elif (( first_booklet_blank != 0 )); then
    echo "Booklet has a blank page before later content (page $first_booklet_blank)." >&2
    exit 1
  fi

  # The cover is intentionally sparse, and up to three final pages may be
  # imposition padding. Every interior content page should contain substantial
  # rulebook text rather than only running furniture or a stranded sentence.
  if (( page > 1 && first_booklet_blank == 0 && chars < 200 )); then
    echo "Booklet page $page is suspiciously sparse ($chars non-whitespace characters)." >&2
    exit 1
  fi
done
if (( first_booklet_blank != 0 && booklet_pages - first_booklet_blank + 1 > 3 )); then
  echo "Booklet has more than three trailing padding pages." >&2
  exit 1
fi

for ((page=1; page<=reference_pages; page++)); do
  chars="$(pdftotext -f "$page" -l "$page" "$RELEASE/Gauntlet_v0.6.0_Reference_Guide.pdf" - | tr -d '[:space:]' | wc -c)"
  if (( chars < 12 )); then
    echo "Reference page $page appears blank." >&2
    exit 1
  fi
done

for pdf in \
  "$RELEASE/Gauntlet_v0.6.0_Rulebook.pdf" \
  "$RELEASE/Gauntlet_v0.6.0_Rulebook_Booklet.pdf"; do
  if pdftotext "$pdf" - | grep -Eq 'images/(sketches|qr)/|!\[[^]]+\]\('; then
    echo "$(basename "$pdf") contains unresolved image markup." >&2
    exit 1
  fi
done

pdftoppm -png -r 72 "$RELEASE/Gauntlet_v0.6.0_Rulebook.pdf" "$VALIDATION/rulebook-page"
pdftoppm -png -r 96 "$RELEASE/Gauntlet_v0.6.0_Rulebook_Booklet.pdf" "$VALIDATION/booklet-page"
pdftoppm -png -r 72 "$RELEASE/Gauntlet_v0.6.0_Rulebook_Booklet_Print.pdf" "$VALIDATION/booklet-print-page"
pdftoppm -png -r 90 "$RELEASE/Gauntlet_v0.6.0_Reference_Guide.pdf" "$VALIDATION/reference-page"
python3 scripts/make-pdf-contact-sheets.py "$VALIDATION" 'rulebook-page-*.png' "$VALIDATION/rulebook-contact"
python3 scripts/make-pdf-contact-sheets.py "$VALIDATION" 'booklet-page-*.png' "$VALIDATION/booklet-contact" --chunk 24
python3 scripts/make-pdf-contact-sheets.py "$VALIDATION" 'booklet-print-page-*.png' "$VALIDATION/booklet-print-contact" --chunk 24
python3 scripts/make-pdf-contact-sheets.py "$VALIDATION" 'reference-page-*.png' "$VALIDATION/reference-contact" --chunk 24

echo "Rendered rulebook: $rulebook_pages pages"
echo "Rendered booklet: $booklet_pages half-letter pages"
echo "Rendered print-imposed booklet: $booklet_print_pages Letter landscape sides"
echo "Rendered reference guide: $reference_pages pages"
