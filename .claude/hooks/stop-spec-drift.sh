#!/usr/bin/env bash
. "$(dirname "$0")/_common.sh"
cd "$ROOT"
# Already continuing because of this hook -> let the turn end, reset the ledger.
if [ "$(jqi '.stop_hook_active // false')" = "true" ]; then rm -f "$LEDGER"; exit 0; fi
[ -s "$LEDGER" ] || exit 0

out="$(scripts/spec/drift.sh --list "$LEDGER" 2>&1)"; rc=$?
sec="$(scripts/security/quick-scan.sh --list "$LEDGER" 2>&1)"; src=$?
rm -f "$LEDGER"   # one check per batch of edits; the pre-commit hook re-checks everything at commit time
[ $rc -eq 0 ] && [ $src -eq 0 ] && exit 0

reason=""
if [ $rc -ne 0 ]; then
reason="Spec drift check (Stop hook). Code you edited this session has no matching spec update.

$out

Do one of: update the governing spec(s) so they describe what the code now does; or touch 'last_reviewed' in the governing spec to confirm behaviour is unchanged; or add the path to a spec's 'implements:' list. Then tell the user in one line what you reconciled. If you believe no spec change is warranted, say why explicitly instead of stopping silently."
fi
if [ $src -ne 0 ]; then
reason="$reason

Security quick-scan (Stop hook). Code you edited this session matches a known-flaw pattern:

$sec

Fix each line (route the fix through the coder agent), or mark a verified false positive with 'security-scan:allow <reason>' on that line. Then tell the user in one line what you fixed or why it is safe."
fi
jq -n --arg r "$reason" '{decision:"block",reason:$r}'
exit 0
