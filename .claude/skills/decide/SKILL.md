---
name: decide
description: Record an architecture decision as an ADR, resolve the matching open question, and propagate the decision into every affected spec. Use for "/decide", "let's go with Zustand", "we decided X".
---

# /decide <question id or topic> [chosen option]

1. Find the matching `### Q` in `specs/OPEN-QUESTIONS.md`. If the user has not chosen, present the options with the recorded recommendation and ask. Do not pick silently.
2. Next ADR number: `ls specs/04-decisions | sort | tail -1`. Copy `specs/04-decisions/_template.md`.
3. Write the ADR: context, decision, consequences, and **every alternative considered with the reason it lost**. Status `accepted` (or `proposed` if the user wants to sleep on it).
4. If it supersedes an earlier ADR, set that one's `status: superseded` and add a "Superseded by" line at its top. Never otherwise edit an accepted ADR.
5. Propagate (delegated): for each spec the question listed under **Blocks** or **Affects**, write a brief for the `spec-editor` agent naming the file, the ADR id to add to `decisions:`, the paragraph to rewrite and the fact it must state, the "open" wording to remove, the `last_reviewed` bump, and any status change (a `draft` spec that was only waiting on this moves to `approved`; say so). Read its diff summary and `git diff -- specs` yourself before continuing; the ADR text is yours, never the editor's.
6. Remove the question from `OPEN-QUESTIONS.md` and add one line to its "Resolved" table pointing at the ADR.
7. `make spec-lint && make spec-index`. Summarise: ADR written, specs touched, what is now unblocked.
