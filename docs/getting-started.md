# Getting started

This repository treats specifications as the source of truth. A project begins
with decisions and behaviour written down; implementation follows from those
documents. The starter does not assume a programming language or runtime.

## First session

Read [PRODUCT.md](../PRODUCT.md), fill in the product brief, then read
[specs/README.md](../specs/README.md). Run `make spec-lint` and inspect the
empty roadmap and open-question list. Decide which architecture documents your
project needs before adding code directories.

`make setup` installs the repository hook and reports missing optional tools.
The minimum is Git, Bash, Make, and Node.js 18+ for the dashboard.

## Normal workflow

Use `/idea <name>` to turn a conversation into a brief in `docs/ideas/`.
Use `/spec-new` to convert a brief into a normative spec with acceptance
criteria. Resolve choices with `/decide`; an agent must not silently choose an
open question. Once the spec is complete, set it to `approved` and use
`/implement <spec-id>`.

Contracts in `specs/03-contracts/` describe interfaces before either side is
built. `implements:` frontmatter connects a spec to the paths it governs.
`make spec-drift` checks that changed code and its governing spec move
together. `make spec-audit` finds unclaimed code and dangling paths.

## Safety and review

The security scan is intentionally heuristic. It looks for common secret,
unsafe execution, injection, access-control, XSS, and sensitive-log patterns;
it is a prompt for review, not proof of security. Use `/security-audit` for a
full review and record accepted trade-offs as ADRs.

The repository supports both Codex (`.agents/`, `.codex/`) and Claude
(`.claude/`) workflows. Do not edit generated `specs/INDEX.md` by hand;
run `make spec-index`.

