# SDD Kickstart agent instructions

This repository is a generic spec-driven development starter. Read
`specs/README.md`, `specs/ROADMAP.md`, and `specs/OPEN-QUESTIONS.md` before
changing project files.

## Core rules

1. Write or update a governing spec before changing implementation code.
2. Keep the spec and code change in the same session; run `make spec-drift`.
3. Treat every `Ruled out` section as a hard constraint.
4. Open questions block implementation until resolved with `/decide`.
5. Define contracts before implementing either side of an interface.
6. Do not write secrets to tracked files or logs.
7. Do not hand-edit generated `specs/INDEX.md`.

The starter does not prescribe a stack. A project may use any languages,
frameworks, storage, deployment, UI, or design tools after recording those
choices in specs and ADRs.

## Roles and workflow

The interactive session is the orchestrator. It plans, writes bounded briefs,
reviews changes, runs checks, and speaks with the user. Delegate implementation
to `coder`, presentational UI to `ui_coder` when applicable, verification to
`test_runner`, spec review to `spec_reviewer`, and security review to
`security_auditor`. Keep delegated write paths disjoint.

Use `/idea`, `/spec-new`, `/decide`, `/implement`, `/spec-sync`,
`/spec-audit`, and `/security-audit` as described by their skill files.
The same workflow is available under `.agents/` for Codex and `.claude/`
for Claude. Adapt examples to the project's actual stack.

## Checks

Before completing work, run `make spec-lint`, `make spec-drift`, and
`make spec-audit`. Run the project's own tests and linters when they exist.
Run `make security-scan`; its pattern scan is a prompt for review, not proof
of security. Record material architectural choices in ADRs.

