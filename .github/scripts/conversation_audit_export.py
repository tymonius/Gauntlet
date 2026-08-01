"""Shared ChatGPT export parsing helpers for the Gauntlet conversation audit."""
from __future__ import annotations

import hashlib
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

ID_RE = re.compile(r"^- Conversation ID: `([^`]+)`$", re.MULTILINE)
SHARD_RE = re.compile(r"conversations(?:-\d+)?\.json$", re.IGNORECASE)


def die(message: str) -> "NoReturn":
    raise SystemExit(f"excluded review error: {message}")


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def timestamp(value: Any) -> str | None:
    if value in (None, ""):
        return None
    try:
        return datetime.fromtimestamp(float(value), timezone.utc).isoformat()
    except (TypeError, ValueError, OverflowError, OSError):
        return str(value)


def part_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "\n".join(filter(None, map(part_text, value)))
    if isinstance(value, dict):
        for key in ("text", "content", "caption", "result", "value"):
            if isinstance(value.get(key), str):
                return value[key]
        return f"[{value.get('content_type') or value.get('type') or 'structured content'}]"
    return "" if value is None else str(value)


def message_text(message: dict[str, Any]) -> str:
    content = message.get("content") or {}
    if not isinstance(content, dict):
        return ""
    parts = content.get("parts")
    if isinstance(parts, list):
        rendered = "\n".join(filter(None, map(part_text, parts))).strip()
        if rendered:
            return rendered
    for key in ("text", "result", "content"):
        if isinstance(content.get(key), str) and content[key].strip():
            return content[key].strip()
    return ""


def message_role(message: dict[str, Any]) -> str:
    author = message.get("author") or {}
    return str(author.get("role") or "unknown").lower() if isinstance(author, dict) else "unknown"


def conversation_id(conversation: dict[str, Any]) -> str:
    value = conversation.get("id") or conversation.get("conversation_id")
    if value:
        return str(value)
    seed = f"{conversation.get('title') or ''}\0{conversation.get('create_time') or ''}"
    return "synthetic-" + digest(seed)[:24]


def _read_array(raw: str, label: str) -> list[dict[str, Any]]:
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        die(f"cannot parse {label}: {exc}")
    if not isinstance(value, list):
        die(f"{label} is not a JSON array")
    return [item for item in value if isinstance(item, dict)]


def load_export(source: Path) -> tuple[dict[str, dict[str, Any]], list[str]]:
    rows: list[dict[str, Any]] = []
    labels: list[str] = []
    if source.is_file() and zipfile.is_zipfile(source):
        with zipfile.ZipFile(source) as archive:
            names = sorted(name for name in archive.namelist() if SHARD_RE.search(name))
            if not names:
                die(f"no conversation shards in {source}")
            for name in names:
                rows += _read_array(archive.read(name).decode("utf-8"), f"{source}::{name}")
                labels.append(f"{source}::{name}")
    else:
        folder = source if source.is_dir() else source.parent
        files = sorted(path for path in folder.iterdir() if SHARD_RE.search(path.name))
        if not files:
            die(f"no conversation shards at {source}")
        for path in files:
            rows += _read_array(path.read_text(encoding="utf-8"), str(path))
            labels.append(str(path))

    by_id: dict[str, dict[str, Any]] = {}
    for row in rows:
        cid = conversation_id(row)
        previous = by_id.get(cid)
        if previous is None or (row.get("update_time") or 0) > (previous.get("update_time") or 0):
            by_id[cid] = row
    return by_id, labels


def collect_selected_ids(paths: Sequence[Path]) -> set[str]:
    found: set[str] = set()
    files: list[Path] = []
    for path in paths:
        files += sorted(path.glob("selected_transcripts_part_*.md")) if path.is_dir() else [path]
    for path in dict.fromkeys(files):
        found.update(ID_RE.findall(path.read_text(encoding="utf-8")))
    if not found:
        die("no selected conversation IDs found in transcript files")
    return found
