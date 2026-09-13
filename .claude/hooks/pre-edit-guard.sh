#!/usr/bin/env bash
. "$(dirname "$0")/_common.sh"
f="$(rel "$(jqi '.tool_input.file_path // ""')")"
[ -z "$f" ] && exit 0

deny() { jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'; exit 0; }
ask()  { jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'; exit 0; }

case "$f" in
  */__generated__/*)
    deny "$f is generated output. Regenerate it from its source instead of editing it." ;;
  specs/INDEX.md)
    deny "specs/INDEX.md is generated. Run 'make spec-index'." ;;
  *package-lock.json|*pnpm-lock.yaml|*yarn.lock|*go.sum)
    deny "$f is a lockfile. Let the package manager / go toolchain write it." ;;
  specs/04-decisions/[0-9]*.md)
    if [ -f "$ROOT/$f" ] && grep -q '^status: accepted' "$ROOT/$f"; then
      ask "$f is an ACCEPTED ADR. ADRs are immutable: write a new ADR that supersedes it (and set this one to 'superseded') unless this is a typo fix."
    fi ;;
  .claude/settings.json|.claude/hooks/*|.githooks/*|scripts/spec/*|scripts/security/*|CLAUDE.md)
    ask "$f is part of the spec-driven guardrails. Confirm this change with the user before altering how enforcement works." ;;
  DESIGN.md|.impeccable/design.json)
    ask "$f is the design token authority, written by the documenter. Confirm with the user before editing it by hand." ;;
esac
exit 0
