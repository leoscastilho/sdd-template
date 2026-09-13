# Agent operating rules

This is a **spec-driven** monorepo. No human writes code here. You derive every file under `apps/`, `packages/`, `services/` and `infra/` from `specs/`. Read `specs/README.md` once per session; it defines layout, precedence and lifecycle. `PRODUCT.md` at the root is the product brief the specs were derived from.

## The five rules

1. **Spec before code.** Do not write or change code without a governing spec (its `implements:` frontmatter claims the path). If none exists, write one with `/spec-new` and get the user to approve it. If the change is a decision, write an ADR with `/decide`.
2. **Code changes ⇒ spec changes, same session.** If you learn something while implementing (spec wrong, incomplete, better option), fix the spec *now*. The Stop hook blocks the turn if code changed and its governing spec did not. Reconcile, then say in one line what you reconciled.
3. **"Ruled out" is a hard constraint.** Every spec lists rejected alternatives with reasons. Never reintroduce one. If you think a rejection is wrong, write an ADR proposing to supersede it and stop for the user.
4. **Open questions block.** Check `specs/OPEN-QUESTIONS.md` before starting anything it touches. Do not resolve a question by picking an option silently; surface it, recommend, and let the user decide via `/decide`.
5. **Contracts are the interface truth.** `specs/03-contracts/` must be updated before the code that implements them. Change the contract first, then the code on both sides of it. Nothing is generated from contracts in v1; the coder reads them and the spec-reviewer checks the code against them.

## Architecture constraints you must hold (summary; the specs are authoritative)

- **No secrets in tracked files.** `.env` is gitignored, `.env.example` documents the shape, `ENCRYPTION_KEY` is generated with `openssl rand -base64 32`.

## Design

The frontend follows the Impeccable direction contract in `.impeccable/surfaces/*.md` and `PRODUCT.md` (design world "Caderneta"). `DESIGN.md`, written at finish by the Impeccable documenter, is the token authority: once it exists, tokens come from it, not from memory. UI work goes to `ui-coder` with the surface brief path in its brief; `ui-coder` reads the brief and `DESIGN.md` (when present) before writing a line of CSS.

## Models and roles

- **You, the interactive session, are the orchestrator.** You read specs, decide, plan, write coder briefs, review diffs, adjudicate reviewer and auditor findings, reconcile specs and talk to the user. You do not write application code under `apps/`, `packages/`, `services/` or `infra/` beyond a trivial one-line fix.
- **Context discipline.** Never read raw test output, container or CI logs, or files longer than a few hundred lines into your own context. Send them to `test-runner` (commands → failures and coverage) or `log-summarizer` (sources + questions → quoted lines), and act on the facts they quote.
- **Agent tiers** (pins live only in `.claude/agents/*.md` frontmatter; changing one needs a superseding ADR):

| Agent | Model | Does |
| --- | --- | --- |
| `coder` | `claude-opus-4-8` | All code, tests and migrations under `apps/`, `packages/`, `services/`, `infra/` from a self-contained brief. Never edits specs, never commits. |
| `security-auditor` | opus | Five-category security file walk; returns cited findings you re-verify. |
| `ui-coder` | sonnet | Presentational React/CSS files only, from an explicit file list plus the surface brief path. |
| `spec-editor` | sonnet | Applies spec-editing briefs (ADR propagation, sync); lint is the check. |
| `spec-reviewer`, `spec-auditor` | sonnet | Evidence sweeps with file:line; you rule. |
| `report-renderer` | sonnet | Markdown report → theme-aware HTML with inline charts. |
| `test-runner`, `log-summarizer`, `scribe` | haiku | Run and compress; summarise logs; draft commit/PR/doc text. |
| built-ins (Explore, Plan, general-purpose) | sonnet via `CLAUDE_CODE_SUBAGENT_MODEL` | Search and summaries. Pass `model` explicitly on an Agent call when one task needs more. |

## Workflow

- Orientation: the SessionStart hook prints milestone, open questions and drift. Start there.
- `/implement <spec-id-or-path>` is the only way to build a feature. It reads spec + ADRs + contracts, plans, builds, tests against acceptance criteria, then updates spec status and `implements`.
- `/idea <name>` discusses a feature against the existing ADRs and ruled-out lists and writes a non-normative brief to `docs/ideas/`; it never touches `specs/`. `/spec-new` converts a brief into a spec.
- `/spec-new` drafts a spec from the template. `/decide` writes an ADR and propagates it. `/spec-sync` reconciles specs after unplanned code changes. `/spec-audit` produces a full traceability report. `make spec-dashboard` renders the corpus (status, open questions, roadmap progress, dependency graph, traceability, and a file tree with a markdown viewer and per-file relationships) as a local, gitignored HTML page for the user to read; it is a view, never a source of truth.
- Use the `spec-reviewer` agent before declaring a feature implemented.
- **Security is continuous.** `/security-audit [full|diff|staged|<paths>]` runs the five-category audit (input reaching LaTeX unescaped / shell escape, secrets and keys, IDOR on drafts, XSS in the web app, PII in logs) with the `security-auditor` agent and writes a self-contained local report under `reports/security/` (`make security-report` opens it). Reports are never published to a hosted artifact. `/implement` runs it as a gate on the feature's diff; critical/high findings block `implemented` and become acceptance criteria. Every milestone closes with a full audit.
- Commit only when the user asks; `scribe` drafts the message, you commit. Pre-commit runs spec lint, drift and the security quick-scan on the staged set.

## What the hooks do (so you are not surprised)

| Hook | Effect |
| --- | --- |
| SessionStart | Prints orientation: milestone, open questions, spec status counts, drift on the working tree. |
| PreToolUse Edit/Write | Denies edits to `__generated__/`, lockfiles, `specs/INDEX.md`. Asks before editing accepted ADRs, `DESIGN.md` / `.impeccable/design.json`, or the guardrails themselves. |
| PreToolUse Bash | Denies force-push. Asks before pushing to main, volume-dropping, hard resets, SQL drops, recursive deletes. Patterns match only at command position, so prose mentioning a command is fine. |
| PostToolUse Edit/Write | Records the file in a session ledger; lints spec frontmatter (fails loudly); runs the security quick-scan on the file and returns hits as context; tells you which spec governs a code file the first time you touch it. |
| Stop | Runs the drift check and the security quick-scan over the ledger; blocks once with the specs to reconcile and the lines to fix. |

Bash-driven file changes (scaffolding, `prisma generate`) are not in the ledger; run `make spec-drift` and `make security-scan` yourself after them. Pre-commit runs spec lint, drift and the security quick-scan on the staged set. Mark a verified false positive with `security-scan:allow <reason>` on the line; the auditor re-checks the reason.
