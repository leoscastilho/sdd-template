# Getting started

New here? Read this once. It explains how work actually happens in this repository, which is probably not how you expect.

## The one idea

**No human writes code here.** Every file under `apps/`, `packages/`, `services/` and `infra/` is derived by an agent from the documents in [`specs/`](../specs/README.md). You change the spec; the code follows.

If the code and a spec disagree, **the spec is right and the code is a bug** — unless the spec is stale, in which case fixing the spec is the *first* step, not the last.

Unfamiliar with the vocabulary? [The SDD glossary](spec-driven-glossary.md) explains every term in plain language.

## I want to…

| I want to | Do this |
| --- | --- |
| Talk an idea through first | `/idea <name>` — discusses it against the existing decisions, writes a brief to `docs/ideas/` |
| Add a feature | `/spec-new feature <name>` → resolve blockers → `approved` → `/implement` |
| Choose between options, or rule something out | `/decide` — writes an ADR and propagates it |
| Fix a bug | Add the acceptance criterion the bug violated, then implement it |
| Change the API, a WebSocket message or the render service API | Edit the contract in `specs/03-contracts/` first, then `/implement` the spec that uses it |
| Reconcile specs after code changed outside the flow | `/spec-sync` |
| Know whether specs and code still agree | `make spec-drift`, `/spec-audit` |
| Check security | `/security-audit` |
| Design or polish a screen | Impeccable (`/impeccable`), then `/implement` hands the surface brief to `ui-coder` |
| See the whole corpus visually | `make spec-dashboard` (this page) |

## Adding a feature, step by step

### 1. `/spec-new feature <short name>`

Drafts `specs/02-features/<name>.md` from the template with a unique `F-` id and valid frontmatter. It lands as `status: draft`.

Four parts carry the weight:

- **`implements:`** — glob patterns for the code paths this spec governs, e.g. `apps/api/src/documents/**`. This is the traceability seam. The drift hook uses it to know *which* spec to revisit when a file changes, and `make spec-audit` reports code that no spec claims. Get it wrong and the guardrails go blind.
- **Acceptance criteria** in Given/When/Then form, each independently testable. **These become the test names.** A feature is only `implemented` when every criterion has a passing test.
- **Ruled out**, with reasons. A hard constraint, not a note — it is what stops a future session cheerfully re-adding the idea you already rejected.
- **Open questions** — anything unresolved, mirrored into [`OPEN-QUESTIONS.md`](../specs/OPEN-QUESTIONS.md).

For anything user-facing, also cover the empty state, the loading/compiling state, the error state, and what data it stores, encrypts and logs.

### 2. Resolve what blocks it — `/decide`

A `draft` spec with open questions is not implementable. `/decide Qn` presents the options, writes an ADR once you choose, propagates it into every affected spec, and closes the question.

**An agent never picks for you.** It recommends; you decide.

### 3. Flip to `approved`

Once nothing unresolved blocks it. This is the gate — running `/implement` on a `draft` spec is the wrong move.

### 4. `/implement F-YOURFEATURE`

The only sanctioned way to build. It reads the spec, its ADRs and the contracts; plans; delegates the code to the `coder` agent (and the visual layer to `ui-coder` with the Impeccable surface brief); tests against *your* acceptance criteria; runs a spec review and a security audit on the diff; then updates the spec's status and `implements`. Critical or high security findings block `implemented`.

## Starting from notes, or from a chat with another AI

Discussing an idea in a long back-and-forth first is a good way to work.

**The easy path is `/idea <name>`.** It loads the relevant "Ruled out" lists and open questions *before* the discussion, tells you straight away when an idea collides with an accepted decision, and writes the result to `docs/ideas/<name>.md` in the shape `/spec-new` expects. It works from a phone too — run `/remote-control` on the machine and drive the same session from the Claude app's Code tab, dictating with your keyboard's mic. (Claude's own voice mode does not run in Claude Code sessions.)

If the discussion happened somewhere else instead:

- **Put the raw notes in `docs/ideas/`, not `specs/`.** Every `.md` under `specs/` is linted for spec frontmatter, so a free-form file there breaks `make spec-lint` and blocks commits. It also invites a future session to treat a rough transcript as truth.
- **Then run `/spec-new` and point it at the file.** It is a *conversion*, not a copy: your notes are a conversation, a spec is a contract with the build system.
- **Make sure the discussion captured the rejected options and why.** That is the most valuable output of a long discussion and the first thing lost in summarising. It becomes **Ruled out**.
- **Expect collisions.** An outside chat does not know this repo's constraints and will confidently propose something an ADR already ruled out. That is fine on the way in — the conversion checks the idea against the accepted ADRs and every "Ruled out" list and tells you where it collides. If you think a past rejection was wrong, that is a new ADR proposing to supersede it, never a quiet reintroduction.

Handing the other chat [`specs/README.md`](../specs/README.md) and [the glossary](spec-driven-glossary.md) up front reduces the collisions a lot.

## Statuses, and what they mean

| Status | Meaning |
| --- | --- |
| `draft` | Being written. Has open questions. **Not implementable.** |
| `approved` | Complete enough to build. Nothing unresolved blocks it. |
| `implementing` | An agent is actively building it. |
| `implemented` | Every acceptance criterion has a passing test. Spec and code agree. |
| `deprecated` | Superseded; kept for history. |

ADRs use `proposed` → `accepted` → `superseded` / `rejected`. **An accepted ADR is immutable.** You do not edit it; you write a new one that supersedes it.

## When documents disagree

1. An **accepted ADR** wins on any decision it covers.
2. A **contract** (`specs/03-contracts/`) wins on any interface shape.
3. A **feature spec** wins on behaviour.
4. An **architecture spec** wins on cross-cutting mechanics.
5. `PRODUCT.md` and `specs/01-architecture/system-overview.md` are the original product and architecture narratives, kept for rationale. Where a later spec contradicts them, the later spec wins.

## The guardrails will stop you

They are not decoration, and they fire automatically:

- **Before an edit** — denies writes to generated output, lockfiles and `INDEX.md`; asks before you touch an accepted ADR, `DESIGN.md`, or the guardrails themselves.
- **Before a shell command** — denies force-push; asks before volume drops, hard resets, `prisma migrate reset`, SQL drops.
- **After an edit** — lints spec frontmatter, runs a security scan on the file, and tells you which spec governs a code file the first time you touch it.
- **At the end of a turn** — blocks if code changed and its governing spec did not. This is the rule most people meet first: **if you learn something while implementing, fix the spec in the same session.**
- **On commit** — spec lint, drift, and a security scan of the staged content.

## Commands

```
make setup            # git hooks, .env, pnpm install
make up               # docker compose up (web, api, latex, db, migrate)
make test             # vitest + go test
make spec-dashboard   # this page
make spec-lint        # frontmatter valid, ids unique, references resolve
make spec-index       # regenerate specs/INDEX.md
make spec-drift       # code changed but its governing spec did not
make spec-audit       # unclaimed code, dangling implements globs
make security-scan    # deterministic security quick-scan
make security-report  # open the newest security audit report
```

Slash commands: `/idea`, `/spec-new`, `/decide`, `/implement`, `/spec-sync`, `/spec-audit`, `/security-audit`.

## Where to look next

- [`specs/README.md`](../specs/README.md) — layout, precedence and lifecycle in full
- [`specs/ROADMAP.md`](../specs/ROADMAP.md) — milestones; exactly one is current
- [`specs/OPEN-QUESTIONS.md`](../specs/OPEN-QUESTIONS.md) — everything undecided, each with a recommendation
- [The SDD glossary](spec-driven-glossary.md) — every term, in plain language
