---
name: idea
description: Discuss a feature and capture it as a structured brief in docs/ideas/, checked against accepted ADRs and every "Ruled out" list, shaped for /spec-new to convert. Use for "/idea", "let's talk through a feature", "write this discussion up as a brief". Good from a phone over Remote Control.
---

# /idea <short-name>

Have the conversation, then write it down in the shape `/spec-new` can consume.

**You are not writing a spec.** Never create or edit anything under `specs/` from this skill — a free-form file there breaks `make spec-lint` and invites a future session to treat a rough transcript as truth. The output is one file in `docs/ideas/`.

This is often run from a phone over Remote Control, with the input **dictated** rather than typed. **Keep replies short.** One question at a time, not a wall of them.

### Working with dictated input

Claude's own voice mode does not run in Claude Code sessions, so the user is most likely using their keyboard's dictation. Expect the input to be spoken prose: rambling, thin on punctuation, and rough on identifiers.

- **Repair identifiers silently when the intent is obvious** — resolve shorthand to identifiers already present in this project's specs. Do not invent domain terms or make the user spell things.
- **Ask only when a misheard word changes the meaning**, not to tidy up phrasing. One short question, then move on.
- **Never ask for a slug to be dictated.** Derive it from the feature name and state it once: "writing this to `docs/ideas/waitlist.md`".
- Long, unstructured answers are normal — the user is thinking aloud. Pull the structure out yourself rather than asking them to organise it.

### Before writing the file

Read back a **short** summary — the problem in one line, the behaviour in two or three, and the rejected options by name — and ask for a yes. Dictation errors are much cheaper to catch here than after the brief is written. Keep the read-back speakable: no tables, no code blocks, no nested bullets.

## 1. Load the constraints before discussing, not after

The point of this skill is that the conversation is *informed*. Before the first substantive reply:

- `specs/INDEX.md` — every spec and ADR with its title. Find the area this idea touches.
- `specs/OPEN-QUESTIONS.md` — what is still undecided nearby.
- The `## Ruled out` section of each spec in that area, and `## Alternatives considered (ruled out)` in any ADR the area cites.
- `CLAUDE.md` → "Architecture constraints you must hold".

Then say, in **one or two lines**, what already constrains this area — the relevant ADR ids and what they forbid. Do not lecture; the user needs the fence, not the tour.

**If the user proposes something an accepted ADR ruled out, say so in that turn.** Name the ADR and what it decided. Do not design around it silently and do not build on it. If they want to overturn it, that is a *superseding ADR* via `/decide` — a real option, not a rebuke. Note it as an open question in the brief and carry on.

## 2. Discuss

Follow the user's lead, but the brief needs these before it is worth writing. Ask for whatever is missing, cheapest question first:

- **The problem, and who has it.** Which persona (`specs/00-product/`, `PRODUCT.md`), in what situation.
- **The behaviour.** What the user does and what they see.
- **Empty, loading and error states.** The preview keeps the last good PDF while compiling; a screen idea with no answer for "nothing yet", "compiling" and "compile failed" is not finished.
- **Data sensitivity.** Every field is clinical data (LGPD): what is stored, encrypted, logged, and for how long. "Nothing persists" is an answer; leaving it blank is not.
- **What is explicitly out of scope**, so the build does not sprawl.
- **Options considered and rejected, with the reason.** Ask directly near the end: *"anything we considered and dropped?"* This is the highest-value content in the brief and the first thing lost when summarising a conversation.

## 3. Write `docs/ideas/<slug>.md`

Plain markdown, **no spec frontmatter** — this is not a spec. Slug is kebab-case. Use this shape, dropping any section that genuinely has no content rather than padding it:

```markdown
# <Name> — idea brief

Not a spec. Captured <date> from a discussion. Convert with `/spec-new feature <slug>`.

## Problem
Who has it, when, and what it costs them today.

## Proposed behaviour
What the user does and sees. Prose or a short flow; not acceptance criteria yet.

## Edge cases
Empty state. Loading / compiling state. Error state (validation, class error, service down).

## Data sensitivity
What is stored, encrypted, logged; what never leaves the browser.

## Alternatives considered and rejected
- **Option** — why it lost.

## Existing decisions this must respect
ADR ids and the one-line constraint each imposes.

## Open questions
What is genuinely unresolved. These become the spec's Open questions and,
if they block, entries in specs/OPEN-QUESTIONS.md.

## Out of scope
What this deliberately does not do.

## Suggested `implements:` globs
Best guess at the code paths a spec for this would govern.
```

Write only what the conversation established. **Do not invent acceptance criteria, endpoints, table columns, field ids or LaTeX macros** — that is `/spec-new`'s job, working from this plus the contracts.

## 4. Hand off

Tell the user, in two lines:
- where the file is;
- the exact next command: `/spec-new feature <slug>`, based on `docs/ideas/<slug>.md`;
- and, if anything blocks it, that `/decide` comes first.

Do not run `/spec-new` yourself unless asked. The brief is meant to be read and edited before it becomes a spec.

## If the discussion happened in a voice conversation elsewhere

Voice mode works in regular Claude chat, which has **no access to this repository** — so that conversation could not check anything against the specs. If the user pastes such a transcript:

- Treat it as raw input, not as agreed decisions.
- Run step 1 now, late: check what was discussed against the accepted ADRs and every "Ruled out" list, and report every collision before writing anything.
- Say plainly which parts of the transcript survive that check and which do not.

## Notes

- Briefs are committed. They are history, not truth — the spec supersedes the brief the moment it exists.
- They appear in the spec dashboard's Files view as guides. That is intended: they explain *why* a spec looks the way it does.
- No spec changes and no `make` targets are needed to run this skill.
