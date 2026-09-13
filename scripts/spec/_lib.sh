#!/usr/bin/env bash
# Shared helpers for spec tooling. bash 3.2 compatible (macOS default). Requires jq only in hooks.
# Source this file; do not execute it.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SPEC_DIR="$ROOT/specs"

# Paths that count as "code" for drift/audit purposes. Tooling (.claude, scripts) is governed by CLAUDE.md, not specs.
CODE_ROOTS="${SDD_CODE_ROOTS-apps packages services infra}"
# Root-level deploy files that are code too (compose, Dockerfiles, nginx config). Matched by is_root_code_file.
CODE_ROOT_FILES="${SDD_CODE_ROOT_FILES-docker-compose.yml docker-compose.*.yml compose.yml compose.yaml Dockerfile* nginx.conf}"

# Files never attributed to a spec (generated or tool-owned).
is_ignored_code() {
  case "$1" in
    */__generated__/*|*/node_modules/*|*.lock|*/package-lock.json|*/pnpm-lock.yaml|*/go.sum|*/dist/*|*/build/*|*.md|*/README*) return 0 ;;
    # Binary assets are not attributed; include meaningful source assets in your specs.
    *.png|*.jpg|*.jpeg|*.pdf|*.woff|*.woff2|*.ttf) return 0 ;;
  esac
  return 1
}

# is_root_code_file PATH -> true when a top-level file matches one of CODE_ROOT_FILES (glob per word).
is_root_code_file() {
  local f="$1" g
  case "$f" in */*) return 1 ;; esac
  for g in $CODE_ROOT_FILES; do
    case "$f" in $g) return 0 ;; esac
  done
  return 1
}

is_code_path() {
  local f="$1" r
  is_ignored_code "$f" && return 1
  for r in $CODE_ROOTS; do
    case "$f" in "$r"/*) return 0 ;; esac
  done
  is_root_code_file "$f" && return 0
  return 1
}

is_spec_path() { case "$1" in specs/*.md) return 0 ;; esac; return 1; }

# All spec files with frontmatter (skips README, INDEX, _template*).
spec_files() {
  [ -d "$SPEC_DIR" ] || return 0
  find "$SPEC_DIR" -name '*.md' \
    ! -name 'README.md' ! -name 'INDEX.md' ! -name '_*' \
    ! -name 'OPEN-QUESTIONS.md' ! -name 'ROADMAP.md' | sort
}

# fm_get FILE KEY -> scalar value (empty if absent)
fm_get() {
  awk -v key="$2" '
    NR==1 && $0=="---" {infm=1; next}
    infm && $0=="---" {exit}
    infm && $0 ~ "^"key":" { s=$0; sub("^"key":[ ]*", "", s); gsub(/^["'"'"']|["'"'"']$/, "", s); print s; exit }
  ' "$1"
}

# fm_list FILE KEY -> one item per line. Supports "key: [a, b]" and block "  - a" forms.
fm_list() {
  awk -v key="$2" '
    NR==1 && $0=="---" {infm=1; next}
    infm && $0=="---" {exit}
    infm && $0 ~ "^"key":" {
      rest=$0; sub("^"key":[ ]*", "", rest)
      if (rest ~ /^\[/) { gsub(/[\[\]"'"'"']/, "", rest); n=split(rest, a, /,[ ]*/); for(i=1;i<=n;i++) if (a[i] != "") print a[i] }
      else if (rest == "") { inkey=1 }
      next
    }
    inkey && $0 ~ /^[ ]+-[ ]/ { s=$0; sub(/^[ ]+-[ ]*/, "", s); gsub(/^["'"'"']|["'"'"']$/, "", s); print s; next }
    inkey { inkey=0 }
  ' "$1"
}

# glob_match GLOB PATH  (`**` treated as `*`; in [[ ]] `*` crosses `/`)
glob_match() {
  local g="${1//\*\*/*}"
  [[ "$2" == $g ]]
}

# governing_specs PATH -> spec files (relative to ROOT) whose implements globs match PATH
governing_specs() {
  local f="$1" s g
  for s in $(spec_files); do
    while IFS= read -r g; do
      [ -z "$g" ] && continue
      if glob_match "$g" "$f"; then echo "${s#$ROOT/}"; break; fi
    done < <(fm_list "$s" implements)
  done
}

# spec_by_id ID -> path relative to ROOT
spec_by_id() {
  local s
  for s in $(spec_files); do
    [ "$(fm_get "$s" id)" = "$1" ] && { echo "${s#$ROOT/}"; return 0; }
  done
  return 1
}

# Existing tracked and untracked files; excludes working-tree deletions.
repo_files() {
  local f
  while IFS= read -r f; do
    [ -f "$ROOT/$f" ] && printf '%s\n' "$f"
  done < <({ git ls-files; git ls-files --others --exclude-standard; } | sort -u)
  return 0
}
