#!/usr/bin/env bash
# Report code changes whose governing spec was not also changed.
# Usage:
#   drift.sh              working tree + untracked vs HEAD
#   drift.sh --staged     staged changes only (pre-commit)
#   drift.sh --list FILE  only the paths listed in FILE (one per line; the Stop hook's session ledger)
# Exit 0 = clean, 1 = drift found. Output is human/agent readable.
set -u
. "$(dirname "$0")/_lib.sh"
cd "$ROOT"

mode="${1:-}"
case "$mode" in
  --staged) changed="$(git diff --cached --name-only --diff-filter=ACMR)" ;;
  --list)   changed="$(sort -u "$2" 2>/dev/null)" ;;
  *)
    if git rev-parse --verify HEAD >/dev/null 2>&1; then
      changed="$({ git diff --name-only --diff-filter=ACMR HEAD; git ls-files --others --exclude-standard; } | sort -u)"
    else
      changed="$({ git diff --cached --name-only; git ls-files --others --exclude-standard; } | sort -u)"
    fi ;;
esac

changed_specs=""; changed_code=""
for f in $changed; do
  f="${f#$ROOT/}"
  is_spec_path "$f" && changed_specs="$changed_specs $f"
  is_code_path "$f" && changed_code="$changed_code $f"
done

[ -z "$changed_code" ] && { echo "spec-drift: no code changes to check"; exit 0; }

drift=0; unclaimed=""; stale=""
for f in $changed_code; do
  gov="$(governing_specs "$f")"
  if [ -z "$gov" ]; then
    unclaimed="$unclaimed\n  $f"; drift=1; continue
  fi
  ok=0
  for s in $gov; do
    case " $changed_specs " in *" $s "*) ok=1 ;; esac
  done
  if [ $ok -eq 0 ]; then
    stale="$stale\n  $f  ->  $(echo $gov | tr '\n' ' ')"; drift=1
  fi
done

if [ $drift -eq 0 ]; then
  echo "spec-drift: clean — every changed code file has a governing spec that was also updated"; exit 0
fi
echo "spec-drift: DRIFT DETECTED"
[ -n "$stale" ] && { echo; echo "Code changed, governing spec NOT updated:"; printf "$stale\n"; }
[ -n "$unclaimed" ] && { echo; echo "Code changed that NO spec claims (add the path to a spec's 'implements:' list):"; printf "$unclaimed\n"; }
echo
echo "Resolve by: (a) updating the governing spec so it describes the new behaviour (bump last_reviewed), or"
echo "            (b) if behaviour is unchanged (refactor/typo), touch last_reviewed in the spec to confirm you checked it, or"
echo "            (c) if this code is genuinely spec-free, add it to a spec's implements list or to is_ignored_code in scripts/spec/_lib.sh."
exit 1
