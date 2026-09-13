#!/usr/bin/env bash
# Whole-repo traceability audit. Exit 1 if unclaimed code exists.
# Usage: audit.sh [--verbose]   (--verbose also lists implements globs of not-yet-built specs)
set -u
. "$(dirname "$0")/_lib.sh"
cd "$ROOT"
verbose=0; [ "${1:-}" = "--verbose" ] && verbose=1

echo "== spec-audit =="
echo
echo "-- Code files with no governing spec --"
n=0
for f in $(repo_files); do
  is_code_path "$f" || continue
  [ -z "$(governing_specs "$f")" ] && { echo "  $f"; n=$((n+1)); }
done
[ $n -eq 0 ] && echo "  (none)"
echo
echo "-- implements globs matching no files (implementing/implemented specs; --verbose for all) --"
m=0
for s in $(spec_files); do
  rel="${s#$ROOT/}"; status="$(fm_get "$s" status)"
  while IFS= read -r g; do
    [ -z "$g" ] && continue
    hit=0
    for f in $(repo_files); do glob_match "$g" "$f" && { hit=1; break; }; done
    if [ $hit -eq 0 ]; then
      case "$status" in implementing|implemented) echo "  $rel: '$g' (status $status — should exist)"; m=$((m+1)) ;; *) [ $verbose -eq 1 ] && echo "  $rel: '$g' (status $status — not built yet, ok)" ;; esac
    fi
  done < <(fm_list "$s" implements)
done
echo
echo "-- status summary --"
for st in draft approved implementing implemented deprecated proposed accepted superseded rejected; do
  c=0; for s in $(spec_files); do [ "$(fm_get "$s" status)" = "$st" ] && c=$((c+1)); done
  [ $c -gt 0 ] && printf "  %-13s %d\n" "$st" "$c"
done
echo
lint_output="$("$ROOT/scripts/spec/lint.sh")"; lint_status=$?
printf '%s\n' "$lint_output"
[ $n -eq 0 ] && [ $m -eq 0 ] && [ $lint_status -eq 0 ]
