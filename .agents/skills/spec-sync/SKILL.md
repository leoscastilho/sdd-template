---
name: spec-sync
description: Reconcile specs after code changed — find every changed code file, its governing spec, and update the spec so it describes current behaviour. Use when `make spec-drift` reports drift, after scaffolding or `prisma generate`, or for "$spec-sync".
---

# $spec-sync

1. Run `make spec-drift` (working tree), or read the drift-check output you were given.
2. For each **stale** entry (`file -> spec`): decide what the code now does that the spec does not say (use `log_summarizer` for large diffs). Then brief the `spec_editor` agent per spec: the paragraph, criteria, endpoints, config keys or ruled-out entries to update and the exact facts to state, plus the `last_reviewed` bump. If nothing behavioural changed, the brief is only the bump; say so in your report. Read the editor's diff before continuing.
3. For each **unclaimed** file: decide which existing spec should own it and add the path (prefer a directory glob) to that spec's `implements:`. If no spec fits, the code has no reason to exist: delete it or write a spec with `$spec-new`.
4. Re-run `make spec-drift` until clean, then `make spec-lint && make spec-index`.
5. Report as a table: file → spec → what changed in the spec.
