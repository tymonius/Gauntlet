"""Build exact-turn records for classifier-excluded conversations."""
from __future__ import annotations

import re
from collections import defaultdict, deque
from typing import Any

from conversation_audit_export import canonical, conversation_id, digest, message_role, message_text, timestamp

SCHEMA = "gauntlet.excluded-conversation-review.v1"
SIGNALS = {
    "gauntlet": re.compile(r"\bgauntlet\b", re.I),
    "repository": re.compile(r"tymonius/Gauntlet|github\.com/tymonius/Gauntlet", re.I),
    "deckbuilder": re.compile(r"\bdeck\s*builder\b", re.I),
    "rules-arbiter": re.compile(r"\brules arbiter\b", re.I),
    "leader-art": re.compile(r"\b(banker|executive|general|commandant|ambassador|senator|alchemist|occultist|inquisitor|zealot|spymaster|operative)\b.{0,80}\b(leader|sketch|art|image)\b|\b(leader|sketch|art|image)\b.{0,80}\b(banker|executive|general|commandant|ambassador|senator|alchemist|occultist|inquisitor|zealot|spymaster|operative)\b", re.I | re.S),
    "repo-path": re.compile(r"(?:images|docs|releases|governance|website|deckbuilder)/[\w./-]+", re.I),
    "game-terms": re.compile(r"\b(Territor(?:y|ies)|Asset Bank|Last Stand|Action|Action Opportunity|Reserve|Gambit|Tactic|Battle Hand|Graveyard|faction|Leader Card)\b", re.I),
}


def _nodes(conversation: dict[str, Any]) -> dict[str, dict[str, Any]]:
    result = {}
    mapping = conversation.get("mapping") or {}
    if not isinstance(mapping, dict):
        return result
    for node_id, node in mapping.items():
        if isinstance(node, dict) and isinstance(node.get("message"), dict):
            result[str(node_id)] = {
                "node_id": str(node_id),
                "parent": str(node.get("parent")) if node.get("parent") else None,
                "message": node["message"],
            }
    return result


def _current_path(conversation: dict[str, Any], nodes: dict[str, dict[str, Any]]) -> list[str]:
    chain, seen = [], set()
    current = str(conversation.get("current_node") or "")
    while current in nodes and current not in seen:
        seen.add(current)
        chain.append(current)
        current = nodes[current]["parent"] or ""
    return list(reversed(chain))


def _record(node: dict[str, Any] | None) -> dict[str, Any] | None:
    if not node:
        return None
    message = node["message"]
    rendered = message_text(message)
    if not rendered:
        return None
    return {
        "message_id": str(message.get("id") or node["node_id"]),
        "timestamp": timestamp(message.get("create_time")),
        "text": rendered,
        "text_sha256": digest(rendered),
    }


def _preceding_assistant(node: dict[str, Any], nodes: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    current, seen = node["parent"], set()
    while current in nodes and current not in seen:
        seen.add(current)
        candidate = nodes[current]
        if message_role(candidate["message"]) == "assistant" and message_text(candidate["message"]):
            return candidate
        current = candidate["parent"]
    return None


def _first_assistant_descendants(node_id: str, nodes: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    children: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for candidate in nodes.values():
        if candidate["parent"]:
            children[candidate["parent"]].append(candidate)
    queue, found, seen = deque(children[node_id]), [], set()
    while queue:
        candidate = queue.popleft()
        if candidate["node_id"] in seen:
            continue
        seen.add(candidate["node_id"])
        if message_role(candidate["message"]) == "assistant" and message_text(candidate["message"]):
            found.append(candidate)
        else:
            queue.extend(children[candidate["node_id"]])
    return found


def build_record(conversation: dict[str, Any]) -> dict[str, Any]:
    nodes = _nodes(conversation)
    path = _current_path(conversation, nodes)
    path_index = {node_id: index for index, node_id in enumerate(path)}
    user_nodes = [node for node in nodes.values() if message_role(node["message"]) == "user"]
    user_nodes.sort(key=lambda node: (node["message"].get("create_time") is None, node["message"].get("create_time") or 0, node["node_id"]))

    turns = []
    for node in user_nodes:
        on_path = node["node_id"] in path_index
        after = []
        if on_path:
            index = path_index[node["node_id"]]
            for later_id in path[index + 1 :]:
                later = nodes[later_id]
                if message_role(later["message"]) == "assistant" and message_text(later["message"]):
                    after = [later]
                    break
                if message_role(later["message"]) == "user":
                    break
        if not after:
            after = _first_assistant_descendants(node["node_id"], nodes)
        rendered = message_text(node["message"]) or "[empty or non-text user content]"
        turns.append({
            "message_id": str(node["message"].get("id") or node["node_id"]),
            "node_id": node["node_id"],
            "timestamp": timestamp(node["message"].get("create_time")),
            "on_current_path": on_path,
            "text": rendered,
            "text_sha256": digest(rendered),
            "preceding_assistant": _record(_preceding_assistant(node, nodes)),
            "following_assistants": [item for item in map(_record, after) if item],
        })

    title = str(conversation.get("title") or "Untitled conversation")
    signal_text = "\n".join([title, *(turn["text"] for turn in turns)])
    matched = [name for name, pattern in SIGNALS.items() if pattern.search(signal_text)]
    current_count = sum(turn["on_current_path"] for turn in turns)
    result = {
        "schema": SCHEMA,
        "conversation_id": conversation_id(conversation),
        "title": title,
        "create_time": timestamp(conversation.get("create_time")),
        "update_time": timestamp(conversation.get("update_time")),
        "signal_score": len(matched),
        "matched_signals": matched,
        "mapping_message_nodes": len(nodes),
        "user_turns": len(turns),
        "current_path_user_turns": current_count,
        "off_path_user_turns": len(turns) - current_count,
        "turns": turns,
    }
    result["record_sha256"] = digest(canonical(result))
    return result
