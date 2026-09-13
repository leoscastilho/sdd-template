---
id: F-EXAMPLE
title: Example feature
type: feature
status: draft
implements:
  - apps/api/src/example/**
depends_on: []
decisions: []
last_reviewed: 2026-09-12
---

# <Title>

One paragraph: what this feature lets which persona do, and why it matters.

**Derived from:** system-overview §N (cite), other specs.

## User stories

- As an <persona>, I want <capability> so that <outcome>.

## Behaviour

Plain-language description of the flows. Screens/states for client features; endpoints and jobs for server features. Reference endpoints by contract path.

## Permissions

| Action | Role | Scope |
| --- | --- | --- |

## Empty / loading / error states

What the empty state says. What is shown while loading or compiling. What happens on a failed write or a failed compile.

## Acceptance criteria

- Given …, when …, then …. (each one independently testable; becomes a test name)

## Data

Tables/columns touched (link to the data-model spec). Endpoints and WebSocket messages used (link to the contracts).

## Out of scope

## Ruled out

- <option> — <reason>.

## Open questions

- (mirror each into specs/OPEN-QUESTIONS.md)
