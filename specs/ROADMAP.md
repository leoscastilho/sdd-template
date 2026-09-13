# Roadmap

Milestones are ordered so each one is demoable on its own and so the shell absorbs later modules without reshaping (ARCH-SYSTEM-OVERVIEW §4). Exactly one milestone is marked `(current)`. Tick items as their spec reaches `implemented`. Building is delegated: the session orchestrates, the `coder` agent writes code and tests, cheaper tiers sweep, render and summarise (ADR-0014). Every milestone closes with `/security-audit full` showing no critical/high finding (ADR-0015).

## M0 — Foundation
Pre-decided: ADR-0001 … ADR-0016. **No open question blocks M0** (OPEN-QUESTIONS Q1–Q6 are all "blocks nothing"). Then:
- [x] Monorepo tooling: pnpm workspaces, Node 20 via corepack, TypeScript strict, Biome, Vitest workspace, root `Makefile`, `.editorconfig`, `.gitignore` (`.env`, `node_modules`, `dist`, `reports/security/*.html`) — ADR-0001, ARCH-TESTING
- [x] Specs: this corpus lint-clean (`make spec-lint`), `INDEX.md` generated, hooks for drift and Stop — README, ADR-0014
- [x] `packages/shared`: registry for the six types, `FIELD_GROUPS`, zod schemas, `validateDocument` (V1–V22), tokeniser + `escapeLatex` + `renderTex` (M1–M7), `SAMPLE_DOCUMENTS`, `MARKUP_HELP`, goldens, generated `samples/*.tex` — C-DOCUMENT-TYPES, ADR-0006, ADR-0016
- [x] `services/latex`: Go service (`/v1/compile`, `/healthz`), log parser with fixtures, semaphore, timeout, Dockerfile with pinned Tectonic + warmed cache + `test` stage, six samples, sandbox flags — F-LATEX-RENDER-SERVICE, C-LATEX-RENDER-API, ADR-0005, ADR-0012
- [x] `apps/api`: Nest skeleton (config zod, pino, error filter, health), `latex` client, `documents` controller (`types`, `validate`, `compile`), WS gateway with `CompileQueue` latest-wins, Prisma schema + `0001_init`, drafts CRUD with AES-256-GCM, contract test against `openapi.yaml` — ARCH-API-CONVENTIONS, C-OPENAPI, C-WS-MESSAGES, F-DOCUMENT-EDITOR (server half), F-DOCUMENT-DRAFTS (server half), ADR-0003, ADR-0004, ADR-0007, ADR-0008
- [x] `apps/web`: shell (rail, registry, router, placeholders, health dot, tokens/base CSS), documents module (type tabs, form boxes, section/professionals/references editors, markup help, `useCompileSocket`, `PdfPreview`, `StatusStrip`, pinning, download, load example), drafts client (autosave, restore, panel), unit tests — F-PLATFORM-SHELL, F-DOCUMENT-EDITOR, F-DOCUMENT-DRAFTS, ARCH-FRONTEND-SHELL, ADR-0002, ADR-0013
- [x] Impeccable finish review of the editor surface, `DESIGN.md` — DESIGN.md written, finish review: ship, 2026-09-12 — ADR-0013
- [x] Compose + Easypanel: root `docker-compose.yml`, committed dev overlay (`docker-compose.dev.yml`), Dockerfiles (web/nginx, api, latex), `migrate` job, `.env.example`, `infra/scripts`, `infra/easypanel.md`, first deploy on the VPS with backups + key runbook — ARCH-INFRA, ADR-0011, ADR-0018
- [x] CI: lint, typecheck, Vitest with Postgres and Tectonic (golden compile), `go test` with Tectonic, spec-lint/audit, quick-scan, compose image build — ARCH-TESTING (`pnpm audit` gate deferred to M1)
- [x] Security: `scripts/security/quick-scan.sh` with the five categories, hooks, first `/security-audit full` report with no critical/high — completed 2026-09-12 (0 critical, 1 high, 3 medium, 3 low, 2 informational; the high finding closed same-session by ADR-0017) — ARCH-SECURITY, ADR-0015, ADR-0017
- [x] Editor visual revamp: 50/50 split with divider, PDF zoom, formatting toolbar replacing the markup help popover, visible field tokens — implemented 2026-09-12 (150 web tests, security gate clean) — F-EDITOR-VISUAL-REVAMP, ADR-0019, ADR-0020, ADR-0021, ADR-0022

## M1 — Auth & users (current)
- [ ] Dependency hygiene: make `pnpm audit --audit-level=high` a CI gate (resolve or accept the 2026-09-12 transitive advisories) — ARCH-TESTING §5
- [ ] Rework `scripts/e2e/smoke.mjs` and `scripts/e2e/ui.mjs` to sign in with a session cookie (seed/invite a test user, `POST /api/auth/login`, carry cookie + CSRF) — they still use the retired Basic-auth gate and 401 on guarded routes; stale since M1 auth, surfaced by the gate retirement (2026-09-13) — ARCH-TESTING §4/§4b
Q2 decided (ADR-0023: own email+password with argon2id, Google OIDC, fixed 24 h Postgres cookie sessions). Q6 (ADR-0024) and Q3 (ADR-0025) decided; Q7 (ADR-0026), Q10 (ADR-0027) and Q11 (ADR-0028) decided. F-AUTH, ARCH-AUTH and the F-DOCUMENT-DRAFTS M1 amendment implemented 2026-09-12 (193 API / 206 web / 264 shared tests, security gate clean; `reports/security/2026-09-12-diff-auth.md`). Q8 decided (ADR-0030: nginx `real_ip` over `TRUSTED_PROXY_CIDRS`); ARCH-AUTH §12 (retiring the Basic Auth gate) is unblocked once it is implemented and verified in production. M1 closes with `/security-audit full`.
- [x] `users` + `sessions` + `password_resets`, sign-in/out, password reset, Google OIDC (PKCE, state, nonce, JWKS), `Verifier` interface, 24 h fixed sessions — ARCH-AUTH (approved), F-AUTH (ADR-0023, ADR-0027)
- [x] Invitations: `invites` table, `POST/GET/DELETE /api/invites`, `/aceitar-convite` (password or Google), links shown to the inviter and emailed when SMTP is set — ARCH-AUTH §14, F-AUTH (ADR-0028, ADR-0027)
- [x] `drafts.owner_id` (additive migration + backfill), every draft handler owner-scoped, list scoped — F-DOCUMENT-DRAFTS update, ADR-0009 superseded
- [x] `securitySchemes` in `openapi.yaml`, CSRF posture for cookies — C-OPENAPI, ARCH-SECURITY
- [x] Shell: user menu, sign-out — F-PLATFORM-SHELL update
- [x] Draft expiry: `drafts.expires_at`, panel `expira em` + "manter", `POST …/keep`, discrete nightly `purge` compose job — F-DOCUMENT-DRAFTS, ARCH-INFRA, C-OPENAPI updates (ADR-0025)
- [x] Real client IP behind Traefik: `TRUSTED_PROXY_CIDRS` rendered into nginx `real_ip` by `35-real-ip.sh`, `scripts/e2e/nginx-real-ip.sh` integration check (`make e2e-nginx`), runbook + post-deploy check — implemented 2026-09-12 — ARCH-INFRA, ARCH-TESTING §4c (ADR-0030)
- [x] Gate hardening and the Cloudflare hop (ADR-0031, Q13): loopback allow removed from `auth.inc`, ungated `/healthz` healthcheck, `/0` refused, Cloudflare ranges in `TRUSTED_PROXY_CIDRS`, forged-header production check — implemented 2026-09-12 (25 e2e assertions, re-audit clean) — ARCH-INFRA, ARCH-TESTING §4c
- [x] Set `TRUSTED_PROXY_CIDRS` on Easypanel (`easypanel` subnet `10.11.0.0/16` + Cloudflare's 22 ranges) — verified in production 2026-09-13: nginx `$remote_addr` and the API's `login_failed.ip` resolve the real visitor (187.15.85.100 laptop, 138.94.55.193 phone), a forged `X-Forwarded-For: 203.0.113.1` is discarded (chain `203.0.113.1,<visitor>,<cf edge>` → visitor); domain confirmed Cloudflare-proxied — ARCH-INFRA, ARCH-AUTH (ADR-0030, ADR-0031)
- [x] Retired the Basic Auth gate (2026-09-13): removed `auth.inc`/`40-basic-auth.sh`, every `nginx.conf` include, the `BASIC_AUTH_*` keys (compose, dev overlay, `.env.example`, CI) and the ARCH-INFRA rows; ADR-0017 and ADR-0009 `superseded` by ADR-0023. Access control is now the API's global `SessionGuard` + owner-scoped drafts; nginx edge carries no credential (ARCH-AUTH §12) — ARCH-INFRA, ARCH-AUTH, ARCH-SECURITY
- [x] Live-preview compile perf (F-LATEX-COMPILE-PERF): compile on field blur (not per-keystroke) and skip an identical rendered tex — implemented 2026-09-13 (218 web tests, all 10 criteria; security gate clean) — ADR-0032, F-DOCUMENT-EDITOR/C-WS-MESSAGES/ARCH-FRONTEND-SHELL reconciled
- [ ] Letterheads and autoria from the profile (M1.5): several letterheads per user with an encrypted logo and `show_logo`, autoria set, Timbre box pre-filled and overridable per document, `assets` on `/v1/compile` — new F-LETTERHEAD-PROFILE from `docs/ideas/letterhead-profile.md`, C-LATEX-RENDER-API, F-LATEX-RENDER-SERVICE, C-DOCUMENT-TYPES updates (ADR-0029)
- [ ] Profile: `users.tratamento` (psicóloga/psicólogo/neutro) — stored, editable on `/perfil` and sent in the payload since F-AUTH (2026-09-12); still to do: rendered in UI labels and via `\tratamento` in `cfpdoc.cls`; profile page with password change — F-DOCUMENT-EDITOR, C-DOCUMENT-TYPES, F-LATEX-RENDER-SERVICE updates (ADR-0026)

## M2 — Pacientes
- [ ] `patients` module (Nest + web): record, contacts, LGPD consent fields, encrypted notes — new F-PATIENTS, ARCH-DATA-MODEL update
- [ ] Editor pre-fill of the Identificação box from a patient; `drafts.patient_id` — F-DOCUMENT-EDITOR update
- [ ] Documents list per patient (drafts by patient) — F-DOCUMENT-DRAFTS update

## M3 — Sessões
- [ ] `clinical_sessions` module: session log per patient, encrypted notes, duration, attendance — new F-SESSIONS
- [ ] Declaração helper: attendance facts from sessions inserted into `corpo` — F-DOCUMENT-EDITOR update

## M4 — Agenda
- [ ] `appointments` module: week/day views, availability, link to patients/sessions — new F-AGENDA
- [ ] Reminders (email) if wanted — new ARCH-NOTIFICATIONS

## M5 — Signatures & finalised documents
- [ ] "Finalizar" into an immutable `documents` record; e-signature path per Q5 — new F-DOCUMENT-FINALISE
- [ ] Optional `X-Pages`/`pages` per Q4
