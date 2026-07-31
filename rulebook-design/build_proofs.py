#!/usr/bin/env python3
"""Expand the proof-only compressed sources into browser-renderable files."""

from __future__ import annotations

import base64
from pathlib import Path
import zlib

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source"
OUTPUTS = (
    "proof.css",
    "print-proof.html",
    "browser-proof.html",
)


def expand(name: str) -> None:
    payload_path = SOURCE / f"{name}.z64"
    payload = "".join(payload_path.read_text(encoding="ascii").split())
    data = zlib.decompress(base64.b64decode(payload))
    (ROOT / name).write_bytes(data)


def main() -> None:
    for name in OUTPUTS:
        expand(name)
        print(f"generated {ROOT / name}")


if __name__ == "__main__":
    main()
