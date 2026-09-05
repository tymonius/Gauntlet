#!/usr/bin/env python3
"""Run the frozen v0.6.3 Rulebook production contract."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRODUCTION = ROOT / "legacy" / "v0.6.1-rulebook-publication" / "rulebook-production"
TRANSIENT_SOURCE = PRODUCTION / ".v063-player-facing-input.md"
ARCHIVED_SOURCE = ROOT / "releases" / "v0.6.3" / "Gauntlet_v0.6.3_Rulebook.md"


def main() -> int:
    source = TRANSIENT_SOURCE if TRANSIENT_SOURCE.is_file() else ARCHIVED_SOURCE
    command = [
        sys.executable,
        str(ROOT / "scripts" / "build-rulebook-production.py"),
        "--source",
        str(source),
        "--version",
        "v0.6.3",
        "--production-source",
        str(PRODUCTION / ".v063-production-source.md"),
    ]
    if source == TRANSIENT_SOURCE:
        command.append("--validate-player-chapter-11")
    return subprocess.call(command, cwd=ROOT)


if __name__ == "__main__":
    raise SystemExit(main())
