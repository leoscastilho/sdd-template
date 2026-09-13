---
name: spec-new
description: Draft a new feature, architecture or contract spec from the template, with a unique id, correct frontmatter and acceptance criteria. Use for "write a spec for X", "/spec-new".
---

# /spec-new <type> <short name>

0. If a brief exists for this (`docs/ideas/<slug>.md`, from `/idea`), read it first and treat it as the source: its rejected options become **Ruled out**, its unresolved points become **Open questions**, its edge cases and data-sensitivity rules become acceptance criteria. It is an input, not a spec — never copy it verbatim, and never move it into `specs/`.
1. Pick the folder by type: feature → `specs/02-features/`, architecture → `specs/01-architecture/`, contract → `specs/03-contracts/`, product → `specs/00-product/`.
2. Copy `specs/02-features/_template.md` (or the closest existing spec of that type) and fill every section. Delete sections that truly do not apply; never leave template text.
3. Id: prefix `F-`, `ARCH-`, `C-`, `P-` plus SCREAMING-KEBAB. Check uniqueness with `make spec-lint`.
4. Mine the existing corpus first: `specs/01-architecture/system-overview.md` probably already says something about this area. Cite the section. Do not contradict an accepted ADR.
5. Acceptance criteria are Given/When/Then and independently testable. Include empty, loading and error states for anything user-facing, and the validation rule (from `cfpdoc.cls` / the registry) for anything that touches a document type.
6. Write **Ruled out** with reasons. This is what stops a future session from re-adding a rejected idea.
7. Every unresolved point goes in the spec's **Open questions** AND as a new `### Q` entry in `specs/OPEN-QUESTIONS.md` with a recommendation.
8. Leave `status: draft`. Run `make spec-lint && make spec-index`. Tell the user what they need to decide to reach `approved`.
