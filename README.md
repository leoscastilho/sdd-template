# SDD Kickstart

An opinionated starting point for spec-driven development. Clone it, replace
the product brief, describe your architecture, and let the SDD workflow guide
implementation.

This repository contains reusable specifications, templates, checks, agent
roles, and skills. It deliberately does not choose a framework, database,
cloud provider, UI language, deployment model, or domain.

## Start a project

1. Replace [PRODUCT.md](PRODUCT.md) with a short product brief.
2. Read [docs/getting-started.md](docs/getting-started.md) and
   [specs/README.md](specs/README.md).
3. Run `make setup` to install the local git hook.
4. Use `/idea` for exploration, `/spec-new` for a first spec, and
   `/decide` whenever a choice needs to become durable.
5. Run `make spec-lint`, `make spec-drift`, and `make spec-audit` as the
   corpus grows. Use `/implement <spec-id>` only after approval.

The `apps/`, `packages/`, `services/`, and `infra/` directories are
intentionally empty in the kickstart. Add code only after a spec claims its
path.

## Included

- five-layer spec layout and templates;
- neutral onboarding, glossary, roadmap, and open-question documents;
- portable Codex and Claude roles and workflow skills;
- checks for frontmatter, traceability drift, spec audits, and heuristic
  security scanning;
- a local HTML dashboard for browsing the corpus.

The starter keeps the workflow strict while leaving product and technology
decisions to each project.

## Create your own repository

The template repository is [`git@github.com:leoscastilho/sdd-template.git`](git@github.com:leoscastilho/sdd-template.git).
Clone it, move into the new folder, remove the template's remote, and create
your own first commit:

```sh
git clone git@github.com:leoscastilho/sdd-template.git my-project
cd my-project
git remote remove origin
git init
git add .
git commit -m "Initialize project from SDD Kickstart"
```

While logged in to GitHub, create an empty repository at
[https://github.com/new](https://github.com/new). Do not initialize it with a
README, license, or `.gitignore`; this template already has its own files.
Then connect and push it:

```sh
git remote add origin <your-new-repository-url>
git branch -M main
git push -u origin main
```

If you downloaded the folder instead of cloning it, start at `cd my-project`
and run the same `git init` sequence. Do not keep the template's remote: it
would make later pushes target the starter repository.

## Initial prompt

Paste this into your coding agent after filling in the project name:

> You are helping me start a new project from this SDD Kickstart repository.
> Read `PRODUCT.md`, `specs/README.md`, `specs/OPEN-QUESTIONS.md`, and
> `specs/ROADMAP.md`. Ask only the questions needed to complete the product
> brief and choose the initial architecture. Then propose the first milestone,
> identify the first architecture, feature, and contract specs we need, and
> write them using the templates. Do not write application code yet. Keep
> unresolved choices in `specs/OPEN-QUESTIONS.md`, record durable choices as
> ADRs, run the spec checks, and show me the resulting plan for approval.
