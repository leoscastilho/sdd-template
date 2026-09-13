# agent operating rules

This is a **spec-driven** monorepo. No human writes code here. You derive every file under `apps/`, `packages/`, `services/` and `infra/` from `specs/`. Read `specs/README.md` once per session; it defines layout, precedence and lifecycle. `PRODUCT.md` at the root is the product brief the specs were derived from.

## The five rules

1. **Spec before code.** Do not write or change code without a governing spec (its `implements:` frontmatter claims the path). If none exists, write one with `$spec-new` and get the user to approve it. If the change is a decision, write an ADR with `$decide`.
2. **Code changes ⇒ spec changes, same session.** If you learn something while implementing (spec wrong, incomplete, better option), fix the spec *now*. Run `make spec-drift` before completing code work; reconcile any drift caused by this task. Reconcile, then say in one line what you reconciled.
3. **"Ruled out" is a hard constraint.** Every spec lists rejected alternatives with reasons. Never reintroduce one. If you think a rejection is wrong, write an ADR proposing to supersede it and stop for the user.
4. **Open questions block.** Check `specs/OPEN-QUESTIONS.md` before starting anything it touches. Do not resolve a question by picking an option silently; surface it, recommend, and let the user decide via `$decide`.
5. **Contracts are the interface truth.** `specs/03-contracts/` (OpenAPI, WebSocket messages, LaTeX render API, document-type registry) must be updated before the code that implements them. Change the contract first, then the code on both sides of it. Nothing is generated from contracts in v1; the coder reads them and the spec_reviewer checks the code against them.

## Architecture constraints you must hold (summary; the specs are authoritative)

- **pnpm workspaces** monorepo (corepack, Node 20 LTS, TypeScript strict). Biome for lint/format; Vitest for TS tests; `go test` for Go.
- **`apps/web`**: React 18 + Vite, react-router, Zustand, react-pdf. Plain CSS with custom-property tokens; no Tailwind, no component library. pt-BR UI only.
- **`apps/api`**: NestJS, REST under `/api`, WebSocket at `/ws` on the **ws adapter** (`@nestjs/platform-ws`, never socket.io). Orchestration only: gateway, REST, drafts, encryption, HTTP client to the render service. Config validated at boot with zod; structured JSON logs (pino) to stdout; health endpoint; graceful shutdown.
- **`services/latex`**: Go + Tectonic, a compile-only sandbox. Stateless, no knowledge of document types, `tmpfs` on `/tmp`, temp dir per request removed after compile, Tectonic runs `--untrusted --only-cached`, no network at runtime, request size limit, timeout, concurrency cap.
- **`packages/shared`** (`@psico/shared`) owns the document-type registry, `validateDocument` and `renderTex`. Pure TS, no IO. It is the *only* code that emits LaTeX. User text never reaches LaTeX unescaped: `escapeLatex` first, then the mini-markup on the escaped string in a way user text cannot forge.
- **PostgreSQL 16 + Prisma.** Migrations via `prisma migrate deploy` run as a discrete compose job (`migrate`), never at app startup. Drafts are encrypted at the application layer (AES-256-GCM, `ENCRYPTION_KEY` from env, AAD = draft id); the DB stores only ciphertext + iv + tag. Logs never contain field values or tex.
- **Deploy**: Docker Compose at the repo root is the production shape consumed by **Easypanel** and by `make up`; `docker-compose.override.yml` adds local dev ports. Only `web` publishes a port. No other IaC.
- **No secrets in tracked files.** `.env` is gitignored, `.env.example` documents the shape, `ENCRYPTION_KEY` is generated with `openssl rand -base64 32`.

## Design

The frontend follows the Impeccable direction contract in `.impeccable/surfaces/*.md` and `PRODUCT.md` (design world "Caderneta"). `DESIGN.md`, written at finish by the Impeccable documenter, is the token authority: once it exists, tokens come from it, not from memory. UI work goes to `ui_coder` with the surface brief path in its brief; `ui_coder` reads the brief and `DESIGN.md` (when present) before writing a line of CSS.

## Models and roles

- **You, the interactive session, are the orchestrator.** You read specs, decide, plan, write coder briefs, review diffs, adjudicate reviewer and auditor findings, reconcile specs and talk to the user. You do not write application code under `apps/`, `packages/`, `services/` or `infra/` beyond a trivial one-line fix.
- **Context discipline.** Never read raw test output, container or CI logs, or files longer than a few hundred lines into your own context. Send them to `test_runner` (commands → failures and coverage) or `log_summarizer` (sources + questions → quoted lines), and act on the facts they quote.
- **Codex agent roles** live in `.codex/agents/*.toml`. This is the Codex adaptation of ADR-0014's division of responsibility; the original Claude configuration and its model pins remain independent.

| Roles | Codex model |
| --- | --- |
| `coder`, `security_auditor` | `gpt-6-astra` |
| `ui_coder`, `spec_editor`, `spec_reviewer`, `spec_auditor`, `report_renderer` | `gpt-5.6-terra` |
| `test_runner`, `log_summarizer`, `scribe` | `gpt-5.6-luna` |

Use these custom roles for the delegated steps in the SDD skills. Give each agent a bounded brief and disjoint write paths. Run independent tasks concurrently within the runtime's available slots; batch larger sweeps. Wait for results and adjudicate cited evidence before completing the workflow.

If the runtime exposes generic `spawn_agent` without custom-role selection, read the matching `.codex/agents/<role>.toml` and pass its instructions in a self-contained brief, using its model and reasoning settings when supported. If subagents are unavailable, disclose this and perform the same bounded steps sequentially, preserving the review gates. Never claim an independent review occurred when it did not.

## Workflow

- Orientation: read `specs/ROADMAP.md`, `specs/OPEN-QUESTIONS.md` and `specs/INDEX.md`; run `make spec-drift` to identify baseline drift before code work.
- `$implement <spec-id-or-path>` is the only way to build a feature. It reads spec + ADRs + contracts, plans, builds, tests against acceptance criteria, then updates spec status and `implements`.
- `$idea <name>` discusses a feature against the existing ADRs and ruled-out lists and writes a non-normative brief to `docs$ideas/`; it never touches `specs/`. `$spec-new` converts a brief into a spec.
- `$spec-new` drafts a spec from the template. `$decide` writes an ADR and propagates it. `$spec-sync` reconciles specs after unplanned code changes. `$spec-audit` produces a full traceability report. `make spec-dashboard` renders the corpus (status, open questions, roadmap progress, dependency graph, traceability, and a file tree with a markdown viewer and per-file relationships) as a local, gitignored HTML page for the user to read; it is a view, never a source of truth.
- Use the `spec_reviewer` agent before declaring a feature implemented.
- **Security is continuous.** `$security-audit [full|diff|staged|<paths>]` runs the five-category audit (input reaching LaTeX unescaped / shell escape, secrets and keys, IDOR on drafts, XSS in the web app, PII in logs) with the `security_auditor` agent and writes a self-contained local report under `reports/security/` (`make security-report` opens it). Reports are never published to a hosted artifact. `$implement` runs it as a gate on the feature's diff; critical/high findings block `implemented` and become acceptance criteria. Every milestone closes with a full audit.
- Commit only when the user asks; `scribe` drafts the message, you commit. Pre-commit runs spec lint, drift and the security quick-scan on the staged set.

## Conventions

- Monorepo: `apps/{web,api}`, `services/latex`, `packages/shared`, `infra/`. Root `docker-compose.yml` + `docker-compose.override.yml`, `Makefile`, `.env.example`.
- Tests are named after acceptance criteria. A feature is `implemented` only when every criterion has a passing test.
- `renderTex` output must compile with `services/latex/templates/cfpdoc.cls`; test it against `services/latex/templates/samples/*.tex`.
- Secrets: gitignored `.env` locally, Easypanel environment in production, `.env.example` documents the shape. Never write a secret into a tracked file.
- Reference specs by id (`F-DOCUMENT-EDITOR`, `ADR-0003`) in commit messages, PR bodies and in code comments that explain a non-obvious constraint.

## Codex checks

The Claude hooks are not installed by this Codex skill migration. Apply their project invariants explicitly:

- Never hand-edit `__generated__/`, lockfiles, or `specs/INDEX.md`; use their generators.
- Preserve accepted ADRs except when recording an authorized superseding decision. Change `DESIGN.md`, `.impeccable/design.json`, or guardrails only within user-authorized scope.
- Do not force-push. Commit or push only when the user asks; destructive actions need appropriate authorization.
- After spec edits, run `make spec-lint`; regenerate the index with `make spec-index` when required.
- After code edits, identify governing specs and run `scripts/security/quick-scan.sh --file` for changed paths. Before finishing, run `make spec-drift` and `make security-scan`, including after generators or scaffolding. Distinguish pre-existing findings from this task's changes.
- A `security-scan:allow <reason>` marker requires a verified false-positive explanation; auditors re-check it.

## Project skills

Read the relevant `.agents/skills/<name>/SKILL.md` when applying a workflow. Invoke with `$implement`, `$idea`, `$spec-new`, `$decide`, `$spec-sync`, `$spec-audit`, or `$security-audit`. Slash-style names in historical specs refer to the corresponding Codex skill. The original `.claude/` files and `CLAUDE.md` belong to Claude and must remain intact.
