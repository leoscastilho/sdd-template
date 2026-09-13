# Specs — the source of truth

This repository is spec-driven: code is derived from the documents in this
folder. The starter leaves technology and product choices open so each clone
can define them deliberately.

## Layout

| Folder | Purpose |
| --- | --- |
| `00-product/` | Vision, vocabulary, personas, and product context |
| `01-architecture/` | Cross-cutting technical and operational design |
| `02-features/` | User-facing capabilities and acceptance criteria |
| `03-contracts/` | Interfaces shared by components or external consumers |
| `04-decisions/` | Accepted architecture decision records |
| `OPEN-QUESTIONS.md` | Decisions that still need an explicit choice |
| `ROADMAP.md` | Project milestones |
| `INDEX.md` | Generated catalog; never edit by hand |

## Precedence

Accepted ADRs win on decisions, contracts win on interface shape, feature
specs win on behaviour, architecture specs win on cross-cutting mechanics, and
the product brief supplies context. A `Ruled out` section is a hard
constraint until a later ADR supersedes it.

## Frontmatter

Every normative spec has YAML frontmatter:

```yaml
---
id: F-EXAMPLE
title: Example feature
type: feature
status: draft
implements:
  - src/example/**
depends_on: []
decisions: []
last_reviewed: 2026-01-01
---
```

Use the type matching its folder. Features use statuses `draft`,
`approved`, `implementing`, `implemented`, or `deprecated`. ADRs use
`proposed`, `accepted`, `superseded`, or `rejected`.

## Change flow

Planned work starts with a spec. A decision becomes an ADR. If implementation
reveals that a spec is incomplete, update the spec in the same session.
Contracts are edited before the code on either side. The `implements:` globs
are the traceability seam used by drift and audit checks.

Run:

```text
make spec-lint       # validate frontmatter and references
make spec-index      # regenerate INDEX.md
make spec-drift      # changed code and specs move together
make spec-audit      # find unclaimed code and dangling globs
make spec-dashboard  # render a local browser view
```

Use the templates in each numbered folder as the starting point. A clone may
add or remove architecture and contract documents as its own design requires.

