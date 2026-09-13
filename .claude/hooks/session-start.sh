#!/usr/bin/env bash
. "$(dirname "$0")/_common.sh"
cd "$ROOT"
# Prune ledgers older than 7 days so state/ does not grow forever.
find "$STATE" -name 'touched-*' -mtime +7 -delete 2>/dev/null
find "$STATE" -name 'announced-*' -mtime +7 -delete 2>/dev/null

echo "## Spec-driven project orientation (from SessionStart hook)"
echo
echo "Read CLAUDE.md rules first. Specs are the source of truth; code is derived."
echo
cur="$(grep -m1 -E '^## .*\(current\)' specs/ROADMAP.md 2>/dev/null | sed 's/^## //')"
[ -n "$cur" ] && echo "**Current milestone:** $cur"
# grep -c prints a count even when it exits 1 (zero matches); only a missing file yields no output, so default with ${:-0}.
oq="$(grep -c '^### Q' specs/OPEN-QUESTIONS.md 2>/dev/null)"; oq="${oq:-0}"
blocking="$(grep -E '^\*\*Blocks:\*\*' specs/OPEN-QUESTIONS.md 2>/dev/null | grep -vc 'nothing')"; blocking="${blocking:-0}"
echo "**Open questions:** $oq total, $blocking marked as blocking something. See specs/OPEN-QUESTIONS.md before implementing anything they touch."
echo
echo "**Spec status counts:**"
scripts/spec/audit.sh 2>/dev/null | sed -n '/-- status summary --/,/^$/p' | grep -v -- '--' | sed 's/^/ /'
echo
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  dirty="$(git status --porcelain | wc -l | tr -d ' ')"
  echo "**Working tree:** $dirty changed path(s). Drift check on the tree:"
  scripts/spec/drift.sh 2>/dev/null | head -12 | sed 's/^/ /'
else
  echo "**Working tree:** no commits yet."
fi
echo
echo "Slash commands: /spec-new, /implement <spec>, /decide, /spec-sync, /spec-audit. Make targets: make spec-lint|spec-index|spec-drift|spec-audit."
exit 0
