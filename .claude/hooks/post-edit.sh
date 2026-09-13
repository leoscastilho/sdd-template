#!/usr/bin/env bash
. "$(dirname "$0")/_common.sh"
. "$ROOT/scripts/spec/_lib.sh"
cd "$ROOT"
f="$(rel "$(jqi '.tool_input.file_path // ""')")"
[ -z "$f" ] && exit 0
echo "$f" >> "$LEDGER"

ctx=""
if is_spec_path "$f"; then
  out="$(scripts/spec/lint.sh "$f" 2>&1)"
  if ! echo "$out" | tail -1 | grep -q ' 0 error'; then
    echo "Spec lint failed for $f — fix the frontmatter before continuing:" >&2
    echo "$out" | grep -E '^(ERROR|WARN)' >&2
    exit 2
  fi
  case "$f" in
    specs/03-contracts/*)
      ctx="Contract $f changed. Nothing is generated from it: check that every producer and consumer still matches the new shape, then check specs whose depends_on lists this contract." ;;
    specs/04-decisions/*)
      ctx="ADR $f written/changed. Make sure: the open question it resolves is removed from specs/OPEN-QUESTIONS.md, and every spec it affects lists it under 'decisions:' and reflects the decision in its body." ;;
  esac
elif is_code_path "$f"; then
  # Immediate security feedback on the file just written. Non-blocking here; the Stop hook blocks.
  if [ -f "$f" ]; then
    sec="$(scripts/security/quick-scan.sh --file "$f" 2>&1)" || ctx="Security quick-scan on $f:
$sec
"
  fi
  if ! grep -qx "$f" "$ANNOUNCED" 2>/dev/null; then
    echo "$f" >> "$ANNOUNCED"
    gov="$(governing_specs "$f")"
    if [ -n "$gov" ]; then
      ctx="${ctx}Governing spec(s) for $f: $(echo $gov | tr '\n' ' '). If behaviour, interface, config or infra shape changed, update that spec in this session (the Stop hook will check)."
    else
      ctx="${ctx}No spec claims $f. Before finishing, add its path to the 'implements:' list of the spec that describes it (or write one with /spec-new)."
    fi
  fi
fi

if [ -n "$ctx" ]; then
  jq -n --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$c}}'
fi
exit 0
