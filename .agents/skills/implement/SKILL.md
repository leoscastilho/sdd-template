---
name: implement
description: Implement a spec end-to-end — read spec, ADRs and contracts, plan, delegate the build to the coder and ui_coder agents, verify through test_runner, spec_reviewer and the security audit gate, then update spec status and traceability. Use for "$implement F-DOCUMENT-EDITOR" or "build the document editor".
---

# $implement <spec id or path>

You (the orchestrator) are turning one approved spec into working, tested code. You plan, delegate, verify and reconcile; the `coder` agent writes the code, `ui_coder` the presentational files. Never work from memory of the spec; read it now. Never read raw test output or logs yourself; `test_runner` and `log_summarizer` return the facts.

## 1. Load context (read, do not skim)
1. The target spec. Refuse if `status` is `draft`: tell the user what is missing to reach `approved`.
2. Every id in its `depends_on` and `decisions`. ADRs constrain you; "Ruled out" sections are hard constraints.
3. `specs/OPEN-QUESTIONS.md`. If any question lists this spec under **Blocks**, stop and ask the user to `$decide` first.
4. The contracts under `specs/03-contracts/` this spec names (OpenAPI, WebSocket messages, LaTeX render API, document-type registry). If the spec needs a shape the contracts lack, add it to the contract first; the code on both sides is written against it (nothing is generated in v1).
5. `specs/ROADMAP.md`. Confirm this spec belongs to the current or an earlier milestone. If it does not, say so and ask.

## 2. Plan
Write a short plan in the conversation: files to create (each must fall under an `implements:` glob of this spec; extend the list if not), tests to write (one per acceptance criterion, named after it), migrations if any, contract changes if any. Note anything ambiguous. If ambiguity would materially change the work, ask; otherwise state your assumption and add it to the spec's Open questions section. Split the work into coder tasks that are independent (separate files, no shared edits) so they can run in parallel; keep dependent steps sequential.

## 3. Build (delegated)
- Set the spec `status: implementing`.
- For each task launch the `coder` agent with a self-contained brief: spec path, ADR ids, allowed paths (the `implements:` globs), the criteria this task must cover, the contract sections, the constraints from AGENTS.md that bite here, and what "done" means. Independent tasks go out in one message so they run concurrently.
- Presentational files only (React components that render already-loaded data, CSS, tokens, static screens) go to `ui_coder` with the exact file list **and the surface brief path** under `.impeccable/surfaces/` (plus `DESIGN.md` when it exists); anything holding WebSocket, store, API, draft persistence, validation or render logic, every test, and every migration stays with `coder`.
- You do not write application code under `apps/`, `packages/`, `services/` or `infra/` yourself. A trivial follow-up (a typo, a one-line rename) is fine; anything larger goes back to the coder with a precise brief.
- Read every coder report. Its "spec discoveries" are yours to write into the spec now, not later.
- Review the diff (`git diff`) yourself before verifying: db only via Prisma, LaTeX only via `renderTex` and the render service, user text escaped before LaTeX, ws adapter not socket.io, no ruled-out option reintroduced, no secrets in tracked files.

## 4. Verify (tests, spec review, and security gates)
- Tests: launch `test_runner` with the test, typecheck, `make spec-lint`, `make spec-drift` and `make security-scan` commands plus the criteria list; act on its failure lines and coverage table. Every acceptance criterion must map to a passing test; list the mapping.
- Spec review: launch the `spec_reviewer` agent with the spec id. It returns evidence (criteria table, suspected violations with file:line); you read the cited lines and rule; route confirmed findings back to the coder.
- Security gate: run `$security-audit` in gate mode on the files the coder changed. Critical/high findings block `implemented`: write the missing acceptance criterion into the spec, send the fix to the coder, re-run the gate on the fix.
The test_runner, spec_reviewer and security_auditor are independent; launch them in the same message. If any output is long (a failing container, a CI log), send it to `log_summarizer` with the question you need answered.

## 5. Close the loop (this is what keeps the project spec-driven)
- Update the spec: what you learned, assumptions made, endpoints added, edge cases discovered, criteria added by the security gate. Bump `last_reviewed`.
- If all criteria pass and the security gate is clean: `status: implemented`. Otherwise stay `implementing` and list what remains in the spec's Open questions.
- Tick the item in `specs/ROADMAP.md`.
- Report: what was built, which criteria pass, the security gate result, what changed in the spec, what is left.
