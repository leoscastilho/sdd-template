#!/usr/bin/env bash
# Shared hook helpers. Hooks receive JSON on stdin; we parse with jq.
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
command -v jq >/dev/null || { echo "Claude hooks require jq; install jq and retry." >&2; exit 2; }
STATE="$ROOT/.claude/state"
mkdir -p "$STATE"
INPUT="$(cat)"
jqi() { printf '%s' "$INPUT" | jq -r "$1"; }
SESSION="$(jqi '.session_id // "nosession"')"
LEDGER="$STATE/touched-$SESSION.txt"
ANNOUNCED="$STATE/announced-$SESSION.txt"
rel() { local p="$1"; p="${p#$ROOT/}"; printf '%s' "$p"; }
