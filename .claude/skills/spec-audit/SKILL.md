---
name: spec-audit
description: Full traceability and health report of the spec corpus versus the code — unclaimed code, dangling implements, stale specs, status inconsistencies, contradictions between specs. Use for "/spec-audit", "are the specs in sync", before a milestone closes.
---

# /spec-audit

1. Run `make spec-audit` and `make spec-lint`; include their output.
2. Launch the `spec-auditor` agent (Sonnet) for the semantic sweep (contradictions, stale statements, specs marked `implemented` whose criteria lack tests). It returns quoted evidence; you open each cited location and keep, downgrade or drop the finding. Only adjudicated findings go to the user.
3. Check `specs/ROADMAP.md`: every item in the current milestone maps to a spec; every `implementing` spec is in the current or an earlier milestone.
4. Check `specs/OPEN-QUESTIONS.md`: every open question is still relevant; every spec's own "Open questions" section is mirrored there.
5. Produce a prioritised list of fixes. Apply the mechanical ones (frontmatter, implements globs, index) now; propose the semantic ones to the user.
