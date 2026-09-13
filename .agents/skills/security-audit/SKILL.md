---
name: security-audit
description: Run the five-category security audit (input reaching LaTeX unescaped / shell escape, secrets and keys, IDOR on drafts, XSS in the web app, PII in logs) over the whole repo or a diff, render the report as a self-contained local HTML page with charts and ready-to-paste GitHub issues, and feed critical/high findings back into the specs as acceptance criteria. Use for "$security-audit", "is this secure", "audit the app", and automatically as the $implement gate.
---

# $security-audit [full | diff | staged | <paths or spec id>] [--categories 1,2,3,4,5]

The orchestrator runs this; the `security_auditor` agent does the reading. Governing spec: ARCH-SECURITY "Continuous security audit".

## 1. Scope
- No argument: `diff` if `git status --porcelain -- apps packages services infra .github docker-compose.yml` shows changes, otherwise `full`.
- `diff` = changed + untracked code files vs HEAD; `staged` = index; a spec id = its `implements:` globs; paths = as given.
- Gate mode (called from `$implement` step 4): scope = the files the coder changed for that spec.

## 2. Deterministic layer
Run `scripts/security/quick-scan.sh` with the matching mode (`--all`, default, `--staged`, or `--file` per path). Keep its output; the auditor verifies each hit.

## 3. Semantic layer
Launch `security_auditor` with: the scope list, the categories, and the stack hints from the architecture specs and ADRs under `specs/`. For `full` scope (or more than ~40 files) launch **five auditors, one per category**, in parallel batches within the available agent limit; for `diff`/`staged`/small scopes launch **one auditor with all five**. Merge results; de-duplicate on `file:line`.

## 3b. Adjudicate (you, not the auditor)
For every finding, open the cited `file:line` and confirm the snippet, the exploit path and the severity; drop or downgrade anything you cannot confirm, and say so in the summary. Where two auditors disagree, your reading wins. Only adjudicated findings go into the report and the specs.

## 4. Render the report — LOCAL ONLY, never a hosted artifact
Save the adjudicated markdown as `reports/security/YYYY-MM-DD-<scope>.md` (create the folder). Launch `report_renderer` with that path, the output path `reports/security/YYYY-MM-DD-<scope>.html`, title, date, scope and project name; it builds a **complete standalone HTML document** (its own `<!doctype html>`, `<head>` with `charset=utf-8` and viewport, inline `<style>`, inline SVG charts, no external requests) that opens correctly from `file://` with no server and no network.

**Do not publish the report or send its contents to a hosted artifact service.** A security report enumerates this repo's weaknesses with file paths and line numbers; it stays on the machine that produced it. The deliverable is the file path, not a link. Hand the user `reports/security/YYYY-MM-DD-<scope>.html` and mention `make security-report` (opens the newest one) — offer nothing hosted. If the user explicitly asks for a shareable link later, that is their call to make, not a default.

Open the result once to check it renders. Required structure, in English:
a) Cover: title, date, audited scope, methodology note (how each category was mapped to the detected stack).
b) Executive summary: totals by severity, a donut chart by severity, a bar chart by category. Palette: critical `#B91C1C`, high `#EA580C`, medium `#D97706`, low `#2563EB`, strength `#059669`.
c) Strengths (what is protected, with evidence) and weaknesses (the core risks).
d) Detailed findings table by category: Severity | File:line | Description, with a coloured severity chip.
e) Prioritised recommendations (P1, P2, P3…).
f) "GitHub issues" section at the end: the auditor's `--- ISSUE n --- … --- END ISSUE n ---` blocks verbatim, in `<pre>` blocks so they copy cleanly.

## 5. Close the loop (mandatory — a flaw is a missing sentence in a spec)
- Every **critical/high** finding: add an acceptance criterion (Given/When/Then) to the governing spec of the file (`scripts/spec/_lib.sh` `governing_specs`), or to ARCH-SECURITY when cross-cutting; dispatch the fix to the `coder` agent with the finding as its brief; re-run `scripts/security/quick-scan.sh --file` on the fix and re-launch the auditor on just those files. In gate mode these block `status: implemented`.
- Every **medium**: record it in the governing spec's Open questions with the issue text; fix if the user says so.
- **Low/informational**: report only.
- Verify each `security-scan:allow` marker the auditor questioned; remove the marker and fix if the reason does not hold.

## 6. Deliver in chat
The report's **file path** (`reports/security/YYYY-MM-DD-<scope>.html`, plus `make security-report` to open it) — never a published link; the findings file by file, line by line (severity, `file:line`, one-line why); the strengths; the coverage summary (files and handlers walked, categories not applicable and why); what was written back into which spec; what was fixed and what is pending.
