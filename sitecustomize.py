"""Temporary correction bootstrap for the final Rules Arbiter benchmark fixes."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent
TARGET = ROOT / "rules-assistant/rules-deterministic.js"
text = TARGET.read_text(encoding="utf-8")
updated = text.replace(
    r'/\bvalor\b/i.test(text) && /\bwithdraw(?:al|rew|n)?\b/i.test(text)',
    r'/\bvalor\b/i.test(text) && /\b(withdraw|withdrawal|withdrew|withdrawn)\b/i.test(text)',
    1,
).replace(
    r'/\b(first battle|first time)\b/i.test(text) && /\bwin|won\b/i.test(text)',
    r'/\b(first battle|first time)\b/i.test(text) && /\b(win|won)\b/i.test(text)',
    1,
).replace(
    r'&& /\bcomplete|completion\b/i.test(text)',
    r'&& /\b(complete|completion)\b/i.test(text)',
    1,
)
if updated == text and "withdraw(?:al|rew|n)?" in text:
    raise RuntimeError("Could not correct Rules Arbiter matcher anchors")
TARGET.write_text(updated, encoding="utf-8")
