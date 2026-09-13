#!/usr/bin/env bash
# PreToolUse guard for Bash. Patterns are anchored to COMMAND POSITION (line start, or after ; && || | ( $( )
# so that prose inside heredocs/echo strings that merely mentions a command does not trip them.
. "$(dirname "$0")/_common.sh"
cmd="$(jqi '.tool_input.command // ""')"
[ -z "$cmd" ] && exit 0

deny() { jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'; exit 0; }
ask()  { jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'; exit 0; }
P='(^|[;&|(]|\$\()[[:space:]]*(sudo[[:space:]]+)?(env[[:space:]]+[^[:space:]]+[[:space:]]+)?'   # command-position prefix
has() { printf '%s\n' "$cmd" | grep -Eq "$P$1"; }

# Hard stops: the user runs these by hand.
has 'git[[:space:]]+push\b.*([[:space:]]-f\b|--force)'                   && deny "Force-push is not allowed. Ask the user."
has 'git[[:space:]]+push\b.*[[:space:]](origin[[:space:]]+)?(main|master)\b' && ask "Pushing to main directly. Confirm with the user."

# Ask first: local data loss or history rewriting.
has 'docker[[:space:]]+compose\b.*[[:space:]]down\b.*([[:space:]]-v\b|--volumes)' && ask "This drops local Docker volumes (persisted application data). Confirm."
has 'docker[[:space:]]+(volume[[:space:]]+(rm|prune)|system[[:space:]]+prune)\b' && ask "This removes Docker volumes/images. Confirm the target is local only."
has 'git[[:space:]]+(reset[[:space:]]+--hard|checkout[[:space:]]+--[[:space:]]+\.|clean[[:space:]]+-[a-zA-Z]*f)' && ask "This discards working-tree changes. Confirm."
has 'rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*[[:space:]]+' && ! printf '%s\n' "$cmd" | grep -Eq 'node_modules|/dist\b|/build\b|__generated__|scratchpad|/tmp/|\.claude/state' && ask "Recursive delete outside build/generated dirs. Confirm."
has '(pnpm[[:space:]]+)?(npx[[:space:]]+)?prisma[[:space:]]+(migrate[[:space:]]+reset|db[[:space:]]+push)\b' && ask "prisma migrate reset / db push rewrites the database outside the normal migration workflow. Confirm the target is local/dev."
printf '%s\n' "$cmd" | grep -Eiq '^[[:space:]]*(psql|sqlite3)?.*\bdrop[[:space:]]+(table|database|schema)\b' && ask "SQL DROP detected. Confirm the target database is local/dev."
exit 0
