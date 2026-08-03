"""Temporary branch correction applied by the Rules Arbiter sync script."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent
TARGET = ROOT / "rules-assistant" / "rules-intelligence.js"

if TARGET.exists():
    text = TARGET.read_text(encoding="utf-8")
    text = text.replace(
        '`${document.id || ""}\n${document.body || ""}`'.replace('\\n', '\n'),
        '`${document.id || ""}\\n${document.body || ""}`',
    )
    text = text.replace(
        ').join("\n---\n"));'.replace('\\n', '\n'),
        ').join("\\n---\\n"));',
    )
    TARGET.write_text(text, encoding="utf-8")
