#!/usr/bin/env bash
# Heuristic scan for common secret, injection, unsafe rendering, and logging patterns.
set -u
root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root"
mode="${1:---all}"
case "$mode" in
  --all) files=$(git ls-files);;
  --staged) files=$(git diff --cached --name-only --diff-filter=ACMR);;
  --file) files="${2:-}";;
  *) echo "usage: $0 --all|--staged|--file PATH"; exit 2;;
esac
status=0
for f in $files; do
  [ -f "$f" ] || continue
  case "$f" in scripts/spec/*|.codex/*|.claude/*|.agents/*) continue;; esac
  case "$f" in *.md|*.lock|*.png|*.jpg|*.pdf) continue;; esac
  while IFS=: read -r line text; do
    echo "security-pattern: $f:$line"
    status=1
  done < <(grep -nE 'BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}|password[[:space:]]*=[[:space:]]*[^[:space:]]+|secret[[:space:]]*=[[:space:]]*[^[:space:]]+|eval\(|new Function\(|innerHTML|dangerouslySetInnerHTML' "$f" 2>/dev/null || true)
done
[ "$status" -eq 0 ] && echo "security-scan: no heuristic matches"
exit "$status"
