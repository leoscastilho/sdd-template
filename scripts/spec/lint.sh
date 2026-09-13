#!/usr/bin/env bash
# Validate spec frontmatter. Usage: lint.sh [file...]  (default: all specs). Exit 1 on errors.
set -u
. "$(dirname "$0")/_lib.sh"
cd "$ROOT"

errors=0; warnings=0
err()  { echo "ERROR   $1"; errors=$((errors+1)); }
warn() { echo "WARN    $1"; warnings=$((warnings+1)); }

files="$*"; [ -z "$files" ] && files="$(spec_files)"
all_ids="$(for s in $(spec_files); do fm_get "$s" id; done)"

for f in $files; do
  case "$f" in /*) rel="${f#$ROOT/}" ;; *) rel="$f" ;; esac
  case "$rel" in specs/README.md|specs/INDEX.md|specs/OPEN-QUESTIONS.md|specs/ROADMAP.md|*/_*) continue ;; esac
  [ -f "$rel" ] || { err "$rel: not found"; continue; }
  [ "$(head -1 "$rel")" = "---" ] || { err "$rel: missing frontmatter"; continue; }

  id="$(fm_get "$rel" id)"; title="$(fm_get "$rel" title)"; type="$(fm_get "$rel" type)"; status="$(fm_get "$rel" status)"
  [ -n "$id" ]     || err "$rel: missing id"
  [ -n "$title" ]  || err "$rel: missing title"
  [ -n "$(fm_get "$rel" last_reviewed)" ] || err "$rel: missing last_reviewed"

  case "$type" in product|architecture|feature|contract|decision) ;; *) err "$rel: type '$type' not in product|architecture|feature|contract|decision" ;; esac
  if [ "$type" = decision ]; then
    case "$status" in proposed|accepted|superseded|rejected) ;; *) err "$rel: ADR status '$status' not in proposed|accepted|superseded|rejected" ;; esac
    case "$id" in ADR-[0-9][0-9][0-9][0-9]) ;; *) err "$rel: ADR id must look like ADR-0001" ;; esac
  else
    case "$status" in draft|approved|implementing|implemented|deprecated) ;; *) err "$rel: status '$status' not in draft|approved|implementing|implemented|deprecated" ;; esac
  fi
  case "$rel" in
    specs/00-product/*)      [ "$type" = product ]      || err "$rel: type should be product" ;;
    specs/01-architecture/*) [ "$type" = architecture ] || err "$rel: type should be architecture" ;;
    specs/02-features/*)     [ "$type" = feature ]      || err "$rel: type should be feature" ;;
    specs/03-contracts/*)    [ "$type" = contract ]     || err "$rel: type should be contract" ;;
    specs/04-decisions/*)    [ "$type" = decision ]     || err "$rel: type should be decision" ;;
  esac

  n="$(echo "$all_ids" | grep -Fxc "$id")"; [ "$n" -le 1 ] || err "$rel: duplicate id $id"

  for ref in $(fm_list "$rel" depends_on) $(fm_list "$rel" decisions); do
    echo "$all_ids" | grep -Fqx "$ref" || warn "$rel: references unknown id $ref"
  done

  if [ "$type" = feature ] && [ "$status" != draft ]; then
    grep -q '^## Acceptance criteria' "$rel" || err "$rel: non-draft feature spec needs an '## Acceptance criteria' section"
  fi
  if [ "$status" = implementing ] || [ "$status" = implemented ]; then
    [ -n "$(fm_list "$rel" implements)" ] || err "$rel: status $status but implements is empty"
  fi
done

echo "spec-lint: $errors error(s), $warnings warning(s)"
[ "$errors" -eq 0 ]
